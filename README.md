# A+ Works

پایگاه مشترک پروژه و دانش برای کارهای حسین و اشکان؛ مناسب استقرار مستقیم روی **Cloudflare Pages**.

## امکانات

- رابط Neomorphism و زبان پیش‌فرض آلمانی
- سوییچ آلمانی / فارسی
- پرونده جدا برای هر شرکت یا مشتری
- پروژه‌ها و خدمات زیرمجموعه هر پرونده
- لینک، وضعیت و درصد پیشرفت برای هر پروژه
- تعریف تسک جدید برای هر پروژه
- تیک انجام‌شدن تسک
- کامنت برای هر تسک
- پاسخ به کامنت
- جستجو و فیلتر مشتری‌ها و پروژه‌ها
- انتخاب نویسنده فعال بین Hossein و Ashkan
- ذخیره مشترک با Cloudflare D1
- حالت جایگزین localStorage تا قبل از اتصال دیتابیس

## ساختار داده

```text
Account / Kundenakte
  └── Project / Service
        └── Task
              └── Comment
                    └── Reply
```

## استقرار روی Cloudflare Pages

### 1. اتصال GitHub

در Cloudflare Dashboard:

1. وارد **Workers & Pages** شو.
2. گزینه **Create application → Pages → Connect to Git** را بزن.
3. ریپوی `hsdarestani/works` را انتخاب کن.
4. Framework preset را روی **None** بگذار.
5. Build command را خالی بگذار.
6. Build output directory را `.` بگذار.
7. Deploy کن.

در این مرحله رابط کار می‌کند، ولی تا قبل از اتصال D1 داده‌ها فقط در مرورگر همان کاربر ذخیره می‌شوند.

### 2. ساخت دیتابیس D1

1. در Cloudflare وارد **Workers & Pages → D1 SQL Database** شو.
2. یک دیتابیس با نامی مثل `a-plus-works` بساز.
3. فایل `schema.sql` این ریپو را در Console دیتابیس اجرا کن.

### 3. اتصال D1 به Pages

در پروژه Pages:

1. وارد **Settings → Functions → D1 database bindings** شو.
2. Variable name را دقیقاً `DB` بگذار.
3. دیتابیس `a-plus-works` را انتخاب کن.
4. یک Deploy جدید اجرا کن.

### 4. گذاشتن رمز ورود

برای اینکه داده‌ها عمومی نباشند:

1. وارد **Settings → Environment variables** شو.
2. متغیر `APP_PASSWORD` را تعریف کن.
3. یک رمز قوی به آن بده.
4. دوباره Deploy کن.

رمز در `sessionStorage` مرورگر نگهداری می‌شود و بعد از بسته‌شدن Session دوباره درخواست می‌شود.

برای امنیت بیشتر، می‌توان کل دامنه را نیز با **Cloudflare Access** محافظت کرد.

## اجرای محلی

بدون Cloudflare، کافی است فایل‌ها را با یک static server اجرا کنی. سیستم به‌صورت خودکار وارد حالت localStorage می‌شود.

مثلاً:

```bash
python -m http.server 8080
```

سپس:

```text
http://localhost:8080
```

برای تست کامل Functions و D1 از Wrangler استفاده کن و تنظیمات `wrangler.example.toml` را کامل کن.

## فایل‌های مهم

- `index.html` — ساختار رابط
- `styles.css` — طراحی Neomorphism و responsive
- `app.js` — رابط، فیلترها، تسک‌ها، کامنت‌ها و حالت localStorage
- `functions/api/[[path]].js` — API مربوط به Cloudflare Pages Functions
- `schema.sql` — ساخت جداول و داده‌های اولیه
- `wrangler.example.toml` — نمونه تنظیمات Wrangler

## لینک پروژه‌ها

لینک‌هایی که در اطلاعات اولیه مشخص بودند اضافه شده‌اند؛ از جمله:

- A+ Solution
- A+ Esthetic
- A+ 3D V1 / V2
- Blitz Entrümpelung
- Schönbau
- Atlas / CityBeach / Eintracht / Football demos

برای پروژه‌هایی که URL دقیقشان مشخص نبود، لینک خالی گذاشته شده است. از داخل پنل پروژه می‌توان URL را ثبت یا ویرایش کرد.
