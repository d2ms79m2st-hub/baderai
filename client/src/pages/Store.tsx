import { useMemo, useState } from "react";
import { ArrowUpLeft, ExternalLink, Filter, LoaderCircle, RefreshCw, Search, SlidersHorizontal, Tag } from "lucide-react";
import AppShell from "@/components/AppShell";
import ProductCard from "@/components/ProductCard";
import { useStoreCatalog } from "@/lib/catalogRepository";

const officialCategories = [
  { number: "01", title: "خشب العود", copy: "أخشاب وقطع موثقة من التصنيف الرسمي.", url: "https://baderabalkhail.com/خشب-العود/c1168655920", symbol: "ع" },
  { number: "02", title: "العطور", copy: "عطور بدر كما تظهر في المتجر الأصلي.", url: "https://baderabalkhail.com/العطور/c898253916", symbol: "عط" },
  { number: "03", title: "دهن العود والمسك", copy: "روائح وزيوت من تصنيف المتجر الرسمي.", url: "https://baderabalkhail.com/دهن-العود-والمسك/c1624010588", symbol: "د" },
  { number: "04", title: "البخور والمباخر", copy: "منتجات الضيافة والتبخير والقطع الرسمية.", url: "https://baderabalkhail.com/البخور/c1396035656", symbol: "ب" },
];

export default function Store() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [price, setPrice] = useState("all");
  const [availability, setAvailability] = useState("all");
  const { snapshot, loading, error, refresh } = useStoreCatalog();
  const products = snapshot?.products ?? [];
  const categoryNames = useMemo(() => [...new Set(products.flatMap(product => product.categories.map(item => item.name)))].sort((a, b) => a.localeCompare(b, "ar")), [products]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar");
    return products.filter(product => {
      const matchesQuery = !normalized || [product.name, product.description, ...product.categories.map(item => item.name)].filter(Boolean).join(" ").toLocaleLowerCase("ar").includes(normalized);
      const matchesCategory = category === "all" || product.categories.some(item => item.name === category);
      const matchesAvailability = availability === "all" || (availability === "available" ? product.available && !product.outOfStock : product.outOfStock);
      const matchesPrice = price === "all" || (price === "under100" ? (product.price ?? Infinity) < 100 : price === "100to200" ? (product.price ?? 0) >= 100 && (product.price ?? 0) <= 200 : (product.price ?? 0) > 200);
      return matchesQuery && matchesCategory && matchesAvailability && matchesPrice;
    });
  }, [availability, category, price, products, query]);

  const resetFilters = () => { setQuery(""); setCategory("all"); setPrice("all"); setAvailability("all"); };
  const isFallback = snapshot?.source === "local-fallback";
  const sourceLabel = isFallback ? "نسخة محلية احتياطية (snapshot قديم، ليست مخزونًا مباشرًا)" : snapshot?.source === "supabase" ? "Supabase public RLS" : "واجهة Salla العامة لمتجر بدر";

  if (loading) return <AppShell active="store" title="اكتشف الكتالوج"><section className="page-content store-page store-catalog-page"><div className="catalog-empty" role="status"><LoaderCircle className="animate-spin" size={25} /><h3>نقرأ الكتالوج المفعّل</h3><p>جارٍ تحميل المنتجات والأسعار والصور والتصنيفات...</p></div></section></AppShell>;

  return <AppShell active="store" title="اكتشف الكتالوج"><section className="page-content store-page store-catalog-page">
    <div className="page-hero"><div><span className="section-kicker">كتالوج بدر الرسمي</span><h1>كل ما ظهر في المصدر،<br /><em>في مكان أوضح.</em></h1><p>مساعد بدر مساحة اكتشاف واستشارة فقط. كل بطاقة أدناه مرتبطة بصفحة المنتج الأصلية، والشراء يتم من متجر بدر وحده.</p></div><div className="page-hero-mark"><Tag size={24} /><span>{products.length}<br />منتج مرئي</span></div></div>
    {error && <div className="catalog-empty" role="alert"><h3>تعذر الاتصال بمصدر Supabase</h3><p>{error}</p><p>نعرض الآن نسخة محلية احتياطية قديمة بوضوح، وليست مخزونًا مباشرًا.</p><button className="secondary-cta light" onClick={() => void refresh()}><RefreshCw size={16} /> إعادة المحاولة</button></div>}
    <div className="category-flow store-flow">{officialCategories.map(item => <a className="category-feature" href={item.url} key={item.title} target="_blank" rel="noopener noreferrer"><div className="category-number">{item.number}</div><div className="category-symbol">{item.symbol}</div><h3>{item.title}</h3><p>{item.copy}</p><span className="category-arrow"><ArrowUpLeft size={18} /></span></a>)}</div>
    <div className="catalog-heading"><div><span className="section-kicker">بحث وفرز</span><h2>اكتشف على<br /><em>طريقتك.</em></h2></div><p>نُظهر ما وصل من المصدر الرسمي في آخر snapshot: {snapshot ? new Date(snapshot.collectedAt).toLocaleDateString("ar-SA") : "غير متاح"}.</p></div>
    <div className="catalog-tools"><label className="catalog-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث باسم المنتج أو الفئة..." aria-label="بحث المنتجات" /></label><label><SlidersHorizontal size={15} /><select value={category} onChange={event => setCategory(event.target.value)} aria-label="فلتر الفئة"><option value="all">كل الفئات</option>{categoryNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label><label><Filter size={15} /><select value={price} onChange={event => setPrice(event.target.value)} aria-label="فلتر السعر"><option value="all">كل الأسعار</option><option value="under100">أقل من ١٠٠ ر.س</option><option value="100to200">١٠٠ – ٢٠٠ ر.س</option><option value="over200">أعلى من ٢٠٠ ر.س</option></select></label><label><select value={availability} onChange={event => setAvailability(event.target.value)} aria-label="فلتر التوفر"><option value="all">كل الحالات</option><option value="available">متاح في snapshot</option><option value="out">نفدت الكمية</option></select></label>{(query || category !== "all" || price !== "all" || availability !== "all") && <button className="reset-filters" onClick={resetFilters}>مسح الفلاتر</button>}</div>
    <div className="catalog-result-line"><span><strong>{filtered.length}</strong> من {products.length} منتج</span><span>المصدر: {sourceLabel}</span></div>
    {filtered.length ? <div className="product-grid catalog-grid">{filtered.map(product => <ProductCard key={`${product.id}-${product.url}`} product={product} />)}</div> : <div className="catalog-empty"><Search size={25} /><h3>ما لقينا نتيجة بهذا الوصف</h3><p>جرّب كلمة أخرى أو امسح الفلاتر لرؤية كامل snapshot.</p><button className="secondary-cta light" onClick={resetFilters}>عرض كامل الكتالوج</button></div>}
    <div className="direct-store"><div><span className="section-kicker">مكان الشراء</span><h2>التصفح هنا،<br /><em>والطلب من المصدر.</em></h2></div><a className="primary-cta" href="https://baderabalkhail.com" target="_blank" rel="noopener noreferrer">فتح متجر بدر <ExternalLink size={16} /></a></div>
  </section></AppShell>;
}
