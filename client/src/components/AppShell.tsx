import { ReactNode } from "react";
import { BookOpen, ExternalLink, MessageCircle, ShoppingBag, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

const officialSite = "https://baderabalkhail.com";

type Props = { children: ReactNode; active?: "home" | "assistant" | "store" | "knowledge"; title?: string };

export default function AppShell({ children, active = "home", title = "مساعد بدر" }: Props) {
  const [open, setOpen] = useState(false);
  const link = (key: Props["active"], href: string, label: string, icon: ReactNode) => (
    <a className={`rail-link ${active === key ? "active" : ""}`} href={href} onClick={() => setOpen(false)}>{icon}<span>{label}</span>{active === key && <i />}</a>
  );
  return (
    <div className="min-h-screen bg-ink text-sand" dir="rtl">
      <div className="grain" aria-hidden="true" />
      <aside className={`side-rail ${open ? "is-open" : ""}`}>
        <div className="rail-top"><a className="brand-lockup" href="#/"><span className="brand-seal"><span>ب</span></span><span><strong>مساعد بدر</strong><small>عزنا بطيبنا</small></span></a><button className="icon-button mobile-close" onClick={() => setOpen(false)} aria-label="إغلاق القائمة"><X size={18} /></button></div>
        <div className="rail-rule" />
        <nav className="rail-nav" aria-label="التنقل الرئيسي">
          {link("home", "#/", "الرئيسية", <span className="nav-letter">ب</span>)}
          {link("assistant", "#/assistant", "المساعد", <MessageCircle size={17} />)}
          {link("store", "#/store", "اكتشف المتجر", <ShoppingBag size={17} />)}
          {link("knowledge", "#/knowledge", "المعرفة الموثقة", <BookOpen size={17} />)}
        </nav>
        <div className="rail-spacer" />
        <div className="rail-note"><ShieldCheck size={18} /><div><strong>المعلومة أولًا</strong><p>لا نعرض تفاصيل منتج إلا من مصدر معتمد.</p></div></div>
        <a className="rail-store" href={officialSite} target="_blank" rel="noreferrer"><span>زيارة متجر بدر</span><ExternalLink size={15} /></a>
        <div className="rail-footer"><span>الرياض، السعودية</span><span>01 / 2026</span></div>
      </aside>
      <main className="main-stage">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setOpen(true)} aria-label="فتح القائمة"><span className="menu-lines">☰</span></button><div className="breadcrumb"><span>بدر أبا الخيل</span><b>‹</b><strong>{title}</strong></div><div className="topbar-actions"><span className="live-dot"><i /> متصل بالمصدر الرسمي</span><a href={officialSite} target="_blank" rel="noreferrer" className="text-link">المتجر الرسمي <ExternalLink size={14} /></a></div></header>
        {children}
      </main>
    </div>
  );
}
