import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { chatMessages, humanRequests } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { z } from "zod";

const officialSource = {
  brand: "بدر أبا الخيل للعود والعطور والزعفران",
  tagline: "عزنا بطيبنا",
  site: "https://baderabalkhail.com",
  logo: "https://cdn.salla.sa/AzeRxp/WR3AdGBPe4QE7iYii6LpAV85oC0tmDwGjq7BsoFu.png",
  categories: [
    { title: "خشب العود", url: "https://baderabalkhail.com/-/c1168655920" },
    { title: "العطور", url: "https://baderabalkhail.com/-/c898253916" },
    { title: "التخفيضات", url: "https://baderabalkhail.com/offers" },
  ],
};

const sourceContext = `أنت مساعد بدر، مساعد عربي متخصص لعلامة ${officialSource.brand}.\nالمعلومات المؤكدة المتاحة حاليًا من الموقع الرسمي فقط:\n- الاسم: ${officialSource.brand}\n- الشعار: ${officialSource.tagline}\n- الموقع: ${officialSource.site}\n- التصنيفات المؤكدة: خشب العود (${officialSource.categories[0].url})، العطور (${officialSource.categories[1].url})، التخفيضات (${officialSource.categories[2].url}).\n- الصفحات العامة لا تعرض حاليًا كتالوجًا تفصيليًا يمكن التحقق منه داخل هذه المنصة؛ لا تخترع أسماء منتجات أو أسعارًا أو مكونات أو ثباتًا أو فوحانًا أو توفرًا أو عروضًا.\nقواعد الإجابة: أجب بلهجة عربية سعودية مهذبة ومختصرة. اسأل سؤالًا توضيحيًا واحدًا إذا كان ذلك مفيدًا. صرّح بوضوح عندما لا توجد معلومة مؤكدة، ووجّه العميل إلى المتجر الرسمي. لا تدّعِ تنفيذ طلب أو تواصل بشري أو حجز أو إلغاء أو استرجاع لم يحدث فعليًا.`;

type ChatTurn = { role: "user" | "assistant"; content: string };

function fallbackReply(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("سعر") || normalized.includes("ريال") || normalized.includes("ميزاني")) {
    return "أقدر أساعدك نحدد النوع المناسب، لكن الأسعار والمنتجات المتاحة ما ظهرت لي بشكل موثوق داخل قاعدة المعرفة الحالية. تقدر تشوف الكتالوج والأسعار مباشرة من متجر بدر الرسمي، وإذا ترسل لي المناسبة والميزانية أرتب لك طريقة البحث.";
  }
  if (normalized.includes("عود")) {
    return "المؤكد عندي أن متجر بدر لديه تصنيف رسمي باسم «خشب العود». للاطلاع على المنتجات والأسعار الحالية استخدم صفحة التصنيف الرسمية، وإذا وصفت لي المناسبة والميزانية أساعدك بصياغة بحث أدق دون ما أخمّن معلومات غير منشورة.";
  }
  if (normalized.includes("عطر") || normalized.includes("هدية")) {
    return "المؤكد عندي وجود تصنيف رسمي باسم «العطور». ما عندي الآن أسماء أو أسعار منتجات مؤكدة داخل المنصة، لذلك الأفضل فتح التصنيف الرسمي. قل لي لمن الهدية وميزانيتك، وأساعدك تضيق الاختيار.";
  }
  return "أنا مساعد بدر. أقدر أساعدك في الوصول لتصنيفات متجر بدر الرسمية، أو أرتب معك احتياجك من حيث المناسبة والميزانية والنوع. حاليًا ما أعرض أي تفاصيل منتج إلا إذا كانت مؤكدة من المصدر الرسمي.";
}

async function saveChat(sessionKey: string, turns: ChatTurn[]) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(chatMessages).values(turns.map(turn => ({
      sessionKey,
      role: turn.role,
      content: turn.content,
      sourceStatus: "verified",
    })));
  } catch (error) {
    console.warn("[Assistant] Could not persist chat:", error);
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    verified: publicProcedure.query(() => ({
      ...officialSource,
      disclaimer: "بيانات المنتجات والأسعار تحتاج مزامنة رسمية قبل عرضها هنا.",
    })),
  }),
  assistant: router({
    ask: publicProcedure
      .input(z.object({
        message: z.string().trim().min(1).max(1200),
        sessionKey: z.string().trim().min(1).max(128),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).default([]),
      }))
      .mutation(async ({ input }) => {
        const userTurn: ChatTurn = { role: "user", content: input.message };
        let reply = fallbackReply(input.message);
        let sourceStatus = "fallback";

        if (ENV.forgeApiUrl && ENV.forgeApiKey) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 20_000);
          try {
            const response = await fetch(`${ENV.forgeApiUrl}/v1/chat/completions`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${ENV.forgeApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messages: [
                  { role: "system", content: sourceContext },
                  ...input.history,
                  userTurn,
                ],
              }),
              signal: controller.signal,
            });
            const body = await response.json().catch(() => ({}));
            const content = body?.choices?.[0]?.message?.content;
            if (response.ok && typeof content === "string" && content.trim()) {
              reply = content.trim();
              sourceStatus = "ai_verified_context";
            } else {
              console.warn("[Assistant] LLM returned no usable content", body?.error ?? response.status);
            }
          } catch (error) {
            console.warn("[Assistant] LLM request failed, using safe fallback:", error);
          } finally {
            clearTimeout(timeout);
          }
        }

        await saveChat(input.sessionKey, [...input.history, userTurn, { role: "assistant", content: reply }]);
        return { reply, sourceStatus, officialSite: officialSource.site };
      }),
    requestHuman: publicProcedure
      .input(z.object({ sessionKey: z.string().trim().min(1).max(128), summary: z.string().trim().min(4).max(2000) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (db) {
          try {
            await db.insert(humanRequests).values({ sessionKey: input.sessionKey, summary: input.summary, status: "pending" });
          } catch (error) {
            console.warn("[Assistant] Could not persist human request:", error);
          }
        }
        return {
          accepted: true,
          status: "pending",
          message: "تم تسجيل طلب المتابعة كطلب معلّق. لم يتم الادعاء بتواصل الموظف بعد.",
        } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
