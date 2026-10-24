import { catalogProducts, type CatalogProduct } from "@/data/catalog";
import type { AssistantProductRef } from "@/lib/n8nAssistant";

export type CatalogIntent =
  | "perfumes"
  | "sprays"
  | "diffusers"
  | "oud"
  | "incense"
  | "burners"
  | "gifts"
  | "all"
  | "product"
  | "unknown";

export type CatalogDiagnostics = {
  query: string;
  intent: CatalogIntent;
  catalogCount: number;
  resultCount: number;
  matchedBy:
    | "product"
    | "category"
    | "budget"
    | "gift"
    | "availability"
    | "none";
};

export type CatalogSearchResult = {
  products: CatalogProduct[];
  intent: CatalogIntent;
  diagnostics: CatalogDiagnostics;
};

const categoryByIntent: Record<
  Exclude<CatalogIntent, "product" | "unknown">,
  string[]
> = {
  perfumes: ["العطور"],
  sprays: ["المرشات"],
  // لا توجد فئة «فواحات» في snapshot الحالية؛ لا نستنتجها من وصف بوكس أو من كلمة عابرة.
  diffusers: ["الفواحات"],
  oud: ["خشب العود", "دهن العود والمسك"],
  incense: ["البخور"],
  burners: ["المباخر"],
  gifts: ["بوكسات", "العطور", "المرشات"],
  all: [],
};

const categoryTerms: Array<{ intent: CatalogIntent; terms: string[] }> = [
  { intent: "diffusers", terms: ["فواحه", "فواحة", "فواحات", "فواحات"] },
  {
    intent: "sprays",
    terms: ["مرش", "مرشات", "معطر رش", "معطرات الرش", "رذاذ"],
  },
  { intent: "perfumes", terms: ["عطر", "عطور", "عطري", "عطرية"] },
  {
    intent: "oud",
    terms: ["عود", "اعواد", "أعواد", "خشب العود", "دهن العود", "رقائق", "دقه"],
  },
  { intent: "incense", terms: ["بخور", "تبخير"] },
  { intent: "burners", terms: ["مبخرة", "مباخر"] },
  { intent: "gifts", terms: ["هدية", "هديه", "هديا", "بوكس", "هدية رسمية"] },
  {
    intent: "all",
    terms: ["منتجات", "المنتجات", "الكتالوج", "كل شيء", "كل المنتجات"],
  },
];

const ignoredNameTokens = new Set([
  "ابي",
  "ابغى",
  "اريد",
  "ابحث",
  "رشح",
  "منتج",
  "منتجات",
  "عندي",
  "عندكم",
  "من",
  "في",
  "لي",
]);

