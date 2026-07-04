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


export function isSellerPage(url) {
  for (const [src, pat] of Object.entries(SELLER_PATTERNS)) {
    if (pat.test(url)) return src;
  }
  return null;
}


export function detectFormFields(source) {
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

export async function fetchDraft(draftId, apiUrl = "https://api.aidi.ee") {
  const r = await fetch(`${apiUrl}/api/drafts/${draftId}`);
  if (!r.ok) throw new Error("draft not found");
  return r.json();
}


export function autofillForm(source, draft) {
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
export function attachLiveCheck(descTextarea, onSuggestion) {
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

export function attachPhotoGate(fileInput, onReport) {
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

export function openMultiPortal(draft, current) {
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

export async function preReview(draft) {
  const r = await fetch("https://api.aidi.ee/api/generate/pre-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  }).then(r => r.json());
  return r;   // {score, exaggerations[], recommendations[]}
}
