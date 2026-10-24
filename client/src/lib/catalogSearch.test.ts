import { describe, expect, it } from "vitest";
import { categoryLabel, searchCatalog } from "@/lib/catalogSearch";

function categories(result: ReturnType<typeof searchCatalog>) {
  return new Set(result.products.map(categoryLabel));
}

describe("catalog search", () => {
  it("keeps perfumes separate from sprays", () => {
    const perfumes = searchCatalog("أبي عطر");
    const sprays = searchCatalog("أبي مرش");
    expect(perfumes.intent).toBe("perfumes");
    expect(sprays.intent).toBe("sprays");
    expect(categories(perfumes)).toEqual(new Set(["العطور"]));
    expect(categories(sprays)).toEqual(new Set(["المرشات"]));
  });

  it("returns real oud, incense, and burner products by their registered categories", () => {
    const oud = searchCatalog("أبي عود");
    const incense = searchCatalog("أبي بخور");
    const burners = searchCatalog("أبي مباخر");
    expect(oud.products.length).toBeGreaterThan(0);
    expect(
      [...categories(oud)].every(category =>
        ["خشب العود", "دهن العود والمسك"].includes(category)
      )
    ).toBe(true);
    expect(incense.products.length).toBeGreaterThan(0);
    expect(categories(incense)).toEqual(new Set(["البخور"]));
    expect(burners.products.length).toBeGreaterThan(0);
    expect(categories(burners)).toEqual(new Set(["المباخر"]));
  });

  it("does not misclassify boxes that only mention a diffuser in their description", () => {
    const diffusers = searchCatalog("أبي فواحة");
    expect(diffusers.intent).toBe("diffusers");
    expect(diffusers.products).toHaveLength(0);
  });

  it("finds a named product from a partial Arabic query without changing its source name", () => {
    const result = searchCatalog("ابحث عن عطر نجد");
    expect(result.products.some(product => product.name === "نجد 75 ملي")).toBe(
      true
    );
  });

  it("does not return cards for an explicitly unavailable product", () => {
    const result = searchCatalog("ابحث عن عطر غير موجود نهائيًا");
    expect(result.products).toHaveLength(0);
    expect(result.diagnostics.matchedBy).toBe("none");
  });

  it("returns category exploration products for a broad catalog request", () => {
    const result = searchCatalog("وش عندكم من منتجات؟");
    expect(result.intent).toBe("all");
    expect(result.products.length).toBeGreaterThan(1);
    expect(
      new Set(result.products.map(product => product.categories[0]?.name)).size
    ).toBeGreaterThan(1);
  });
});
