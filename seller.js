/**
 * AIDI Insight — Seller mode.
 * Detects publish-forms on kv.ee/city24/ss.lv/soov/1a and injects sidebar
 * with autofill, price assistant, live grammar-check, photo gate,
 * multi-portal publish, pre-publish AI review.
 *
 * Loaded by content.js when URL matches SELLER_PATTERNS.
 */

const SELLER_PATTERNS = {
  "kv.ee":     /kv\.ee\/kuulutuse-koostamine|kv\.ee\/lisa/,
  "city24.ee": /city24\.ee\/add-listing|city24\.ee\/publish/,
  "city24.lv": /city24\.lv\/add-listing|city24\.lv\/publish/,
  "ss.lv":     /ss\.(lv|com)\/user\/publish|ss\.(lv|com)\/add/,
  "soov.ee":   /soov\.ee\/lisa|soov\.ee\/publish/,
  "1a.ee":     /1a\.ee\/(add|lisa)/,
};

// Каждый портал имеет свою карту полей (selectors)
const FIELD_MAP = {
  "kv.ee": {
    title:       'input[name="title"], input[name*="pealkiri"]',
    description: 'textarea[name="description"], textarea[name*="kirjeldus"]',
    price:       'input[name="price"], input[name*="hind"]',
    area:        'input[name="area"], input[name*="pindala"]',
    rooms:       'select[name="rooms"], input[name="rooms"]',
    address:     'input[name="address"], input[name*="aadress"]',
  },
  "city24.ee": {
    title:       'input[name="title"], input.listing-title',
    description: 'textarea[name="description"]',
    price:       'input[name="price"]',
    area:        'input[name="area"]',
  },
  "ss.lv": {
    title:       'input[name="title"]',
    description: 'textarea[name="msg"], textarea[name="text"]',
    price:       'input[name="price"], input[name="cena"]',
    area:        'input[name="area"], input[name="platiba"]',
  },
  // Остальные — общие эвристики
};


function isSellerPage(url) {
  for (const [src, pat] of Object.entries(SELLER_PATTERNS)) {
    if (pat.test(url)) return src;
  }
  return null;
}


function detectFormFields(source) {
  const map = FIELD_MAP[source] || FIELD_MAP["kv.ee"];
  const fields = {};
  for (const [key, sel] of Object.entries(map)) {
    const el = document.querySelector(sel);
    if (el) fields[key] = el;
  }
  return fields;
}


// ── Autofill из aidi.ee draft ────────────────────────────────────────
// Draft передаётся через query param ?aidi_draft_id=N или сохранённая в
// chrome.storage.local (когда user на aidi.ee/create нажал «Опубликовать на kv.ee»).

async function fetchDraft(draftId, apiUrl = "https://api.aidi.ee") {
  const r = await fetch(`${apiUrl}/api/drafts/${draftId}`);
  if (!r.ok) throw new Error("draft not found");
  return r.json();
}


function autofillForm(source, draft) {
  const fields = detectFormFields(source);
  let filled = 0;
  if (fields.title && draft.title) {
    fields.title.value = draft.title;
    fields.title.dispatchEvent(new Event("input", { bubbles: true }));
    filled++;
  }
  if (fields.description && draft.description) {
    fields.description.value = draft.description;
    fields.description.dispatchEvent(new Event("input", { bubbles: true }));
    filled++;
  }
  if (fields.price && draft.price_mid) {
    fields.price.value = Math.round(draft.price_mid);
    fields.price.dispatchEvent(new Event("input", { bubbles: true }));
    filled++;
  }
  if (fields.area && draft.area_m2) {
    fields.area.value = draft.area_m2;
    fields.area.dispatchEvent(new Event("input", { bubbles: true }));
    filled++;
  }
  if (fields.rooms && draft.rooms) {
    fields.rooms.value = draft.rooms;
    fields.rooms.dispatchEvent(new Event("change", { bubbles: true }));
    filled++;
  }
  if (fields.address && draft.address) {
    fields.address.value = draft.address;
    fields.address.dispatchEvent(new Event("input", { bubbles: true }));
    filled++;
  }
  return filled;
}


// ── Live grammar/sales check ─────────────────────────────────────────
// Debounced анализ description по мере набора.

let checkTimer = null;
function attachLiveCheck(descTextarea, onSuggestion) {
  if (!descTextarea) return;
  descTextarea.addEventListener("input", () => {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(async () => {
      const text = descTextarea.value;
      if (text.length < 20) return;
      try {
        const r = await fetch("https://api.aidi.ee/api/generate/check-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, kind: "realty" }),
        }).then(r => r.json());
        onSuggestion(r);
      } catch {}
    }, 1500);
  });
}


// ── Photo quality gate ───────────────────────────────────────────────
// Перехватываем file inputs, читаем FileReader → отправляем на quality-check.

function attachPhotoGate(fileInput, onReport) {
  if (!fileInput) return;
  fileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    try {
      const r = await fetch("https://api.aidi.ee/api/generate/photo-quality", {
        method: "POST", body: fd,
      }).then(r => r.json());
      onReport(r);
    } catch {}
  });
}


// ── Multi-portal publish ─────────────────────────────────────────────
// После заполнения одного портала — открывает соседние.

function openMultiPortal(draft, current) {
  const targets = ["kv.ee", "city24.ee", "soov.ee", "1a.ee"].filter(x => x !== current);
  chrome.storage.local.set({ aidi_pending_draft: draft });
  const urls = {
    "kv.ee":     "https://www.kv.ee/kuulutuse-koostamine",
    "city24.ee": "https://www.city24.ee/add-listing",
    "soov.ee":   "https://www.soov.ee/lisa",
    "1a.ee":     "https://www.1a.ee/lisa",
    "ss.lv":     "https://www.ss.lv/user/publish",
    "city24.lv": "https://www.city24.lv/add-listing",
  };
  targets.forEach(t => {
    if (urls[t]) window.open(urls[t] + "?aidi_autofill=1", "_blank");
  });
}


