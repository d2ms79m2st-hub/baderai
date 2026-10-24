# مخطط بيانات الكتالوج وخطة الترحيل

## نطاق هذه المرحلة

هذا المستند تصميم أولي فقط. لم تُنشأ جداول جديدة ولم تُطبّق أي ترحيلات على مشروع `baderai-auth`. يبقى ملف الكتالوج الرسمي الحالي هو مصدر العرض حتى ينجح اختبار التطابق وتوجد آلية تراجع واضحة.

## المصدر الحالي المثبت

المصدر الحالي هو لقطة من واجهة Salla العامة، وتُحدّث عبر:

- `scripts/sync-bader-catalog.py`
- `docs/knowledge/bader-official-catalog.json`
- `client/src/data/catalog.ts`

اللقطة التي تمت مراجعتها تحتوي على 73 منتجًا و10 تصنيفات و118 عضوية تصنيف. الحقول الفعلية هي:

- هوية المنتج: `id`، `sku`.
- العرض: `name`، `description`، `url`.
- الأسعار: `price`، `regularPrice`، `salePrice`، `currency`.
- الحالة: `status`، `available`، `outOfStock`، `hasOptions`.
- الشحن/العرض: `weight`.
- الوسائط: `image`، `originalImage`.
- بيانات إضافية مصدرية: `rating`.
- العلاقات: قائمة `categories`، وكل عنصر فيها `id` و`name`.
- بيانات اللقطة: `schemaVersion`، `collectedAt`، `sourceApi`، `storeId`، و`categoryCounts`.

المصدر لقطة زمنية، ولذلك لا يجوز اعتبار السعر أو التوفر الحاليين حقيقة دائمة. يجب إبقاء رابط المتجر الرسمي وتاريخ آخر تحقق مع كل سجل مستورد.

## المخطط المقترح للمرحلة الأولى

### `catalog_products`

- `id text primary key`: معرّف المنتج من المصدر الرسمي، ويُحفظ كنص لأن المصدر الحالي يعرضه كنص.
- `name text not null`
- `sku text null`
- `description text null`
- `official_url text not null`
- `status text null`
- `currency text not null default 'SAR'`
- `weight text null`: يُحفظ كنص في البداية لأن المصدر الحالي لا يضمن وحدة رقمية موحدة.
- `has_options boolean not null default false`
- `rating numeric(4,2) null`
- `available boolean not null default false`
- `out_of_stock boolean not null default false`
- `source_store_id text not null`
- `source_collected_at timestamptz not null`
- `source_updated_at timestamptz null`: يُملأ فقط إن وفره المصدر مستقبلًا.
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `source_payload jsonb not null default '{}'::jsonb`: نسخة من الحقول المصدرية غير المطبّعة حتى لا تضيع حقول مستقبلية أثناء الترحيل.

قيود مقترحة: `currency` من العملات المدعومة، وعدم السماح بأن يكون المنتج متاحًا ونافدًا في الوقت نفسه. لا تُفرض قاعدة `salePrice < regularPrice` على مستوى قاعدة البيانات قبل حسم سلوك المصدر للخصومات.

### `catalog_product_prices`

سجل زمني للأسعار بدل الكتابة فوق السعر السابق:

- `id bigint generated always as identity primary key`
- `product_id text not null references catalog_products(id)`
- `price numeric(12,2) null`
- `regular_price numeric(12,2) null`
- `sale_price numeric(12,2) null`
- `currency text not null`
- `observed_at timestamptz not null`
- `source text not null default 'salla_public_catalog_snapshot'`
- `is_current boolean not null default true`

يُضاف فهرس مركب لاحقًا على `(product_id, observed_at desc)` إذا أثبتت الاستعلامات الحاجة إليه. لا يُنشأ الآن في الإنتاج.

### `catalog_categories`

