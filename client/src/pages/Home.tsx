import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Menu,
  MessageCircle,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const officialLogo = "https://cdn.salla.sa/AzeRxp/WR3AdGBPe4QE7iYii6LpAV85oC0tmDwGjq7BsoFu.png";
const officialSite = "https://baderabalkhail.com";

const quickPrompts = [
  "أبي هدية فخمة بميزانية محددة",
  "وش عندكم من خشب العود؟",
  "أبي أعرف التصنيفات الرسمية",
];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "يا هلا بك. أنا مساعد بدر، وأقدر أرتب معك احتياجك وأوصلك للمعلومة الرسمية بدون تخمين. وش تدور عليه اليوم؟",
    },
  ]);
  const [sessionKey] = useState(() => Math.random().toString(36).slice(2));
  const [humanNotice, setHumanNotice] = useState("");
  const askAssistant = trpc.assistant.ask.useMutation();
  const requestHuman = trpc.assistant.requestHuman.useMutation();
  const { data: catalog } = trpc.catalog.verified.useQuery();
  const isBusy = askAssistant.isPending;

  const history = useMemo(() => messages.slice(-10), [messages]);

  const sendMessage = async (value = message) => {
    const trimmed = value.trim();
    if (!trimmed || isBusy) return;
    setMessage("");
    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    try {
      const result = await askAssistant.mutateAsync({ sessionKey, message: trimmed, history });
      setMessages(current => [...current, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages(current => [...current, { role: "assistant", content: "صار عندي تعذر مؤقت في الاتصال. جرّب مرة ثانية، أو انتقل مباشرة إلى متجر بدر الرسمي." }]);
    }
  };

  const handleHumanRequest = async () => {
    try {
      const result = await requestHuman.mutateAsync({ sessionKey, summary: messages.map(item => `${item.role}: ${item.content}`).join("\n") });
      setHumanNotice(result.message);
    } catch {
      setHumanNotice("تعذر تسجيل الطلب الآن. تقدر التواصل مع المتجر مباشرة من الرابط الرسمي.");
    }
  };

  return (
    <div className="min-h-screen bg-ink text-sand" dir="rtl">
      <div className="grain" aria-hidden="true" />
      <aside className={`side-rail ${mobileOpen ? "is-open" : ""}`}>
        <div className="rail-top">
          <a className="brand-lockup" href="#top" aria-label="العودة إلى بداية مساعد بدر" onClick={() => setMobileOpen(false)}>
            <span className="brand-seal"><span>ب</span></span>
            <span>
              <strong>مساعد بدر</strong>
              <small>عزنا بطيبنا</small>
            </span>
          </a>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة"><X size={18} /></button>
        </div>
        <div className="rail-rule" />
        <nav className="rail-nav" aria-label="التنقل الرئيسي">
          <a className="rail-link active" href="#assistant" onClick={() => setMobileOpen(false)}><MessageCircle size={17} /><span>المساعد</span><i /></a>
          <a className="rail-link" href="#discover" onClick={() => setMobileOpen(false)}><ShoppingBag size={17} /><span>اكتشف المتجر</span></a>
          <a className="rail-link" href="#knowledge" onClick={() => setMobileOpen(false)}><BookOpen size={17} /><span>المعرفة الموثقة</span></a>
        </nav>
        <div className="rail-spacer" />
        <div className="rail-note">
          <ShieldCheck size={18} />
          <div><strong>المعلومة أولًا</strong><p>لا نعرض تفاصيل منتج إلا من مصدر معتمد.</p></div>
        </div>
        <a className="rail-store" href={officialSite} target="_blank" rel="noreferrer"><span>زيارة متجر بدر</span><ArrowUpLeft size={17} /></a>
        <div className="rail-footer"><span>الرياض، المملكة العربية السعودية</span><span>01 / 2026</span></div>
      </aside>

      <main className="main-stage" id="top">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة"><Menu size={20} /></button>
          <div className="breadcrumb"><span>بدر أبا الخيل</span><ChevronLeft size={14} /><strong>مساعد بدر</strong></div>
          <div className="topbar-actions"><span className="live-dot"><i /> متصل بالمصدر الرسمي</span><a href={officialSite} target="_blank" rel="noreferrer" className="text-link">المتجر الرسمي <ExternalLink size={14} /></a></div>
        </header>

        <section className="hero-grid" id="assistant">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> تجربة معرفة وشراء <span className="eyebrow-dot">✦</span></div>
            <h1>خلّ اختيارك<br /><em>يبدأ من المناسبة.</em></h1>
            <p className="hero-lede">مساعدك الذكي لاكتشاف عالم بدر أبا الخيل للعود والعطور، بهدوء يليق بالمنتج ومعلومة ترجع لمصدرها.</p>
            <div className="hero-actions"><a className="primary-cta" href="#assistant-box">ابدأ محادثتك <ArrowUpLeft size={18} /></a><a className="secondary-cta" href="#discover">تصفح التصنيفات <ChevronLeft size={16} /></a></div>
            <div className="verified-line"><ShieldCheck size={15} /><span>الموقع الرسمي هو مصدرنا الحالي</span><a href={officialSite} target="_blank" rel="noreferrer">تحقق بنفسك</a></div>
          </div>
          <div className="hero-art" aria-label="هوية بدر أبا الخيل">
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-mark"><img src={officialLogo} alt="شعار بدر أبا الخيل" /><span>عزنا<br />بطيبنا</span></div>
            <div className="hero-caption"><span>EST.</span><strong>بدر أبا الخيل</strong><small>للعود والعطور والزعفران</small></div>
            <div className="hero-stamp"><Sparkles size={15} /><span>هوية<br />موثقة</span></div>
          </div>
        </section>

        <section className="assistant-section" id="assistant-box">
          <div className="section-heading"><div><span className="section-kicker">01 — اسأل مساعد بدر</span><h2>من السؤال إلى<br /><span>الاختيار الأقرب لك.</span></h2></div><p>حوار قصير، لغة طبيعية، ومعلومة واضحة. ابدأ من احتياجك وليس من اسم المنتج.</p></div>
          <div className="assistant-shell">
            <div className="assistant-topline"><div className="assistant-id"><span className="assistant-avatar"><Sparkles size={16} /></span><div><strong>مساعد بدر</strong><small><i /> جاهز للمساعدة</small></div></div><div className="assistant-context"><Clock3 size={15} /> يحفظ سياق هذه المحادثة فقط</div></div>
            <div className="chat-window" aria-live="polite">
              {messages.map((item, index) => <div className={`chat-row ${item.role}`} key={`${item.role}-${index}`}><div className="chat-bubble">{item.content}</div><span className="chat-time">{item.role === "assistant" ? "مساعد بدر" : "أنت"}</span></div>)}
              {isBusy && <div className="chat-row assistant"><div className="chat-bubble typing"><i /><i /><i /></div></div>}
            </div>
            <div className="prompt-list">{quickPrompts.map(prompt => <button key={prompt} onClick={() => sendMessage(prompt)} disabled={isBusy}>{prompt}<ArrowUpLeft size={14} /></button>)}</div>
            <form className="chat-input" onSubmit={event => { event.preventDefault(); void sendMessage(); }}><input value={message} onChange={event => setMessage(event.target.value)} placeholder="اكتب سؤالك هنا... مثال: أبي هدية لأبوي" aria-label="رسالتك إلى مساعد بدر" /><button type="submit" disabled={isBusy || !message.trim()} aria-label="إرسال الرسالة"><Send size={18} /></button></form>
            <div className="assistant-footnote"><span><ShieldCheck size={14} /> إجابات مبنية على المصادر المتاحة</span><button onClick={handleHumanRequest} disabled={requestHuman.isPending}><MessageCircle size={14} /> أحتاج موظفًا</button></div>
            {humanNotice && <div className="human-notice"><Check size={15} /> {humanNotice}</div>}
          </div>
        </section>

        <section className="discover-section" id="discover">
          <div className="section-heading compact"><div><span className="section-kicker">02 — اكتشف المتجر</span><h2>الأبواب التي<br /><span>نعرفها يقينًا.</span></h2></div><a className="arrow-link" href={officialSite} target="_blank" rel="noreferrer">كل المتجر الرسمي <ArrowUpLeft size={17} /></a></div>
          <div className="category-flow">
            <a className="category-feature" href={catalog?.categories[0]?.url ?? "https://baderabalkhail.com/-/c1168655920"} target="_blank" rel="noreferrer"><div className="category-number">01</div><div className="category-symbol">ع</div><div><h3>خشب العود</h3><p>تصفح التصنيف الرسمي للعود، وتحقق من الخيارات الحالية مباشرة من المتجر.</p></div><span className="category-arrow"><ArrowUpLeft size={18} /></span></a>
            <a className="category-feature warm" href={catalog?.categories[1]?.url ?? "https://baderabalkhail.com/-/c898253916"} target="_blank" rel="noreferrer"><div className="category-number">02</div><div className="category-symbol">عط</div><div><h3>العطور</h3><p>خيارات العطور كما تظهر في متجر بدر الرسمي، دون وصف غير موثق.</p></div><span className="category-arrow"><ArrowUpLeft size={18} /></span></a>
            <a className="category-feature dark" href={catalog?.categories[2]?.url ?? "https://baderabalkhail.com/offers"} target="_blank" rel="noreferrer"><div className="category-number">03</div><div className="category-symbol">% </div><div><h3>التخفيضات</h3><p>إذا كانت هناك عروض منشورة، ستجدها في صفحة التخفيضات الرسمية.</p></div><span className="category-arrow"><ArrowUpLeft size={18} /></span></a>
          </div>
        </section>

        <section className="knowledge-section" id="knowledge">
          <div className="knowledge-panel"><div className="knowledge-icon"><BookOpen size={20} /></div><div><span className="section-kicker">03 — كيف نعرف؟</span><h2>ثقة تبدأ من<br /><span>مصدر واضح.</span></h2><p>هذه النسخة مربوطة بالموقع الرسمي للعلامة، وتفصل بين ما تم التحقق منه وما يحتاج إلى تكامل كتالوج رسمي. لذلك لن ترى سعرًا أو منتجًا مختلقًا حتى تكتمل المزامنة.</p><a className="secondary-cta light" href={officialSite} target="_blank" rel="noreferrer">افتح المصدر الرسمي <ExternalLink size={15} /></a></div></div>
          <div className="knowledge-list"><div className="knowledge-item"><span>01</span><div><strong>مصدر أولي</strong><p>موقع بدر الرسمي هو المرجع الحالي للهوية والتصنيفات.</p></div><Check size={16} /></div><div className="knowledge-item"><span>02</span><div><strong>لا تخمين</strong><p>البيانات غير المؤكدة تظهر كبيانات غير متاحة، لا كحقائق.</p></div><Check size={16} /></div><div className="knowledge-item"><span>03</span><div><strong>تحديث قابل للتوسع</strong><p>يمكن إضافة مزامنة المنتجات وn8n بعد توفير الصلاحيات الرسمية.</p></div><Tag size={16} /></div></div>
        </section>

        <footer className="site-footer"><div className="footer-brand"><span className="brand-seal"><span>ب</span></span><div><strong>مساعد بدر</strong><small>عزنا بطيبنا</small></div></div><p>منصة معرفة ومحادثة قيد التطوير<br />لبدر أبا الخيل للعود والعطور.</p><div className="footer-links"><a href={officialSite} target="_blank" rel="noreferrer">الموقع الرسمي <ExternalLink size={14} /></a><span>البيانات غير المؤكدة لا تُعرض</span></div></footer>
      </main>
    </div>
  );
}
