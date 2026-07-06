# Chrome Web Store Submission Checklist — v0.2.0

Как залить extension в Chrome Web Store. Требует ~1 час активной работы + 3-7 дней review.

## Prerequisites

- [ ] $5 registration fee уплачен (одноразово, для всех твоих extensions навсегда)
- [ ] Google account с включённым 2FA (обязательно с 2024)
- [ ] Zip файл: `/Users/alex/AIDI/aidi-insight-0.2.0.zip` (32КБ)

## Step 1: Открыть Developer Console

https://chrome.google.com/webstore/devconsole/

Первый вход попросит $5 через Google Pay. **Одноразово**.

## Step 2: New Item → Upload

1. Кнопка **"+ New Item"** в правом верхнем
2. Upload → выбрать `aidi-insight-0.2.0.zip`
3. Дождаться upload и первичной валидации (~30с)

## Step 3: Заполнить листинг

### Store Listing
- **Name**: `AIDI Insight — Real Estate Analyzer for Baltic Portals`
- **Short description** (132 chars max):
  `AI-powered real estate analyzer. Overlays fair-price verdict, EHR building data, and forensics on kv.ee, city24, ss.lv listings.`
- **Detailed description**: (см. секцию ниже — 2000+ chars)
- **Category**: `Productivity` или `Shopping`
- **Language**: English (primary), добавить дополнительно RU/ET/LV если хочешь multilanguage listing

### Screenshots (1280×800 или 640×400)
Все 5 уже готовы в `cws-screenshots/`:
- `01-overlay-buy-side.png` — оверлей на kv.ee listing detail
- `02-verdict-detail.png` — detailed verdict + forensics
- `03-history-popup.png` — extension popup
- `04-seller-autofill.png` — новый для 0.2.0, надо сделать (см. ниже)
- `05-forensics-ehr.png` — новый для 0.2.0, надо сделать

**Для 0.2.0 добавь 2 новых screenshot'а:**
```bash
# Автоматически через playwright:
source ~/welltech/venv/bin/activate
python3 << 'PYEOF'
from playwright.sync_api import sync_playwright
import time
ext = "/Users/alex/AIDI/aidi-insight-extension"
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir="/tmp/cws-shots", headless=False,
        args=[f"--disable-extensions-except={ext}", f"--load-extension={ext}"],
        viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    # Screenshot 04: seller autofill (fake page)
    page.route("**/kuulutuse-koostamine*", lambda r: r.fulfill(
        status=200, content_type="text/html", body="""<html><body style="padding:40px">
        <h1>Kuulutuse koostamine — kv.ee</h1>
        <form><label>Pealkiri: <input name="title" style="width:400px" /></label><br/>
        <label>Kirjeldus: <textarea name="description" cols=50 rows=8></textarea></label><br/>
        <label>Hind: <input name="price" type="number" /></label>
        <label>Pindala m²: <input name="area" type="number" /></label>
        <label>Toad: <input name="rooms" type="number" /></label>
        <label>Aadress: <input name="address" style="width:400px" /></label>
        </form></body></html>"""))
    page.goto("https://www.kv.ee/kuulutuse-koostamine?aidi_draft_id=25c6b1e8edef", timeout=30000)
    time.sleep(4)
    page.screenshot(path=f"{ext}/cws-screenshots/04-seller-autofill.png", full_page=False)
    # Screenshot 05: buy side rural with forensics
    page.goto("https://www.kv.ee/looduslahedases-saaremaal-on-muuki-tulnud-reheelam-3800894.html", timeout=30000)
    time.sleep(35)
    page.screenshot(path=f"{ext}/cws-screenshots/05-forensics-ehr.png", full_page=False)
    ctx.close()
PYEOF
```

### Store Icon (128×128)
Уже есть `icons/128.png` ✓

### Privacy Practices

