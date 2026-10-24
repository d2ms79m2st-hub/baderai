import { readFile, writeFile } from "node:fs/promises";

type SourceCategory = { id: string; name: string };
export type SourceProduct = {
  id: string;
  name: string;
  description: string | null;
  url: string;
  image: string | null;
  originalImage?: string | null;
  price: number | null;
  regularPrice: number | null;
  salePrice: number | null;
  currency: string | null;
  status: string | null;
  available: boolean;
  outOfStock: boolean;
  hasOptions?: boolean;
  weight: string | null;
  sku?: string | null;
  rating?: number | null;
  categories: SourceCategory[];
  [key: string]: unknown;
};

export type SourceSnapshot = {
  schemaVersion: string;
  collectedAt: string;
  sourceApi?: string;
  storeId: string;
  products: SourceProduct[];
};

type LocalProduct = Omit<SourceProduct, "categories"> & {
  sourceStoreId: string;
  sourceCollectedAt: string;
  sourcePayload: SourceProduct;
};
type LocalCategory = SourceCategory & { sourceStoreId: string };
type LocalMembership = { productId: string; categoryId: string; observedAt: string };
type LocalImage = {
  productId: string;
  url: string;
  originalUrl: string | null;
  kind: "primary";
  sortOrder: number;
  isCurrent: boolean;
  observedAt: string;
};
type LocalPrice = {
  productId: string;
  price: number | null;
  regularPrice: number | null;
  salePrice: number | null;
  currency: string;
  observedAt: string;
  source: "salla_public_catalog_snapshot";
  isCurrent: boolean;
};

export type LocalCatalogStore = {
  schemaVersion: "catalog-local-v1";
  products: LocalProduct[];
  categories: LocalCategory[];
  memberships: LocalMembership[];
  images: LocalImage[];
  prices: LocalPrice[];
};

export type CatalogCounts = {
  products: number;
  categories: number;
  memberships: number;
  images: number;
  prices: number;
  available: number;
  outOfStock: number;
};

export type CatalogImportReport = {
  sourceCollectedAt: string;
  expected: CatalogCounts;
  imported: CatalogCounts;
  differences: string[];
};

function key(...parts: (string | number | null)[]) {
  return parts.map(part => String(part ?? "")).join("|");
}

function sortBy<T>(items: T[], selector: (item: T) => string) {
  return [...items].sort((a, b) => selector(a).localeCompare(selector(b)));
}

export function validateSnapshot(snapshot: SourceSnapshot): string[] {
  const errors: string[] = [];
  if (!snapshot.schemaVersion) errors.push("missing schemaVersion");
  if (!snapshot.storeId) errors.push("missing storeId");
  if (!snapshot.collectedAt || Number.isNaN(Date.parse(snapshot.collectedAt))) {
    errors.push("invalid collectedAt");
  }
  const ids = new Set<string>();
  for (const product of snapshot.products ?? []) {
    if (!product.id || !/^\d+$/.test(product.id)) errors.push("product with invalid id");
    if (ids.has(product.id)) errors.push(`duplicate product id: ${product.id}`);
    ids.add(product.id);
    if (!product.name?.trim()) errors.push(`product ${product.id}: missing name`);
    if (!product.url?.startsWith("https://baderabalkhail.com/")) {
      errors.push(`product ${product.id}: invalid official url`);
    }
    if (!product.image?.startsWith("http")) errors.push(`product ${product.id}: missing image`);
    if (product.available && product.outOfStock) {
      errors.push(`product ${product.id}: contradictory availability`);
    }
    for (const field of ["price", "regularPrice", "salePrice"] as const) {
      const value = product[field];
      if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
        errors.push(`product ${product.id}: invalid ${field}`);
      }
    }
    if (!product.currency) errors.push(`product ${product.id}: missing currency`);
    if (!product.categories?.length) errors.push(`product ${product.id}: missing categories`);
    const categoryIds = new Set<string>();
    for (const category of product.categories ?? []) {
      if (!category.id || !category.name?.trim()) errors.push(`product ${product.id}: invalid category`);
      if (categoryIds.has(category.id)) errors.push(`product ${product.id}: duplicate category ${category.id}`);
      categoryIds.add(category.id);
    }
  }
  return errors;
}

function expectedCounts(snapshot: SourceSnapshot): CatalogCounts {
  const categories = new Set<string>();
  const memberships = new Set<string>();
  for (const product of snapshot.products) {
    for (const category of product.categories) {
      categories.add(category.id);
      memberships.add(key(product.id, category.id));
    }
  }
  return {
    products: snapshot.products.length,
    categories: categories.size,
    memberships: memberships.size,
    images: snapshot.products.length,
    prices: snapshot.products.length,
    available: snapshot.products.filter(product => product.available).length,
    outOfStock: snapshot.products.filter(product => product.outOfStock).length,
  };
}

