import { FormEvent, useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

type Mode = "signin" | "signup" | "forgot" | "recovery";
const labels: Record<Mode, string> = { signin: "تسجيل الدخول", signup: "إنشاء حساب", forgot: "استعادة كلمة المرور", recovery: "تعيين كلمة مرور جديدة" };
function messageFor(error: unknown) { return error instanceof Error ? error.message : "تعذر إكمال العملية الآن. حاول مرة أخرى."; }

export default function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, resetPassword, updatePassword, isRecovery } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (isRecovery) { setMode("recovery"); setNotice(""); setError(""); } }, [isRecovery]);
  useEffect(() => { if (!open) { setNotice(""); setError(""); setPassword(""); setConfirmation(""); } }, [open]);
  if (!open && !isRecovery) return null;

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice(""); setError("");
    try {
      if ((mode === "signup" || mode === "signin") && password.length < 8) throw new Error("كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.");
      if (mode === "signup") {
        const { error: result } = await signUp(email, password, name);
        if (result) throw result;
        setNotice("تم إنشاء الحساب. إذا كان التحقق بالبريد مفعّلًا، افتح رسالة التحقق ثم ارجع للموقع.");
      } else if (mode === "signin") {
        const { error: result } = await signIn(email, password);
        if (result) throw result;
        onClose();
      } else if (mode === "forgot") {
        const { error: result } = await resetPassword(email);
        if (result) throw result;
        setNotice("إذا كان البريد مسجلًا، ستصلك رسالة آمنة لإعادة تعيين كلمة المرور.");
      } else {
        if (password !== confirmation) throw new Error("تأكيد كلمة المرور غير مطابق.");
        const { error: result } = await updatePassword(password);
        if (result) throw result;
        setNotice("تم تحديث كلمة المرور بنجاح.");
        setTimeout(onClose, 700);
      }
    } catch (caught) { setError(messageFor(caught)); } finally { setBusy(false); }
  }

  const switchMode = (next: Mode) => { setMode(next); setNotice(""); setError(""); setPassword(""); setConfirmation(""); };
  return <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isRecovery) onClose(); }}>
    <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      {!isRecovery && <button type="button" className="auth-close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>}
      <div className="auth-heading"><span className="auth-mark"><ShieldCheck size={20} /></span><div><span className="section-kicker">حساب بدر</span><h2 id="auth-title">{labels[mode]}</h2></div></div>
      <p className="auth-lede">جلسة آمنة ومستمرة لحفظ تجربتك دون مشاركة كلمة المرور مع الموقع.</p>
      <form onSubmit={submit} className="auth-form">
        {mode === "signup" && <label>الاسم<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>}
        {mode !== "recovery" && <label>البريد الإلكتروني<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required /></label>}
        {mode !== "forgot" && <label>كلمة المرور<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /></label>}
        {mode === "recovery" && <label>تأكيد كلمة المرور<input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} type="password" minLength={8} autoComplete="new-password" required /></label>}
        {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}
        <button className="primary-cta auth-submit" disabled={busy}>{busy ? "جارٍ المعالجة…" : labels[mode]}</button>
      </form>
      {!isRecovery && <div className="auth-links">
        {mode === "signin" && <><button type="button" onClick={() => switchMode("forgot")}>نسيت كلمة المرور؟</button><span>ليس لديك حساب؟ <button type="button" onClick={() => switchMode("signup")}>أنشئ حسابًا</button></span></>}
        {mode === "signup" && <span>لديك حساب؟ <button type="button" onClick={() => switchMode("signin")}>سجل دخولك</button></span>}
        {mode === "forgot" && <button type="button" onClick={() => switchMode("signin")}>العودة لتسجيل الدخول</button>}
      </div>}
      <small className="auth-security"><ShieldCheck size={13} /> تشفير وإدارة الجلسات عبر Supabase Auth</small>
    </section>
  </div>;
}
