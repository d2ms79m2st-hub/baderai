import { ArrowUpLeft, ExternalLink, ShieldCheck } from "lucide-react";
import type { CatalogProduct } from "@/data/catalog";
import type { VerifiedProduct } from "@/data/products";
import { categoryLabel } from "@/lib/catalogSearch";

type ProductLike = VerifiedProduct | CatalogProduct;
type Props = { product: ProductLike; compact?: boolean };

function availability(product: ProductLike) {
  if ("availability" in product) return product.availability;
  if (product.outOfStock) return "نفدت الكمية";
  if (product.available) return "متوفر حسب snapshot";
  return "تحتاج تحققًا";
}

export default function ProductCard({ product, compact = false }: Props) {
  const price = product.price;
  const compareAt =
    "regularPrice" in product ? product.regularPrice : product.compareAt;
  const size =
    "weight" in product
      ? product.weight
        ? `${product.weight} كجم`
        : undefined
      : product.size;
  const description =
    product.description ||
    "لا يوجد وصف رسمي منشور لهذا المنتج في snapshot الحالية.";
  const checkedAt = "checkedAt" in product ? product.checkedAt : undefined;
  return (
    <article
      className={`product-card ${compact ? "product-card-compact" : ""}`}
    >
      <a
        className="product-card-image"
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`فتح ${product.name} في متجر بدر الرسمي`}
      >
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="product-source-stamp">
          <ShieldCheck size={11} /> رسمي
        </span>
        <span className="product-open">
          <ExternalLink size={14} />
        </span>
      </a>
      <div className="product-card-body">
        <span className="product-source">من متجر بدر الرسمي</span>
        <h3>{product.name}</h3>
        <span className="product-category">
          الفئة:{" "}
          {"categories" in product ? categoryLabel(product) : "موثق من المصدر"}
        </span>
        {!compact && <p>{description}</p>}
        {size && <span className="product-size">{size}</span>}
        <div className="product-meta">
          <strong>
            {typeof price === "number" ? `${price}` : "غير متاح"}{" "}
            {typeof price === "number" && <small>ر.س</small>}
          </strong>
          {typeof compareAt === "number" && compareAt > (price ?? 0) && (
            <del>{compareAt} ر.س</del>
          )}
          <ArrowUpLeft size={17} />
        </div>
        <div className="product-card-bottom">
          <span>{availability(product)}</span>
          <a href={product.url} target="_blank" rel="noopener noreferrer">
            عرض المنتج <ExternalLink size={11} />
          </a>
        </div>
        {!compact && (
          <span className="product-date">
            آخر تحقق: {checkedAt || "snapshot الكتالوج"}
          </span>
        )}
      </div>
    </article>
  );
}
