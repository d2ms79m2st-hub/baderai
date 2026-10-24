import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
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

  it("matches the app catalog to the official normalized snapshot", async () => {
    const source = JSON.parse(
      await readFile("client/src/data/bader-official-catalog.json", "utf8")
    ) as { products: typeof catalogProducts };
    const appById = new Map(catalogProducts.map(product => [product.id, product]));
    expect(source.products).toHaveLength(catalogProducts.length);
    for (const sourceProduct of source.products) {
      const appProduct = appById.get(sourceProduct.id);
      expect(appProduct).toBeDefined();
      expect(appProduct).toMatchObject({
        id: sourceProduct.id,
        name: sourceProduct.name,
        description: sourceProduct.description,
        url: sourceProduct.url,
        image: sourceProduct.image,
        price: sourceProduct.price,
        regularPrice: sourceProduct.regularPrice,
        salePrice: sourceProduct.salePrice,
        currency: sourceProduct.currency,
        status: sourceProduct.status,
        available: sourceProduct.available,
        outOfStock: sourceProduct.outOfStock,
        weight: sourceProduct.weight,
        categories: sourceProduct.categories,
      });
    }
  });
});
