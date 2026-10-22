from __future__ import annotations
import json, time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import requests

BASE = 'https://api.salla.dev/store/v1/products'
STORE_ID = '565229011'
CATEGORIES = {
    'عروض اليوم الوطني': '927921748',
    'بوكسات': '205106012',
    'خشب العود': '1168655920',
    'دهن العود والمسك': '1624010588',
    'البخور': '1396035656',
    'العطور': '898253916',
    'الزعفران واللبان': '1646188624',
    'المرشات': '393569585',
    'المباخر': '1632863282',
    'الاكسسوارات': '1217204232',
}

session = requests.Session()
products = {}
product_categories = {}
category_counts = {}

def fetch_page(url, category_name):
    for attempt in range(3):
        r = session.get(url, timeout=45)
        r.raise_for_status()
        payload = r.json()
        if payload.get('success') is not True:
            raise RuntimeError(f'{category_name}: API error {payload}')
        return payload
    raise RuntimeError(f'failed {url}')

for category_name, category_id in CATEGORIES.items():
    url = f'{BASE}?store_id={STORE_ID}&source=categories&filterable=1&source_value[]={category_id}'
    seen_pages = 0
    count = 0
    while url and seen_pages < 100:
        payload = fetch_page(url, category_name)
        data = payload.get('data') or []
        seen_pages += 1
        count += len(data)
        for item in data:
            pid = str(item.get('id'))
            if not pid or pid == 'None':
                continue
            products[pid] = item
            product_categories.setdefault(pid, []).append({
                'id': category_id,
                'name': category_name,
            })
        url = (payload.get('cursor') or {}).get('next')
        if url:
            time.sleep(.1)
    category_counts[category_name] = {'items_seen': count, 'pages': seen_pages}

collected_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
normalized = []
for pid, p in products.items():
    normalized.append({
        'id': pid,
        'name': p.get('name'),
        'description': p.get('description') or None,
        'url': p.get('url'),
        'image': (p.get('image') or {}).get('url') or p.get('original_image'),
        'originalImage': p.get('original_image'),
        'price': p.get('price'),
        'regularPrice': p.get('regular_price'),
        'salePrice': p.get('sale_price'),
        'currency': p.get('currency'),
        'status': p.get('status'),
        'available': p.get('is_available'),
        'outOfStock': p.get('is_out_of_stock'),
        'hasOptions': p.get('has_options'),
        'weight': p.get('weight'),
        'sku': p.get('sku'),
        'rating': p.get('rating'),
        'categories': product_categories.get(pid, []),
    })
normalized.sort(key=lambda x: (x.get('name') or '').casefold())
out = {
    'schemaVersion': '2.0',
    'brand': 'بدر أباالخيل للعود والعطور والزعفران',
    'officialStore': 'https://baderabalkhail.com',
    'sourceApi': f'{BASE}?store_id={STORE_ID}&source=categories&filterable=1&source_value[]=<category_id>',
    'storeId': STORE_ID,
    'collectedAt': collected_at,
    'collectionMethod': 'Salla public store catalog API with cursor pagination across official category IDs',
    'categoryCounts': category_counts,
    'productCount': len(normalized),
    'products': normalized,
    'rules': [
        'This is a dated snapshot; prices, stock, and promotions must be rechecked against the official product URL before claiming current availability.',
        'Product names, URLs, images, prices, and descriptions are copied only from the official store API response.',
        'The platform is discovery-only; checkout remains on the official store.',
    ],
}
path = Path('/home/ubuntu/baderai/docs/knowledge/bader-official-catalog.json')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
client_products = [{k: p[k] for k in ('id', 'name', 'description', 'url', 'image', 'price', 'regularPrice', 'salePrice', 'currency', 'status', 'available', 'outOfStock', 'weight', 'categories')} for p in normalized]
ts = """export type CatalogProduct = {\n  id: string; name: string; description: string | null; url: string; image: string;\n  price: number | null; regularPrice: number | null; salePrice: number | null; currency: string;\n  status: string | null; available: boolean; outOfStock: boolean; weight: string | null;\n  categories: { id: string; name: string }[];\n};\n\nexport const catalogCollectedAt = %r;\nexport const catalogProductCount = %d;\nexport const catalogProducts: CatalogProduct[] = %s;\n""" % (collected_at, len(normalized), json.dumps(client_products, ensure_ascii=False, indent=2))
Path('/home/ubuntu/baderai/client/src/data/catalog.ts').write_text(ts, encoding='utf-8')
print(json.dumps({'productCount': len(normalized), 'categoryCounts': category_counts, 'path': str(path), 'clientPath': '/home/ubuntu/baderai/client/src/data/catalog.ts'}, ensure_ascii=False, indent=2))
