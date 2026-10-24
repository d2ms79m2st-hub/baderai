import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCw, ShieldCheck, Tag } from "lucide-react";
import AppShell from "@/components/AppShell";
import ProductCard from "@/components/ProductCard";
import { getLocalCatalogSnapshot, loadCatalog, type CatalogSnapshot } from "@/lib/catalogRepository";

export default function SupabaseCatalogPreview() {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await loadCatalog("supabase"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر الاتصال بكتالوج Supabase.");
      setSnapshot({ ...getLocalCatalogSnapshot(), source: "local-fallback" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const categories = useMemo(
    () => [...new Set((snapshot?.products ?? []).flatMap(product => product.categories.map(category => category.name)))].sort((a, b) => a.localeCompare(b, "ar")),
    [snapshot],
  );

  return <AppShell active="store" title="اختبار كتالوج Supabase"><section className="page-content store-page store-catalog-page">
    <div className="page-hero"><div><span className="section-kicker">صفحة اختبار القراءة</span><h1>كتالوج Supabase،<br /><em>دون تغيير المصدر الحالي.</em></h1><p>هذه الصفحة تجريبية فقط. الموقع الأساسي ما زال يقرأ الكتالوج المحلي، وهذه الصفحة تختبر القراءة العامة عبر عميل Supabase publishable وRLS.</p></div><div className="page-hero-mark"><Tag size={24} /><span>{snapshot?.products.length ?? "—"}<br />منتج مرئي</span></div></div>

    {loading && <div className="catalog-empty" role="status"><LoaderCircle className="animate-spin" size={25} /><h3>نقرأ الكتالوج من Supabase</h3><p>جارٍ تحميل المنتجات والأسعار والصور والتصنيفات...</p></div>}
    {!loading && error && <div className="catalog-empty" role="alert"><AlertTriangle size={25} /><h3>تعذر الاتصال بكتالوج Supabase</h3><p>{error}</p><p>نعرض الآن snapshot المحلي القديم كحل احتياطي واضح، وليس مخزونًا مباشرًا.</p><button className="secondary-cta light" onClick={() => void refresh()}><RefreshCw size={16} /> إعادة المحاولة</button></div>}
    {!loading && !error && snapshot?.products.length === 0 && <div className="catalog-empty" role="status"><ShieldCheck size={25} /><h3>اتصلنا بـSupabase دون منتجات مرئية</h3><p>قد تكون البيانات محجوبة بسياسات القراءة العامة أو أن اللقطة فارغة.</p></div>}
    {!loading && snapshot && snapshot.products.length > 0 && <>
      <div className="catalog-result-line"><span><strong>{snapshot.products.length}</strong> منتج مرئي</span><span>المصدر: Supabase public RLS · {new Date(snapshot.collectedAt).toLocaleDateString("ar-SA")}</span></div>
      <div className="catalog-result-line"><span>{categories.length} تصنيفًا مرئيًا</span><span>التوفر هنا حالة snapshot وليست مخزونًا مباشرًا</span></div>
      <div className="product-grid catalog-grid">{snapshot.products.map(product => <ProductCard key={`${product.id}-${product.url}`} product={product} />)}</div>
    </>}
  </section></AppShell>;
}