- [ ] Заполнить Single Purpose: `Analyze real estate listings on Baltic portals to help buyers detect overpricing and see hidden information (building age, historical prices).`
- [ ] Permissions justification для каждой:
  - `storage` — Save history of analyzed listings and unlock code
  - `activeTab` — Only used to detect page URL for pattern matching (no reading page content beyond declared host permissions)
  - `host: api.aidi.ee` — Backend API endpoint for AI analysis

### Data Usage
- [ ] "Personal identifiable information" — No
- [ ] "Health information" — No  
- [ ] "Financial information" — No
- [ ] "Authentication information" — No
- [ ] "Personal communications" — No
- [ ] "Location" — No (extension uses address from listing page, not user's GPS)
- [ ] "Web history" — No
- [ ] "User activity" — No
- [ ] "Website content" — Yes ("для анализа объявления, никаких других данных не собираем")

## Step 4: Detailed Description (paste в forms)

```
AIDI Insight — независимый AI-анализатор объявлений о недвижимости на балтийских порталах.

ПОДДЕРЖИВАЕМЫЕ САЙТЫ:
🇪🇪 kv.ee, city24.ee, soov.ee, 1a.ee, kinnisvara24.ee
🇱🇻 city24.lv, ss.lv, varianti.lv

ЧТО ДЕЛАЕТ (на странице объявления):
🎯 Verdict: 🟢 Ниже рынка / 🟡 В рынке / 🔴 Выше рынка / ⚠️ Значительно ниже (подозрительно)
📊 Оценка справедливой цены на основе рыночных данных
🔬 Forensics — «интернет помнит всё»:
   • Год постройки по EHR (Estonian building register)
   • Wayback price history (когда доступно)
   • Warnings: довоенное здание, панельный дом, обшивка старой коробки
📍 POI enrichment: транспорт, магазины, школы поблизости
🔍 Cross-portal search: этот объект дешевле на другом сайте?

SELLER-MODE (бонус):
- Автозаполнение форм публикации на kv.ee/city24/ss.lv
- Live grammar-check
- Pre-review AI перед публикацией

БЕСПЛАТНО для первых пользователей — free-tier tier=unlocked без запроса unlock-кода.

ОТКРЫТЫЙ КОД:
https://github.com/alexkitpl1/aidi-insight-extension

СВЯЗЬ:
https://aidi.ee/honest
alexkitpl@gmail.com
```

## Step 5: Testing tab

- [ ] Скачать zip, установить через Load unpacked, сделать финальный smoke-test
- [ ] Проверить все 5 screenshot'ов открываются на реальных страницах

## Step 6: Submit for Review

Кнопка **"Submit for Review"** в правом верхнем.

⏱ **Ожидание**: 3-7 рабочих дней. Иногда 1-2 дня если продукт простой.

## Step 7: После аппрува

- [ ] Обновить `manifest.json.homepage_url` на https://chrome.google.com/webstore/detail/aidi-insight/<ACTUAL_ID>
- [ ] Обновить `CWS_SUBMISSION.md` — заменить `{ID}` на реальный
- [ ] Опубликовать в Reddit r/estonia, r/latvia (draft поста в `_marketing/reddit-launch.md`)
- [ ] Обновить `aidi.ee/honest` landing с CWS-linkом

## Что делать если reject

Обычные причины:
- **Excessive permissions**: наш minimal (storage, activeTab, api.aidi.ee) — не должно
- **Missing screenshots**: сделать 5 shots как выше
- **Privacy policy**: указать `https://aidi.ee/privacy` в metadata
- **Language mismatch**: EN primary — не переключаться на RU в одном field

Если reject — CWS присылает email с причиной. Fix → resubmit → снова 3-7 дней review.

## Файлы для submission (готовы)

```
/Users/alex/AIDI/aidi-insight-0.2.0.zip     — 32602 bytes, обновлённая версия
/Users/alex/AIDI/aidi-insight-extension/
  ├── manifest.json                          — version 0.2.0
  ├── CWS_SUBMISSION.md                       — существующий mockup metadata
  ├── cws-screenshots/                        — 5 PNG (нужно доделать 04+05)
  ├── _locales/en/messages.json               — EN name+desc
  └── icons/128.png                           — store icon
```