- `id text primary key`: معرّف التصنيف من المصدر.
- `name text not null`
- `source_store_id text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `catalog_product_categories`

- `product_id text not null references catalog_products(id) on delete cascade`
- `category_id text not null references catalog_categories(id) on delete restrict`
- `observed_at timestamptz not null`
- primary key `(product_id, category_id)`

### `catalog_product_images`

- `id bigint generated always as identity primary key`
- `product_id text not null references catalog_products(id) on delete cascade`
- `url text not null`
- `original_url text null`
- `kind text not null default 'primary'`
- `sort_order smallint not null default 0`
- `is_current boolean not null default true`
- `observed_at timestamptz not null`

لا تُنقل الصور إلى Supabase Storage في هذه المرحلة؛ الروابط الحالية خارجية ومستخدمة فعليًا. يُحفظ `originalImage` داخل سجل الصورة، ويُبحث في التخزين الداخلي فقط بعد تحديد الحاجة وقياس الحجم والحقوق ومصدر النسخ الأصلية.

## مطابقة الحقول

كل حقل في `CatalogProduct` الحالي يملك وجهة في التصميم: `id` إلى المفتاح الأساسي، `name` و`description` و`url` إلى حقول المنتج، حقول الأسعار إلى سجل الأسعار، `currency` و`status` و`available` و`outOfStock` و`weight` و`hasOptions` إلى المنتج، و`categories` إلى جدول التصنيفات والعلاقة. الحقول الموجودة في JSON الرسمي ولا تظهر في نوع الواجهة، وهي `sku` و`rating` و`originalImage`، محفوظة صراحة في التصميم. أما `collectedAt` و`sourceApi` و`storeId` فمحفوظة في حقول المصدر، وتُحفظ الحمولة الكاملة في `source_payload` كحماية من فقدان حقول مستقبلية.

## ما يؤجل

لا تُنشأ الآن جداول السلة أو الطلبات أو الدفع أو الشحن أو المخزون التشغيلي. التوفر الحالي هو snapshot من المصدر وليس مخزونًا قابلًا للحجز. إنشاء مخزون حقيقي قبل تحديد مصدر الحقيقة وعمليات البيع سيؤدي إلى تضارب بين Bader AI والمتجر الرسمي.

## خطة الترحيل الآمنة

1. **تجميد عقد المصدر:** تشغيل اختبار بنية الكتالوج والتأكد من وجود معرّف فريد ورابط وصورة وحقول سعر متوافقة.
2. **تطبيع خارج الإنتاج:** تحويل JSON إلى صفوف staging محلية، مع الاحتفاظ باللقطة الأصلية و`collectedAt`.
3. **اختبار التطابق:** مقارنة عدد المنتجات، المعرّفات، الأسماء، الروابط، الصور، الأسعار، الحالة والتصنيفات. يمنع الاختبار النشر إذا وُجدت فروق غير مفسرة.
4. **ترحيل قابل للعكس:** إنشاء جداول الكتالوج فقط عبر migration منفصل، من دون حذف أو إعادة تسمية الجداول الحالية.
5. **تحميل تجريبي منفصل:** إدخال snapshot في مساحة staging أو مشروع غير إنتاجي إن توفر؛ لا يوجد حاليًا مشروع ثانٍ مفوض لذلك.
6. **قراءة مزدوجة:** إبقاء الواجهة تقرأ من الملفات الحالية، وتشغيل مقارنة قراءة من قاعدة البيانات دون تحويل المصدر.
7. **تحويل تدريجي:** بعد نجاح المقارنة في أكثر من لقطة، تُفعّل قراءة قاعدة البيانات خلف مفتاح إعداد يمكن تعطيله، مع إبقاء ملفات اللقطة كخطة رجوع.
8. **الترقية اللاحقة:** إضافة إدارة الأسعار والمخزون من لوحة موثوقة فقط بعد تحديد من يملك صلاحية التعديل ومصدر الحقيقة.

أداة الاستيراد التجريبية موجودة في `scripts/catalog-import.ts`. وهي تكتب مخزن JSON محليًا فقط، وتستخدم مفاتيح ثابتة للمنتج والتصنيف والعلاقة والصورة ولقطة السعر. يمكن تشغيلها مثلًا بالأمر التالي، مع إبقاء المسارات المؤقتة خارج المستودع:

```bash
pnpm catalog:import -- \
  --source client/src/data/bader-official-catalog.json \
  --store /tmp/bader-catalog-store.json \
  --report /tmp/bader-catalog-report.json
```

التقرير الملتزم في المستودع يثبت آخر تشغيل على اللقطة الحالية: `docs/architecture/catalog-import-report.json`. لا يحتوي المستودع على مخزن مستورد تشغيلي، ولم يتصل المستورد بقاعدة Supabase.

## صلاحيات RLS المقترحة لاحقًا

- القراءة العامة للمنتجات المنشورة فقط، إذا كان ذلك مطلوبًا للمتجر.
- الكتابة والتحديث للمدير عبر دالة موثوقة مثل `private.is_admin()`.
- لا تُستخدم بيانات المستخدم أو سجل المحادثات لتحديد صلاحية تعديل الكتالوج.
- لا يُسمح للعميل بتغيير `role` أو حقول المصدر أو الأسعار مباشرة.

هذه الصلاحيات لا تُطبّق في هذه المرحلة لأن الجداول نفسها لم تُنشأ.
