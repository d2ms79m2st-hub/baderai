import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, Check, Copy, ExternalLink, MessageCircle, RotateCcw, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import ProductCard from "@/components/ProductCard";
import { verifiedProducts } from "@/data/products";
import { askN8nAssistant, type AssistantMessage } from "@/lib/n8nAssistant";

type Message = AssistantMessage & { id: string; retry?: string };

const prompts = [
  "اكتشف المنتجات الموثقة",
  "ساعدني أختار هدية",
  "وش الأنواع الظاهرة في المتجر؟",
];

const welcome: Message = {
  id: "welcome",
  role: "assistant",
  content: "يا هلا بك. أنا مساعد بدر أبا الخيل. أقدر أرتب معك احتياجك، أعرّفك بالمعلومات الموثقة، وأوصلك للمتجر الرسمي بدون تخمين. وش تدور عليه اليوم؟",
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderRichText(text: string) {
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  return text.split(urlPattern).map((part, index) => {
    if (!/^https?:\/\//i.test(part)) return <span key={`${part}-${index}`}>{part}</span>;
    const clean = part.replace(/[،؛.,)\]]+$/, "");
    const suffix = part.slice(clean.length);
    return <span key={`${part}-${index}`}><a className="reply-link" href={clean} target="_blank" rel="noopener noreferrer">{clean}<ExternalLink size={12} /></a>{suffix}</span>;
  });
}

function productMentions(text: string) {
  return verifiedProducts.filter(product => text.includes(product.name));
}