function snapshotCountsInStore(snapshot: SourceSnapshot, store: LocalCatalogStore): CatalogCounts {
  const productIds = new Set(snapshot.products.map(product => product.id));
  const categoryIds = new Set(snapshot.products.flatMap(product => product.categories.map(category => category.id)));
  const membershipKeys = new Set(snapshot.products.flatMap(product => product.categories.map(category => key(product.id, category.id))));
  const products = store.products.filter(product => productIds.has(product.id) && product.sourceCollectedAt === snapshot.collectedAt);
  return {
    products: products.length,
    categories: store.categories.filter(category => categoryIds.has(category.id)).length,
    memberships: store.memberships.filter(item => membershipKeys.has(key(item.productId, item.categoryId)) && item.observedAt === snapshot.collectedAt).length,
    images: store.images.filter(item => productIds.has(item.productId) && item.observedAt === snapshot.collectedAt).length,
    prices: store.prices.filter(item => productIds.has(item.productId) && item.observedAt === snapshot.collectedAt).length,
    available: products.filter(product => product.available).length,
    outOfStock: products.filter(product => product.outOfStock).length,
  };
}

export function importSnapshot(
  snapshot: SourceSnapshot,
  existing: LocalCatalogStore | null = null,
): { store: LocalCatalogStore; report: CatalogImportReport } {
  const errors = validateSnapshot(snapshot);
  if (errors.length) throw new Error(`catalog validation failed:\n${errors.join("\n")}`);

  const store: LocalCatalogStore = existing ?? {
    schemaVersion: "catalog-local-v1",
    products: [],
    categories: [],
    memberships: [],
    images: [],
    prices: [],
  };
  const products = new Map(store.products.map(product => [product.id, product]));
  const categories = new Map(store.categories.map(category => [category.id, category]));
  const memberships = new Map(store.memberships.map(item => [key(item.productId, item.categoryId), item]));
  const images = new Map(store.images.map(item => [key(item.productId, item.url, item.originalUrl), item]));
  const prices = new Map(store.prices.map(item => [key(item.productId, item.observedAt), item]));

  for (const product of snapshot.products) {
    products.set(product.id, {
      ...product,
      sourceStoreId: snapshot.storeId,
      sourceCollectedAt: snapshot.collectedAt,
      sourcePayload: product,
    });
    for (const category of product.categories) {
      categories.set(category.id, { ...category, sourceStoreId: snapshot.storeId });
      memberships.set(key(product.id, category.id), {
        productId: product.id,
        categoryId: category.id,
        observedAt: snapshot.collectedAt,
      });
    }
    images.set(key(product.id, product.image, product.originalImage ?? null), {
      productId: product.id,
      url: product.image as string,
      originalUrl: product.originalImage ?? null,
      kind: "primary",
      sortOrder: 0,
      isCurrent: true,
      observedAt: snapshot.collectedAt,
    });
    prices.set(key(product.id, snapshot.collectedAt), {
      productId: product.id,
      price: product.price,
      regularPrice: product.regularPrice,
      salePrice: product.salePrice,
      currency: product.currency as string,
      observedAt: snapshot.collectedAt,
      source: "salla_public_catalog_snapshot",
      isCurrent: true,
    });
  }

  store.products = sortBy([...products.values()], item => item.id);
  store.categories = sortBy([...categories.values()], item => item.id);
  store.memberships = sortBy([...memberships.values()], item => key(item.productId, item.categoryId));
  store.images = sortBy([...images.values()], item => key(item.productId, item.url, item.originalUrl));
  store.prices = sortBy([...prices.values()], item => key(item.productId, item.observedAt));

  const expected = expectedCounts(snapshot);
  const imported = snapshotCountsInStore(snapshot, store);
  const differences: string[] = [];
  for (const field of Object.keys(expected) as (keyof CatalogCounts)[]) {
    if (expected[field] !== imported[field]) differences.push(`${field}: expected ${expected[field]}, imported ${imported[field]}`);
  }
  return { store, report: { sourceCollectedAt: snapshot.collectedAt, expected, imported, differences } };
}

export async function readSnapshot(path: string): Promise<SourceSnapshot> {
  return JSON.parse(await readFile(path, "utf8")) as SourceSnapshot;
}

export async function readStore(path: string): Promise<LocalCatalogStore | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as LocalCatalogStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function main() {
  const args = new Map<string, string>();
  const argv = process.argv.slice(2).filter(argument => argument !== "--");
  for (let index = 0; index < argv.length; index += 2) args.set(argv[index], argv[index + 1]);
  const sourcePath = args.get("--source");
  const storePath = args.get("--store");
  const reportPath = args.get("--report");
  if (!sourcePath || !storePath || !reportPath) {
    throw new Error("usage: pnpm exec tsx scripts/catalog-import.ts --source <json> --store <json> --report <json>");
  }
  const snapshot = await readSnapshot(sourcePath);
  const existing = await readStore(storePath);
  const { store, report } = importSnapshot(snapshot, existing);
  if (report.differences.length) throw new Error(`catalog comparison failed:\n${report.differences.join("\n")}`);
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1]?.endsWith("catalog-import.ts")) main().catch(error => { console.error(error); process.exitCode = 1; });