export function normalizeArabic(value: string) {
  return value
    .toLocaleLowerCase("ar")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueProducts(products: CatalogProduct[]) {
  return Array.from(
    new Map(products.map(product => [product.url, product])).values()
  );
}

function validProduct(product: CatalogProduct) {
  return Boolean(
    product.id &&
      product.name &&
      product.url &&
      product.image &&
      product.currency === "SAR" &&
      product.available &&
      !product.outOfStock
  );
}

export function resolveProductRefs(refs: AssistantProductRef[]) {
  const resolved: CatalogProduct[] = [];
  for (const ref of refs) {
    const id = String(ref.id ?? ref.productId ?? "");
    const name = ref.name ? normalizeArabic(ref.name) : "";
    const match = catalogProducts.find(
      product =>
        (id && product.id === id) ||
        (ref.url && product.url === ref.url) ||
        (name && normalizeArabic(product.name) === name)
    );
    if (match && validProduct(match)) resolved.push(match);
  }
  return uniqueProducts(resolved);
}

export function classifyIntent(query: string): CatalogIntent {
  const source = normalizeArabic(query);
  for (const entry of categoryTerms) {
    if (entry.terms.some(term => source.includes(normalizeArabic(term))))
      return entry.intent;
  }
  if (/\b(?:اقل من|تحت|بحدود|ميزانيه|ميزانية)\s*\d{2,4}/.test(source))
    return "all";
  return "unknown";
}

function findNamedProducts(source: string, includePartial = true) {
  const tokens = source
    .split(" ")
    .filter(token => token.length >= 3 && !ignoredNameTokens.has(token));
  const exact = catalogProducts.filter(product => {
    const name = normalizeArabic(product.name);
    return source.includes(name) || name.includes(source);
  });
  if (!includePartial) return uniqueProducts(exact);
  const partial = catalogProducts.filter(product => {
    const name = normalizeArabic(product.name);
    return tokens.some(token => name.includes(token));
  });
  return uniqueProducts([...exact, ...partial]);
}

function budgetValue(source: string) {
  return source.match(/(?:اقل من|تحت|بحدود|ميزانيه|ميزانية)\s*(\d{2,4})/)?.[1];
}

function byIntent(intent: CatalogIntent) {
  const categories =
    intent === "unknown" || intent === "product"
      ? []
      : categoryByIntent[intent];
  return categories.length
    ? catalogProducts.filter(product =>
        product.categories.some(category => categories.includes(category.name))
      )
    : [];
}

function makeDiagnostics(
  query: string,
  intent: CatalogIntent,
  products: CatalogProduct[],
  matchedBy: CatalogDiagnostics["matchedBy"]
): CatalogDiagnostics {
  return {
    query,
    intent,
    catalogCount: catalogProducts.length,
    resultCount: products.length,
    matchedBy,
  };
}

export function searchCatalog(query: string): CatalogSearchResult {
  const source = normalizeArabic(query);
  const intent = classifyIntent(query);
  const unavailableRequest = [
    "غير موجود",
    "مو موجود",
    "لا يوجد",
    "ما عندكم",
  ].some(term => source.includes(term));
  const named = findNamedProducts(source, !unavailableRequest);
  const budget = budgetValue(source);
  const budgetProducts = budget
    ? catalogProducts.filter(
        product =>
          typeof product.price === "number" &&
          product.price <= Number(budget) &&
          !product.outOfStock
      )
    : [];
  if (unavailableRequest) {
    const products = named.filter(validProduct).slice(0, 6);
    return {
      products,
      intent: named.length ? "product" : intent,
      diagnostics: makeDiagnostics(
        query,
        named.length ? "product" : intent,
        products,
        named.length ? "product" : "none"
      ),
    };
  }

  if (named.length && intent === "unknown") {
    const products = named.filter(validProduct).slice(0, 6);
    return {
      products,
      intent: "product",
      diagnostics: makeDiagnostics(query, "product", products, "product"),
    };
  }

  if (intent === "all") {
    const categories = [
      ...new Set(
        catalogProducts.flatMap(product =>
          product.categories.map(category => category.name)
        )
      ),
    ];
    const products = categories
      .map(category =>
        catalogProducts.find(product =>
          product.categories.some(item => item.name === category) &&
          validProduct(product)
        )
      )
      .filter((product): product is CatalogProduct => Boolean(product))
      .slice(0, 8);
    return {
      products,
      intent,
      diagnostics: makeDiagnostics(
        query,
        intent,
        products,
        products.length ? "category" : "none"
      ),
    };
  }

  const categoryProducts = byIntent(intent);
  const intentCategories =
    intent === "unknown" || intent === "product"
      ? []
      : categoryByIntent[intent];
  const namedInIntent = intentCategories.length
    ? named.filter(product =>
        product.categories.some(category =>
          intentCategories.includes(category.name)
        )
      )
    : named;
  const giftProducts =
    intent === "gifts"
      ? catalogProducts.filter(
          product =>
            !product.outOfStock &&
            product.categories.some(category =>
              ["بوكسات", "العطور", "المرشات"].includes(category.name)
            )
        )
      : [];
  const products = uniqueProducts(
    [
      ...namedInIntent,
      ...budgetProducts,
      ...giftProducts,
      ...categoryProducts,
    ].filter(validProduct)
  ).slice(0, source.includes("قارن") || source.includes("مقارن") ? 4 : 6);
  const matchedBy = namedInIntent.length
    ? "product"
    : budgetProducts.length
      ? "budget"
      : giftProducts.length
        ? "gift"
        : categoryProducts.length
          ? "category"
          : "none";
  return {
    products,
    intent,
    diagnostics: makeDiagnostics(query, intent, products, matchedBy),
  };
}

export function categoryLabel(product: CatalogProduct) {
  return (
    product.categories.find(category => category.name !== "عروض اليوم الوطني")
      ?.name ??
    product.categories[0]?.name ??
    "غير مصنف في المصدر"
  );
}