export default function Assistant() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem("bader-assistant-messages");
      return saved ? JSON.parse(saved) as Message[] : [welcome];
    } catch {
      return [welcome];
    }
  });
  const [sessionKey] = useState(() => sessionStorage.getItem("bader-assistant-session") ?? (() => {
    const key = Math.random().toString(36).slice(2);
    sessionStorage.setItem("bader-assistant-session", key);
    return key;
  })());
  const [notice, setNotice] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const history = useMemo<AssistantMessage[]>(() => messages.slice(-10).map(({ role, content }) => ({ role, content })), [messages]);

  useEffect(() => {
    sessionStorage.setItem("bader-assistant-messages", JSON.stringify(messages));
  }, [messages]);

  const send = async (value = message) => {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    setMessage("");
    setNotice("");
    setLastQuestion(trimmed);
    setMessages(current => [...current, { id: makeId(), role: "user", content: trimmed }]);
    setIsPending(true);
    try {
      const result = await askN8nAssistant({ message: trimmed, sessionKey, history });
      setMessages(current => [...current, { id: makeId(), role: "assistant", content: result.reply }]);
    } catch (error) {
      const code = error instanceof Error ? error.message : "assistant_failed";
      const content = code === "assistant_timeout"
        ? "تأخر الرد قليلًا. تقدر تعيد المحاولة من هنا."
        : code.includes("429")
          ? "المساعد مشغول حاليًا بسبب كثرة الطلبات. جرّب بعد قليل."
          : "تعذر الوصول إلى مساعد بدر حاليًا بسبب مشكلة مؤقتة. تقدر تعيد المحاولة أو تفتح المتجر الرسمي.";
      setMessages(current => [...current, { id: makeId(), role: "assistant", content, retry: trimmed }]);
    } finally {
      setIsPending(false);
    }
  };

  const newConversation = () => {
    setMessages([welcome]);
    setMessage("");
    setNotice("بدأنا محادثة جديدة.");
    sessionStorage.setItem("bader-assistant-messages", JSON.stringify([welcome]));
  };

  const copyReply = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setNotice("تم نسخ الرد.");
    } catch {
      setNotice("لم يتم النسخ من هذا المتصفح.");
    }
  };

  return <AppShell active="assistant" title="المساعد">
    <section className="assistant-page assistant-redesign">
      <div className="assistant-intro-grid">
        <div>
          <span className="section-kicker"><span className="kicker-line" /> مساعد بدر أبا الخيل</span>
          <h1>المعلومة أولًا،<br /><em>والاختيار أهدأ.</em></h1>
          <p>اسأل عن العلامة والمنتجات الموثقة، أو ابدأ من احتياجك. إذا كانت المعلومة غير مؤكدة، سأقولها لك بوضوح.</p>
        </div>
        <div className="source-seal" aria-label="مصدر رسمي"><ShieldCheck size={19} /><strong>مصدر رسمي</strong><span>متصل بالمتجر</span></div>
      </div>

      <div className="assistant-layout">
        <aside className="assistant-aside" aria-label="معلومات المساعد">
          <div className="aside-label">01 / ماذا أستطيع؟</div>
          <div className="aside-card"><Sparkles size={17} /><p>معلومات عامة موثوقة، وتعريف بالمنتجات التي ظهرت في المصادر الرسمية فقط.</p></div>
          <div className="aside-rule" />
          <div className="aside-label">02 / أين نذهب؟</div>
          <a className="aside-link" href="https://baderabalkhail.com" target="_blank" rel="noopener noreferrer">المتجر الرسمي <ExternalLink size={14} /></a>
          <a className="aside-link" href="#/knowledge">منهج المعرفة <ArrowUpLeft size={14} /></a>
          <button className="new-chat-button" onClick={newConversation}><Trash2 size={14} /> محادثة جديدة</button>
        </aside>

        <div className="assistant-panel">
          <div className="assistant-panel-head">
            <div className="assistant-identity"><span className="assistant-avatar"><span>ب</span></span><div><strong>مساعد بدر</strong><small><i /> خادم مستقل عبر n8n</small></div></div>
            <span className="assistant-status"><i /> {isPending ? "يكتب الآن" : "متاح الآن"}</span>
          </div>

          <div className="chat-window chat-window-new" aria-live="polite">
            {messages.map(item => {
              const mentioned = item.role === "assistant" ? productMentions(item.content) : [];
              return <div className={`chat-row ${item.role}`} key={item.id}>
                <div className="chat-meta"><span>{item.role === "assistant" ? "مساعد بدر" : "أنت"}</span><span className="message-index">{String(messages.indexOf(item) + 1).padStart(2, "0")}</span></div>
                <div className="chat-bubble"><div className="reply-content">{renderRichText(item.content)}</div></div>
                {mentioned.length > 0 && <div className="reply-products">{mentioned.map(product => <ProductCard key={product.url} product={product} compact />)}</div>}
                {item.role === "assistant" && item.id !== "welcome" && <div className="message-actions"><button onClick={() => void copyReply(item.content)}><Copy size={12} /> نسخ الرد</button>{item.retry && <button onClick={() => void send(item.retry)}><RotateCcw size={12} /> إعادة المحاولة</button>}</div>}
              </div>;
            })}
            {isPending && <div className="chat-row assistant"><div className="chat-meta"><span>مساعد بدر</span><span className="message-index">…</span></div><div className="chat-bubble typing"><i /><i /><i /><span>أراجع المصدر</span></div></div>}
          </div>

          <div className="prompt-list prompt-list-new">{prompts.map(prompt => <button key={prompt} onClick={() => void send(prompt)} disabled={isPending}>{prompt}<ArrowUpLeft size={14} /></button>)}</div>
          <form className="chat-input chat-input-new" onSubmit={event => { event.preventDefault(); void send(); }}>
            <input value={message} onChange={event => setMessage(event.target.value)} placeholder="اكتب سؤالك هنا..." aria-label="رسالتك إلى مساعد بدر" autoComplete="off" />
            <button type="submit" disabled={isPending || !message.trim()} aria-label="إرسال الرسالة"><Send size={17} /><span>إرسال</span></button>
          </form>
          <div className="assistant-footnote assistant-footnote-new"><span><ShieldCheck size={14} /> معلومات المنتجات من المصدر الرسمي</span><span><MessageCircle size={14} /> لا توجد أداة تواصل خارجية مفعلة</span></div>
          {notice && <div className="human-notice"><Check size={15} /> {notice}</div>}
        </div>
      </div>
    </section>
  </AppShell>;
}