// ── Pre-publish AI review ────────────────────────────────────────────

async function preReview(draft) {
  const r = await fetch("https://api.aidi.ee/api/generate/pre-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  }).then(r => r.json());
  return r;   // {score, exaggerations[], recommendations[]}
}


// ── Seller-mode bootstrap ────────────────────────────────────────────
// Вызывается из content.js когда URL match'ится с SELLER_PATTERNS.
// Читает aidi_draft_id из URL или chrome.storage → fetch draft → autofill.

async function bootstrapSellerMode(source) {
  const params = new URLSearchParams(location.search);
  let draftId = params.get("aidi_draft_id");
  if (!draftId) {
    // Fallback: draft сохранён в extension storage при клике "Опубликовать на kv.ee"
    try {
      const stored = await new Promise(r => chrome.storage.local.get(["aidi_pending_draft_id"], r));
      draftId = stored?.aidi_pending_draft_id;
    } catch {}
  }
  if (!draftId) return;

  let draft;
  try {
    draft = await fetchDraft(draftId);
  } catch (e) {
    _sellerToast(`⚠ AIDI: draft ${draftId} не найден или истёк`);
    return;
  }

  // Форма kv.ee/etc может рендериться SPA-стилем — ждём до 5с появления title-input
  const map = FIELD_MAP[source] || {};
  await _waitForSelector(map.title || 'input[type="text"]', 5000);

  const filled = autofillForm(source, draft);
  _sellerToast(`✓ AIDI: заполнил ${filled} полей из черновика.<br>Проверь и опубликуй.`);

  // Attach live grammar check к description
  const desc = document.querySelector(map.description || 'textarea');
  if (desc) attachLiveCheck(desc, sug => _sellerToast(_formatSuggestions(sug)));

  // Pre-review кнопка — показываем поверх формы
  _addPreReviewButton(draft, source);
}


function _sellerToast(html, ttl = 8000) {
  let el = document.getElementById("aidi-seller-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "aidi-seller-toast";
    el.style.cssText = "position:fixed;top:20px;right:20px;z-index:2147483647;" +
      "background:#171c1c;color:#fff;padding:12px 16px;border-radius:8px;" +
      "font:13px system-ui,-apple-system,sans-serif;max-width:340px;" +
      "box-shadow:0 4px 16px rgba(0,0,0,0.2);line-height:1.4";
    document.body.appendChild(el);
  }
  el.innerHTML = `<div style="font-weight:600;margin-bottom:4px">🤖 AIDI Insight</div>${html}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.remove(), ttl);
}


function _formatSuggestions(sug) {
  if (!sug?.suggestions?.length) return `✓ Score ${sug?.score || "?"}/10 — годно`;
  return sug.suggestions.slice(0, 3).map(s =>
    `${s.type === "warn" ? "⚠️" : "💡"} ${s.message}`
  ).join("<br>");
}


function _waitForSelector(sel, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (document.querySelector(sel)) return resolve(true);
    const start = Date.now();
    const iv = setInterval(() => {
      if (document.querySelector(sel) || Date.now() - start > timeoutMs) {
        clearInterval(iv);
        resolve(!!document.querySelector(sel));
      }
    }, 200);
  });
}


function _addPreReviewButton(draft, source) {
  if (document.getElementById("aidi-prereview-btn")) return;
  const btn = document.createElement("button");
  btn.id = "aidi-prereview-btn";
  btn.textContent = "🤖 AIDI Pre-review перед публикацией";
  btn.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483646;" +
    "padding:12px 20px;background:#007782;color:#fff;border:none;border-radius:8px;" +
    "font:600 13px system-ui,-apple-system,sans-serif;cursor:pointer;" +
    "box-shadow:0 4px 12px rgba(0,119,130,0.4)";
  btn.addEventListener("click", async () => {
    btn.textContent = "⏳ анализируем...";
    btn.disabled = true;
    const map = FIELD_MAP[source] || {};
    const title = document.querySelector(map.title)?.value || draft.title || "";
    const description = document.querySelector(map.description)?.value || draft.description || "";
    const price = parseFloat(document.querySelector(map.price)?.value) || draft.price_mid;
    try {
      const rev = await preReview({title, description, kind: draft.kind || "realty", price, lang: draft.lang || "ru"});
      const items = [];
      items.push(`<b>Score: ${rev.score}/10</b>`);
      if (rev.exaggerations?.length) items.push(`⚠️ Преувеличения:<ul style="margin:4px 0;padding-left:18px">${rev.exaggerations.slice(0,3).map(x => `<li>${x}</li>`).join("")}</ul>`);
      if (rev.missing?.length) items.push(`💡 Добавить:<ul style="margin:4px 0;padding-left:18px">${rev.missing.slice(0,3).map(x => `<li>${x}</li>`).join("")}</ul>`);
      if (rev.recommendations?.length) items.push(`📝 Совет:<ul style="margin:4px 0;padding-left:18px">${rev.recommendations.slice(0,3).map(x => `<li>${x}</li>`).join("")}</ul>`);
      _sellerToast(items.join("<br>"), 20000);
    } catch (e) {
      _sellerToast(`⚠ Pre-review error: ${e.message}`);
    }
    btn.textContent = "🤖 AIDI Pre-review перед публикацией";
    btn.disabled = false;
  });
  document.body.appendChild(btn);
}
