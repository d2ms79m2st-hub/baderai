import { ArrowUpLeft, ExternalLink, Tag } from "lucide-react";
import AppShell from "@/components/AppShell";
import ProductCard from "@/components/ProductCard";
import { verifiedProducts } from "@/data/products";

const links = [
  { number: "01", title: "خشب العود", copy: "تصفح التصنيف الرسمي للعود، وتحقق من الخيارات الحالية مباشرة من المتجر.", url: "https://baderabalkhail.com/-/c1168655920", symbol: "ع" },
  { number: "02", title: "العطور", copy: "خيارات العطور كما تظهر في متجر بدر الرسمي، دون وصف غير موثق.", url: "https://baderabalkhail.com/-/c898253916", symbol: "عط" },
  { number: "03", title: "التخفيضات", copy: "إذا كانت هناك عروض منشورة، ستجدها في صفحة التخفيضات الرسمية.", url: "https://baderabalkhail.com/offers", symbol: "%" },
];

export default function Store() {
  return <AppShell active="store" title="اكتشف المتجر"><section className="page-content store-page"><div className="page-hero"><div><span className="section-kicker">اكتشف متجر بدر</span><h1>الأبواب التي<br /><em>نعرفها يقينًا.</em></h1><p>نقودك إلى الصفحات الرسمية مباشرة. المنتجات والأسعار تتغير في المصدر، لذلك لا نكرر بيانات غير متحققة هنا.</p></div><div className="page-hero-mark"><Tag size={24} /><span>مصدر<br />رسمي</span></div></div><div className="category-flow store-flow">{links.map(item => <a className="category-feature" href={item.url} key={item.title} target="_blank" rel="noreferrer"><div className="category-number">{item.number}</div><div className="category-symbol">{item.symbol}</div><h3>{item.title}</h3><p>{item.copy}</p><span className="category-arrow"><ArrowUpLeft size={18} /></span></a>)}</div><div className="products-heading"><div><span className="section-kicker">منتجات ظهرت في المصدر</span><h2>بطاقات حقيقية،<br /><em>والشراء من المتجر.</em></h2></div><span>كل بطاقة تفتح صفحة المنتج الرسمية ↗</span></div><div className="product-grid">{verifiedProducts.map(product => <ProductCard key={product.url} product={product} />)}</div><div className="direct-store"><div><span className="section-kicker">المتجر الكامل</span><h2>تصفح كل ما هو منشور<br /><em>من المصدر نفسه.</em></h2></div><a className="primary-cta" href="https://baderabalkhail.com" target="_blank" rel="noreferrer">فتح متجر بدر <ExternalLink size={16} /></a></div></section></AppShell>;
}
