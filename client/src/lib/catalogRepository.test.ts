import { describe, expect, it } from "vitest";
import { createLocalFallback, mapSupabaseCatalog } from "@/lib/catalogRepository";

describe("catalog repository mapping", () => {
  it("keeps prices, categories, image, availability, and JSON rating", () => {
    const products = mapSupabaseCatalog({
      products: [{
        id: "p1", sku: null, name: "منتج", description: null, official_url: "https://example.com/p1", status: "sale", currency: "SAR", weight: "0.2", has_options: false, rating: { count: 2, stars: 5 }, available: true, out_of_stock: false, source_collected_at: "2026-10-22T05:38:41Z",
      }],
      categories: [{ id: "c1", name: "العطور" }, { id: "c2", name: "عروض اليوم الوطني" }],
      relations: [{ product_id: "p1", category_id: "c1" }, { product_id: "p1", category_id: "c2" }],
      prices: [{ product_id: "p1", price: 40.5, regular_price: 45, sale_price: 40.5, currency: "SAR", observed_at: "2026-10-22T05:38:41Z", is_current: true }],
      images: [
        { product_id: "p1", url: "https://cdn.example.com/secondary.png", original_url: null, sort_order: 2, observed_at: "2026-10-22T05:38:41Z", is_current: true },
        { product_id: "p1", url: "https://cdn.example.com/p1.png", original_url: null, sort_order: 0, observed_at: "2026-10-22T05:38:41Z", is_current: true },
        { product_id: "p1", url: "https://cdn.example.com/old.png", original_url: null, sort_order: 0, observed_at: "2026-10-21T05:38:41Z", is_current: false },
      ],
    });
    expect(products).toEqual([expect.objectContaining({ id: "p1", price: 40.5, regularPrice: 45, salePrice: 40.5, image: "https://cdn.example.com/p1.png", available: true, outOfStock: false, rating: { count: 2, stars: 5 }, categories: [{ id: "c1", name: "العطور" }, { id: "c2", name: "عروض اليوم الوطني" }] })]);
  });

  it("does not invent a price, image, or rating when the public response is incomplete", () => {
    const [product] = mapSupabaseCatalog({
      products: [{ id: "p2", sku: null, name: "منتج بلا سعر", description: null, official_url: "https://example.com/p2", status: "out", currency: "SAR", weight: null, has_options: true, rating: null, available: false, out_of_stock: true, source_collected_at: "2026-10-22T05:38:41Z" }],
      categories: [], relations: [], prices: [], images: [],
    });
    expect(product).toMatchObject({ price: null, regularPrice: null, salePrice: null, image: "", rating: null, categories: [], available: false, outOfStock: true });
  });

  it("returns an empty catalog without fabricating rows", () => {
    expect(mapSupabaseCatalog({ products: [], categories: [], relations: [], prices: [], images: [] })).toEqual([]);
  });

  it("creates an explicit local fallback state for retryable connection failures", () => {
    const fallback = createLocalFallback(new Error("network unavailable"));
    expect(fallback.error).toBe("network unavailable");
    expect(fallback.snapshot.source).toBe("local-fallback");
    expect(fallback.snapshot.products.length).toBeGreaterThan(0);
  });
});
