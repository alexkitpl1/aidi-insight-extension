# Chrome Web Store — Submission Checklist

## Разовая регистрация
1. https://chrome.google.com/webstore/devconsole/
2. Оплатить **$5 developer fee** (единоразово, не подписка)
3. Верифицировать email

## Загрузить ZIP
- `aidi-insight-0.1.0.zip` из `/Users/alex/AIDI/aidi-insight-0.1.0.zip`
- Или последний release: https://github.com/alexkitpl1/aidi-insight-extension/releases/latest

## Обязательные поля

### Store listing (использует локализованные messages.json автоматически)
- **Category**: Shopping / Productivity
- **Language**: All (extension сам подтягивает en/ru/et/lv)

### Screenshots (нужно 1-5 штук, 1280×800 или 640×400)
Готовые сцены для скринов:
1. Overlay на kv.ee detail-странице (фиолетовый header)
2. Overlay на ss.lv (зелёный header)
3. Popup extension с 3 табами (История · Сайты · Настройки)
4. Полный отчёт unlocked с forensics
5. Landing aidi.ee/insight

### Promo tile (optional, 440×280)
— скриншот overlay на светлом фоне

### Icon 128×128
Уже есть: `icons/128.png`

## Категория и функциональность

- **Category**: Shopping
- **Purpose Statement**: "Помогает покупателям недвижимости в Эстонии и Латвии сверять описания объявлений с реальными фото и получать независимую AI-оценку."

## Privacy Practices Statement (обязательно)

### Do you handle personal or sensitive user data?
NO — extension отправляет только URL текущей вкладки, никаких persons, никаких форм, никаких cookies.

### Data usage disclosure:
- **Location**: No
- **Personally identifiable information**: No
- **Health information**: No
- **Financial and payment information**: No
- **Authentication information**: No
- **Personal communications**: No
- **Web history**: No
- **User activity**: Only current tab URL when user clicks/opens listing on kv.ee/city24/ss.lv
- **Website content**: Only page URL, not content

## Permissions justification

- **storage**: сохранить историю проверок + unlock code
- **activeTab**: определять открытую вкладку для overlay
- **host_permissions api.aidi.ee**: fetch AI-анализ
- **content_scripts** на 6 порталах: только на listing detail-страницах

## Review time
1-3 рабочих дня. Проблемы обычно:
- Missing privacy statement
- Excessive permissions
- Copyright issue (у нас нет — 100% свой код)

## После approval
- Публичный URL: `https://chrome.google.com/webstore/detail/aidi-insight/{ID}`
- Обновить aidi.ee/insight с прямой ссылкой
- Пуш в Telegram каналы EE/LV real estate
