import { ArrowUpLeft, ExternalLink } from "lucide-react";
import type { VerifiedProduct } from "@/data/products";

export default function ProductCard({ product }: { product: VerifiedProduct }) {
  return <a className="product-card" href={product.url} target="_blank" rel="noreferrer" aria-label={`فتح ${product.name} في متجر بدر الرسمي`}>
    <div className="product-image-wrap"><img src={product.image} alt={product.name} /><span className="product-status">{product.availability}</span><span className="product-open"><ExternalLink size={15} /></span></div>
    <div className="product-card-body"><span className="product-source">من متجر بدر الرسمي</span><h3>{product.name}</h3><p>{product.description}</p><div className="product-meta"><strong>{product.price} <small>ر.س</small></strong>{product.compareAt && <del>{product.compareAt} ر.س</del>}<ArrowUpLeft size={18} /></div><span className="product-date">آخر تحقق: {product.checkedAt}</span></div>
  </a>;
}
