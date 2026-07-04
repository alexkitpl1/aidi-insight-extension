# AIDI Insight — Chrome Extension

AI-анализ объявлений недвижимости на **kv.ee**, **city24.ee**, **city24.lv**, **ss.lv**, **soov.ee**, **1a.ee**.
Работает для квартир, домов, участков, коммерции и гаражей. Языки: **RU / ET / LV / EN** — авто-детект.

## Что делает

На любой странице объявления:
1. Появляется плавающий бейдж справа `🤖 AIDI Insight`
2. Через 60–120 сек — AI-отчёт:
   - Рыночная оценка vs заявленная цена (delta)
   - Что подтверждается фото
   - На что обратить внимание
   - Что AI заметил, но нет в описании
   - История объекта (Wayback + EHR)
3. Иконка расширения меняется: `$` (ниже рынка), `OK` (в рынке), `!` (выше рынка)

## Загрузить локально

1. Открой `chrome://extensions`
2. Включи **Developer mode** (переключатель справа сверху)
3. Нажми **Load unpacked** → выбери папку `aidi-insight-extension/`
4. Готово — открой любое объявление на kv.ee

## Файлы

```
manifest.json     — MV3 manifest, permissions только для 7 доменов + api.aidi.ee
content.js        — content script, инжектит overlay
overlay.css       — стили плавающего виджета
background.js     — service worker, обновляет badge
popup.html        — popup при клике на иконку в toolbar
icons/            — 16/32/48/128 иконки (положить перед публикацией в CWS)
```

## Иконки

⚠️ Для загрузки локально можно без иконок (Chrome покажет дефолтную).
Для публикации в Chrome Web Store — нужны 16/32/48/128 PNG в `icons/`.

## Backend

Использует публичный API `https://api.aidi.ee`:
- `POST /api/analyze/listing` → task_id
- `GET  /api/analyze/status/{task_id}` — polling

Никаких user credentials — работает анонимно. `unlock_code` — опционально для расширенного отчёта.

## Публикация в Chrome Web Store

1. Собрать zip: `cd aidi-insight-extension && zip -r ../aidi-insight-0.1.0.zip . -x '*.DS_Store'`
2. Зарегистрироваться в [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) ($5 регистрационный сбор)
3. Upload zip, заполнить description (RU/ET/LV/EN), скриншоты (1280×800), promo tile
4. Review обычно 1–3 дня

## Приватность

Расширение отправляет только URL текущей страницы объявления на `api.aidi.ee`.
Никаких personal data, cookies, form contents. Всё содержимое overlay доступно только пользователю.
