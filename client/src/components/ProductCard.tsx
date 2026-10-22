import { ArrowUpLeft, ExternalLink, ShieldCheck } from "lucide-react";
import type { VerifiedProduct } from "@/data/products";

type Props = { product: VerifiedProduct; compact?: boolean };

export default function ProductCard({ product, compact = false }: Props) {
  return <article className={`product-card ${compact ? "product-card-compact" : ""}`}>
    <a className="product-card-image" href={product.url} target="_blank" rel="noopener noreferrer" aria-label={`فتح ${product.name} في متجر بدر الرسمي`}>
      <img src={product.image} alt={product.name} loading="lazy" />
      <span className="product-source-stamp"><ShieldCheck size={11} /> رسمي</span>
      <span className="product-open"><ExternalLink size={14} /></span>
    </a>
    <div className="product-card-body">
      <span className="product-source">من متجر بدر الرسمي</span>
      <h3>{product.name}</h3>
      {!compact && <p>{product.description}</p>}
      {product.size && <span className="product-size">{product.size}</span>}
      <div className="product-meta">
        <strong>{product.price} <small>ر.س</small></strong>
        {product.compareAt && <del>{product.compareAt} ر.س</del>}
        <ArrowUpLeft size={17} />
      </div>
      <div className="product-card-bottom"><span>{product.availability}</span><a href={product.url} target="_blank" rel="noopener noreferrer">عرض المنتج <ExternalLink size={11} /></a></div>
      {!compact && <span className="product-date">آخر تحقق: {product.checkedAt}</span>}
    </div>
  </article>;
}
