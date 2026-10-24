import { describe, expect, it } from "vitest";
import { catalogProductCount, catalogProducts } from "@/data/catalog";

describe("catalog migration contract", () => {
  it("keeps the checked-in catalog internally consistent", () => {
    expect(catalogProducts).toHaveLength(catalogProductCount);

    const ids = catalogProducts.map(product => product.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const product of catalogProducts) {
      expect(product.id).toMatch(/^\d+$/);
      expect(product.name.trim()).not.toBe("");
      expect(product.url).toMatch(/^https:\/\/baderabalkhail\.com\//);
      expect(product.image).toMatch(/^https?:\/\//);
      expect(product.currency).toBe("SAR");
      expect(product.available && product.outOfStock).toBe(false);
      expect(product.categories.length).toBeGreaterThan(0);

      for (const category of product.categories) {
        expect(category.id.trim()).not.toBe("");
        expect(category.name.trim()).not.toBe("");
      }

      for (const value of [product.price, product.regularPrice, product.salePrice]) {
        expect(value === null || (Number.isFinite(value) && value >= 0)).toBe(true);
      }
    }
  });

  it("preserves a source snapshot timestamp for reproducible migration", async () => {
    const { catalogCollectedAt } = await import("@/data/catalog");
    expect(Number.isNaN(Date.parse(catalogCollectedAt))).toBe(false);
  });
});
