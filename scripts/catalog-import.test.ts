import { describe, expect, it } from "vitest";
import { importSnapshot, type SourceSnapshot } from "./catalog-import";

const product = (overrides: Record<string, unknown> = {}) => ({
  id: "100",
  name: "منتج تجريبي",
  description: "وصف",
  url: "https://baderabalkhail.com/test/p100",
  image: "https://cdn.example.com/100.png",
  originalImage: "https://cdn.example.com/original-100.png",
  price: 90,
  regularPrice: 100,
  salePrice: 90,
  currency: "SAR",
  status: "sale",
  available: true,
  outOfStock: false,
  hasOptions: false,
  weight: "0.2",
  sku: "SKU-100",
  rating: 4.5,
  categories: [{ id: "cat-1", name: "العطور" }],
  ...overrides,
});

const snapshot = (products = [product(), product({
  id: "200",
  name: "منتج نافد",
  image: "https://cdn.example.com/200.png",
  originalImage: null,
  price: 50,
  regularPrice: 50,
  salePrice: null,
  available: false,
  outOfStock: true,
  sku: null,
  rating: null,
  categories: [
    { id: "cat-1", name: "العطور" },
    { id: "cat-2", name: "عروض اليوم الوطني" },
  ],
})]): SourceSnapshot => ({
  schemaVersion: "2.0",
  collectedAt: "2026-10-22T05:38:41Z",
  storeId: "565229011",
  products: products as SourceSnapshot["products"],
});

describe("local catalog importer", () => {
  it("imports all entities and preserves source-only fields", () => {
    const result = importSnapshot(snapshot());
    expect(result.report.differences).toEqual([]);
    expect(result.report.expected).toEqual({
      products: 2,
      categories: 2,
      memberships: 3,
      images: 2,
      prices: 2,
      available: 1,
      outOfStock: 1,
    });
    expect(result.store.products.find(item => item.id === "100")).toMatchObject({
      sku: "SKU-100",
      rating: 4.5,
      sourceStoreId: "565229011",
    });
    expect(result.store.images.find(item => item.productId === "100")?.originalUrl).toContain("original-100");
  });

  it("is idempotent when importing the same snapshot twice", () => {
    const first = importSnapshot(snapshot());
    const second = importSnapshot(snapshot(), first.store);
    expect(second.report.differences).toEqual([]);
    expect(second.store.products).toHaveLength(2);
    expect(second.store.categories).toHaveLength(2);
    expect(second.store.memberships).toHaveLength(3);
    expect(second.store.images).toHaveLength(2);
    expect(second.store.prices).toHaveLength(2);
  });

  it("rejects incomplete source records before writing anything", () => {
    expect(() => importSnapshot(snapshot([product({ image: null })]))).toThrow(/missing image/);
    expect(() => importSnapshot(snapshot([product({ available: true, outOfStock: true })]))).toThrow(/contradictory availability/);
  });
});
