import { useMemo, useState } from "react";
import { ArrowUpLeft, Check, Clock3, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";

type Message = { role: "user" | "assistant"; content: string };
const prompts = ["أبي هدية فخمة بميزانية محددة", "وش عندكم من خشب العود؟", "أحتاج أعرف التصنيفات الرسمية"];

export default function Assistant() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "يا هلا بك. أنا مساعد بدر، وأقدر أرتب معك احتياجك وأوصلك للمعلومة الرسمية بدون تخمين. وش تدور عليه اليوم؟" }]);
  const [sessionKey] = useState(() => Math.random().toString(36).slice(2));
  const [notice, setNotice] = useState("");
  const ask = trpc.assistant.ask.useMutation();
  const handoff = trpc.assistant.requestHuman.useMutation();
  const history = useMemo(() => messages.slice(-10), [messages]);

  const send = async (value = message) => {
    const trimmed = value.trim();
    if (!trimmed || ask.isPending) return;
    setMessage("");
    setMessages(current => [...current, { role: "user", content: trimmed }]);
    try {
      const result = await ask.mutateAsync({ message: trimmed, sessionKey, history });
      setMessages(current => [...current, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages(current => [...current, { role: "assistant", content: "تعذر الاتصال مؤقتًا. جرّب مرة ثانية أو انتقل إلى متجر بدر الرسمي." }]);
    }
  };

  const requestHuman = async () => {
    const result = await handoff.mutateAsync({ sessionKey, summary: messages.map(item => `${item.role}: ${item.content}`).join("\n") });
    setNotice(result.message);
  };

  return <AppShell active="assistant" title="المساعد">
    <section className="assistant-page">
      <div className="assistant-page-intro"><div><span className="section-kicker">مساعد بدر — محادثة خاصة</span><h1>خذ راحتك،<br /><em>واسأل براحتك.</em></h1><p>مساحة محادثة كاملة تساعدك تفهم احتياجك وتصل إلى المصدر الرسمي بدون تشتيت.</p></div><div className="assistant-page-badge"><Sparkles size={18} /><span>محادثة<br />خاصة</span></div></div>
      <div className="assistant-shell assistant-full"><div className="assistant-topline"><div className="assistant-id"><span className="assistant-avatar"><Sparkles size={16} /></span><div><strong>مساعد بدر</strong><small><i /> جاهز للمساعدة</small></div></div><div className="assistant-context"><Clock3 size={15} /> يحفظ سياق هذه المحادثة فقط</div></div><div className="chat-window">{messages.map((item, index) => <div className={`chat-row ${item.role}`} key={`${item.role}-${index}`}><div className="chat-bubble">{item.content}</div><span className="chat-time">{item.role === "assistant" ? "مساعد بدر" : "أنت"}</span></div>)}{ask.isPending && <div className="chat-row assistant"><div className="chat-bubble typing"><i /><i /><i /></div></div>}</div><div className="prompt-list">{prompts.map(prompt => <button key={prompt} onClick={() => void send(prompt)} disabled={ask.isPending}>{prompt}<ArrowUpLeft size={14} /></button>)}</div><form className="chat-input" onSubmit={event => { event.preventDefault(); void send(); }}><input value={message} onChange={event => setMessage(event.target.value)} placeholder="اكتب سؤالك هنا..." aria-label="رسالتك إلى مساعد بدر" /><button type="submit" disabled={ask.isPending || !message.trim()} aria-label="إرسال الرسالة"><Send size={18} /></button></form><div className="assistant-footnote"><span><ShieldCheck size={14} /> إجابات مبنية على المصادر المتاحة</span><button onClick={() => void requestHuman()} disabled={handoff.isPending}><MessageCircle size={14} /> أحتاج موظفًا</button></div>{notice && <div className="human-notice"><Check size={15} /> {notice}</div>}</div>
    </section>
  </AppShell>;
}
