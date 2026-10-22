import { useMemo, useState } from "react";
import { ArrowUpLeft, Check, Clock3, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import { askN8nAssistant } from "@/lib/n8nAssistant";

type Message = { role: "user" | "assistant"; content: string };
const prompts = ["أبي هدية فخمة بميزانية محددة", "وش عندكم من خشب العود؟", "أحتاج أعرف التصنيفات الرسمية"];

export default function Assistant() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "يا هلا بك. أنا مساعد بدر، وأقدر أرتب معك احتياجك وأوصلك للمعلومة الرسمية بدون تخمين. وش تدور عليه اليوم؟" }]);
  const [sessionKey] = useState(() => Math.random().toString(36).slice(2));
  const [notice, setNotice] = useState("");
  const [isPending, setIsPending] = useState(false);
  const history = useMemo(() => messages.slice(-10), [messages]);

  const send = async (value = message) => {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    setMessage("");
    setMessages(current => [...current, { role: "user", content: trimmed }]);
    setIsPending(true);
    try {
      const result = await askN8nAssistant({ message: trimmed, sessionKey, history });
      setMessages(current => [...current, { role: "assistant", content: result.reply }]);
    } catch (error) {
      const code = error instanceof Error ? error.message : "assistant_failed";
      const content = code === "assistant_timeout"
        ? "تأخر الرد قليلًا. جرّب إرسال السؤال مرة أخرى."
        : code.includes("429")
          ? "المساعد مشغول حاليًا بسبب كثرة الطلبات. جرّب بعد قليل."
          : "تعذر الوصول إلى مساعد بدر حاليًا بسبب مشكلة مؤقتة. جرّب بعد قليل أو افتح الموقع الرسمي.";
      setMessages(current => [...current, { role: "assistant", content }]);
    } finally {
      setIsPending(false);
    }
  };

  const requestHuman = () => setNotice("سيتطلب التحويل لموظف إعداد قناة خدمة عملاء رسمية.");

  return <AppShell active="assistant" title="المساعد">
    <section className="assistant-page">
      <div className="assistant-page-intro"><div><span className="section-kicker">مساعد بدر — محادثة خاصة</span><h1>خذ راحتك،<br /><em>واسأل براحتك.</em></h1><p>مساحة محادثة كاملة تساعدك تفهم احتياجك وتصل إلى المصدر الرسمي بدون تشتيت.</p></div><div className="assistant-page-badge"><Sparkles size={18} /><span>محادثة<br />خاصة</span></div></div>
      <div className="assistant-shell assistant-full"><div className="assistant-topline"><div className="assistant-id"><span className="assistant-avatar"><Sparkles size={16} /></span><div><strong>مساعد بدر</strong><small><i /> خادم تنفيذ مستقل</small></div></div><div className="assistant-context"><Clock3 size={15} /> ينتظر رد الذكاء الاصطناعي</div></div><div className="chat-window">{messages.map((item, index) => <div className={`chat-row ${item.role}`} key={`${item.role}-${index}`}><div className="chat-bubble">{item.content}</div><span className="chat-time">{item.role === "assistant" ? "مساعد بدر" : "أنت"}</span></div>)}{isPending && <div className="chat-row assistant"><div className="chat-bubble typing"><i /><i /><i /></div></div>}</div><div className="prompt-list">{prompts.map(prompt => <button key={prompt} onClick={() => void send(prompt)} disabled={isPending}>{prompt}<ArrowUpLeft size={14} /></button>)}</div><form className="chat-input" onSubmit={event => { event.preventDefault(); void send(); }}><input value={message} onChange={event => setMessage(event.target.value)} placeholder="اكتب سؤالك هنا..." aria-label="رسالتك إلى مساعد بدر" /><button type="submit" disabled={isPending || !message.trim()} aria-label="إرسال الرسالة"><Send size={18} /></button></form><div className="assistant-footnote"><span><ShieldCheck size={14} /> الرد يأتي من خادم بدر وقاعدة المعرفة الموثقة</span><button onClick={requestHuman}><MessageCircle size={14} /> أحتاج موظفًا</button></div>{notice && <div className="human-notice"><Check size={15} /> {notice}</div>}</div>
    </section>
  </AppShell>;
}
