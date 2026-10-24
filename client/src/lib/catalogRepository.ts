import { catalogCollectedAt, catalogProducts, type CatalogProduct } from "@/data/catalog";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/supabase.types";

export type CatalogSource = "local" | "supabase" | "local-fallback";

export type CatalogSnapshot = {
  products: CatalogProduct[];
  collectedAt: string;
  source: CatalogSource;
};

type ProductRow = {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  official_url: string;
  status: string | null;
  currency: string;
  weight: string | null;
  has_options: boolean;
  rating: Json | null;
  available: boolean;
  out_of_stock: boolean;
  source_collected_at: string;
};

type CategoryRow = { id: string; name: string };
type RelationRow = { product_id: string; category_id: string };
type PriceRow = {
  product_id: string;
  price: number | null;
  regular_price: number | null;
  sale_price: number | null;
  currency: string;
  observed_at: string;
  is_current: boolean;
};
type ImageRow = {
  product_id: string;
  url: string;
  original_url: string | null;
  sort_order: number;
  observed_at: string;
  is_current: boolean;
};

function firstByProduct<T extends { product_id: string }>(rows: T[]) {
  return new Map(rows.map(row => [row.product_id, row]));
}

function normalizeRating(value: Json | null) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function mapSupabaseCatalog(input: {
  products: ProductRow[];
  categories: CategoryRow[];
  relations: RelationRow[];
  prices: PriceRow[];
  images: ImageRow[];
}): CatalogProduct[] {
  const categoriesById = new Map(input.categories.map(category => [category.id, category]));
  const relationsByProduct = new Map<string, { id: string; name: string }[]>();
  for (const relation of input.relations) {
    const category = categoriesById.get(relation.category_id);
    if (!category) continue;
    const current = relationsByProduct.get(relation.product_id) ?? [];
    current.push({ id: category.id, name: category.name });
    relationsByProduct.set(relation.product_id, current);
  }
  const pricesByProduct = firstByProduct(input.prices.filter(price => price.is_current));
  const imagesByProduct = new Map<string, ImageRow>();
  for (const image of input.images.filter(item => item.is_current).sort((a, b) => a.sort_order - b.sort_order)) {
    if (!imagesByProduct.has(image.product_id)) imagesByProduct.set(image.product_id, image);
  }

  return input.products.map(product => {
    const price = pricesByProduct.get(product.id);
    const image = imagesByProduct.get(product.id);
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      url: product.official_url,
      image: image?.url ?? "",
      price: price?.price ?? null,
      regularPrice: price?.regular_price ?? null,
      salePrice: price?.sale_price ?? null,
      currency: product.currency,
      status: product.status,
      available: product.available,
      outOfStock: product.out_of_stock,
      weight: product.weight,
      categories: relationsByProduct.get(product.id) ?? [],
      rating: normalizeRating(product.rating),
    };
  });
}

export function getLocalCatalogSnapshot(): CatalogSnapshot {
  return { products: catalogProducts, collectedAt: catalogCollectedAt, source: "local" };
}

export async function fetchSupabaseCatalog(): Promise<CatalogSnapshot> {
  const [productsResult, categoriesResult, relationsResult, pricesResult, imagesResult] = await Promise.all([
    supabase.from("catalog_products").select("id,sku,name,description,official_url,status,currency,weight,has_options,rating,available,out_of_stock,source_collected_at").order("id"),
    supabase.from("catalog_categories").select("id,name").order("id"),
    supabase.from("catalog_product_categories").select("product_id,category_id"),
    supabase.from("catalog_product_prices").select("product_id,price,regular_price,sale_price,currency,observed_at,is_current").eq("is_current", true),
    supabase.from("catalog_product_images").select("product_id,url,original_url,sort_order,observed_at,is_current").eq("is_current", true),
  ]);

  const firstError = [productsResult, categoriesResult, relationsResult, pricesResult, imagesResult].find(result => result.error)?.error;
  if (firstError) throw new Error(`تعذر قراءة كتالوج Supabase: ${firstError.message}`);

  const products = mapSupabaseCatalog({
    products: (productsResult.data ?? []) as ProductRow[],
    categories: (categoriesResult.data ?? []) as CategoryRow[],
    relations: (relationsResult.data ?? []) as RelationRow[],
    prices: (pricesResult.data ?? []) as PriceRow[],
    images: (imagesResult.data ?? []) as ImageRow[],
  });
  const collectedAt = (productsResult.data ?? []).map(row => (row as ProductRow).source_collected_at).sort().at(-1) ?? catalogCollectedAt;
  return { products, collectedAt, source: "supabase" };
}

export async function loadCatalog(source: CatalogSource = "supabase"): Promise<CatalogSnapshot> {
  if (source === "local") return getLocalCatalogSnapshot();
  return fetchSupabaseCatalog();
}
