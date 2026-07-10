// Popup logic: tabs, history + brokers + unlock code save.

const API = "https://api.aidi.ee";

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    ["history", "deals", "alerts", "brokers", "sites", "settings"].forEach(id => {
      const el = document.getElementById("tab-" + id);
      if (el) el.hidden = id !== tab.dataset.tab;
    });
    if (tab.dataset.tab === "brokers") loadBrokers();
    if (tab.dataset.tab === "deals") loadDeals();
    if (tab.dataset.tab === "alerts") loadAlerts();
  });
});

// ── History ────────────────────────────────────────────────────────
// Semantic verdict labels — icon (dot) + text, not color-only. Applied
// via .verdict + .v-{code} CSS classes (see popup.css).
const VERDICT_LABEL = {
  good_deal:   "Ниже рынка",
  fair:        "В рынке",
  overpriced:  "Выше рынка",
  underpriced: "Знач. ниже",
  cant_tell:   "Мало данных",
};

let _historyAll = [];

function renderHistory() {
  const list = document.getElementById("history-list");
  const filter = document.getElementById("filter-verdict").value;
  const sort = document.getElementById("sort-by").value;
  let items = _historyAll.slice();

  if (filter) items = items.filter(it => it.verdict === filter);

  items.sort((a, b) => {
    if (sort === "ts_desc") return (b.ts || 0) - (a.ts || 0);
    if (sort === "ts_asc")  return (a.ts || 0) - (b.ts || 0);
    if (sort === "title_asc") return (a.title || "").localeCompare(b.title || "");
    return 0;
  });

  if (items.length === 0) {
    list.innerHTML = `<div class="empty">Нет записей по этому фильтру</div>`;
    return;
  }
  list.innerHTML = items.slice(0, 30).map(it => {
    const code = it.verdict || "cant_tell";
    const label = VERDICT_LABEL[code] || VERDICT_LABEL.cant_tell;
    return `
      <div class="history-item" data-url="${it.url}" role="listitem" tabindex="0">
        <div>
          <span class="verdict v-${code}" aria-label="${label}">
            <span class="verdict-dot" aria-hidden="true"></span>${label}
          </span>
          <span class="h-title">${escapeHtml(it.title || "—")}</span>
        </div>
        <div class="h-url">${escapeHtml(new URL(it.url).hostname)}</div>
      </div>
    `;
  }).join("");
  document.querySelectorAll(".history-item").forEach(el => {
    el.addEventListener("click", () => chrome.tabs.create({ url: el.dataset.url }));
  });
}

chrome.storage.local.get(["aidi_history"], (data) => {
  _historyAll = data.aidi_history || [];
  renderHistory();
});

document.getElementById("filter-verdict")?.addEventListener("change", renderHistory);
document.getElementById("sort-by")?.addEventListener("change", renderHistory);
document.getElementById("export-favorites")?.addEventListener("click", async () => {
  const urls = _historyAll.map(h => h.url).filter(Boolean).join("\n");
  try {
    await navigator.clipboard.writeText(urls);
    const btn = document.getElementById("export-favorites");
    const orig = btn.textContent;
    btn.textContent = `✓ Скопировано ${_historyAll.length} URLs`;
    setTimeout(() => btn.textContent = orig, 2000);
  } catch {
    // Fallback
  }
});

// ── Brokers tab ────────────────────────────────────────────────────
let _brokersLoaded = false;
async function loadBrokers() {
  if (_brokersLoaded) return;
  _brokersLoaded = true;
  const el = document.getElementById("brokers-list");
  try {
    const r = await fetch(`${API}/api/analyze/brokers/top?min_listings=1&limit=15`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!data.brokers?.length) {
      el.innerHTML = `<div class="empty">Данных пока мало — crawler набирает базу</div>`;
      return;
    }
    el.innerHTML = data.brokers.map((b, i) => `
      <div class="history-item" data-slug="${b.broker_slug}" data-source="${b.source}" style="padding:6px 8px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <b>${i + 1}. ${escapeHtml(b.name || b.broker_slug)}</b>
          <span style="font-size:11px;color:#5a6566">${b.source}</span>
        </div>
        <div style="font-size:11px;color:#5a6566;margin-top:2px">
          ${b.total_listings} объявлений
          · avg ${Math.round(b.avg_price_eur / 1000)}k€
          ${b.conversion_rate > 0 ? ` · ${(b.conversion_rate * 100).toFixed(0)}% продано` : ""}
        </div>
      </div>
    `).join("");
    document.querySelectorAll("#brokers-list .history-item").forEach(el => {
      el.addEventListener("click", () => {
        const slug = el.dataset.slug;
        const src = el.dataset.source;
        // Открываем страницу поиска этого брокера на портале
        if (src === "kv.ee") {
          chrome.tabs.create({ url: `https://www.kv.ee/maakler/${slug}` });
        } else if (src === "kinnisvara24.ee") {
          chrome.tabs.create({ url: `https://kinnisvara24.ee/maakler/otsing/${slug}` });
        }
      });
    });
  } catch (e) {
    el.innerHTML = `<div class="empty">Не удалось загрузить: ${e.message}</div>`;
    _brokersLoaded = false;  // retry на next click
  }
}

// ── Deals tab ──────────────────────────────────────────────────────
let _dealsCurrentCountry = "LV";
let _dealsLoadedFor = null;
async function loadDeals(country) {
  const c = country || _dealsCurrentCountry;
  if (_dealsLoadedFor === c) return;
  _dealsLoadedFor = c;
  _dealsCurrentCountry = c;
  document.querySelectorAll(".country-btn").forEach(b => {
    const on = b.dataset.c === c;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const el = document.getElementById("deals-list");
  el.innerHTML = `<div class="empty">Загружаем ${c}...</div>`;
  try {
    const r = await fetch(`${API}/api/market/summary?country=${c}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const parts = [];

    // Realty summary
    if (data.realty?.length) {
      parts.push(`<div style="padding:8px;background:#f6f9f9;border-radius:6px;margin-bottom:8px">
        <b>🏠 Недвижимость LV</b>
        ${data.realty.map(r => `
          <div style="margin-top:4px;font-size:11px;color:#5a6566">
            ${r.source}: ${r.total} объявлений
            ${r.avg_price_per_m2_eur ? `· ${r.avg_price_per_m2_eur.toLocaleString("ru")} €/м² avg` : ""}
          </div>
        `).join("")}
      </div>`);
    }

    // Vehicle by brand
    if (data.vehicles_by_brand?.length) {
      parts.push(`<div style="padding:8px;background:#f6f9f9;border-radius:6px;margin-bottom:8px">
        <b>🚗 Авто по брендам</b>
        ${data.vehicles_by_brand.slice(0, 8).map(v => `
          <div style="margin-top:4px;font-size:11px">
            <b>${escapeHtml(v.brand.toUpperCase())}</b>
            <span style="color:#5a6566">
              ${v.count} шт, ${v.year_range[0]}–${v.year_range[1]}г,
              avg ${Math.round(v.avg_price_eur/1000)}k€
            </span>
          </div>
        `).join("")}
      </div>`);
    }

    // Best realty deals (сверху потому что realty — main product)
    if (data.best_realty_deals?.length) {
      parts.push(`<div style="padding:8px;background:#f5f0fa;border-radius:6px;border:1px solid #6c3bd9;margin-bottom:8px">
        <b style="color:#6c3bd9">🏘 Лучшая недвижимость сейчас</b>
        ${data.best_realty_deals.map(d => `
          <div class="history-item" data-url="${escapeHtml(d.url)}" style="padding:6px 8px;margin-top:4px">
            <div style="font-weight:600;font-size:12px">
              ${escapeHtml(d.title.slice(0, 60))}
            </div>
            <div style="font-size:11px;color:#5a6566;margin-top:2px">
              <b style="color:#0e4b51">${d.price_eur.toLocaleString("ru")} €</b>
              (${d.area_m2}m², ${Math.round(d.ppm2)} €/m²)
              <span style="color:#b04a3a;font-weight:700">${d.delta_pct}%</span>
              vs avg
            </div>
          </div>
        `).join("")}
      </div>`);
    }

    // Best vehicle deals
    if (data.best_vehicle_deals?.length) {
      parts.push(`<div style="padding:8px;background:#e6f3f4;border-radius:6px;border:1px solid #0e4b51">
        <b style="color:#0e4b51">🔥 Лучшие сделки прямо сейчас</b>
        ${data.best_vehicle_deals.map(d => `
          <div class="history-item" data-url="${escapeHtml(d.url)}" style="padding:6px 8px;margin-top:4px">
            <div style="font-weight:600">
              ${escapeHtml(d.brand.toUpperCase())} ${escapeHtml(d.model.toUpperCase())} ${d.year || "?"}
            </div>
            <div style="font-size:11px;color:#5a6566">
              ${d.mileage_km ? `${(d.mileage_km/1000).toFixed(0)}k км · ` : ""}
              <b style="color:#0e4b51">${d.price_eur.toLocaleString("ru")} €</b>
              <span style="color:#b04a3a;font-weight:700">${d.delta_pct}%</span>
              (avg ${d.avg_similar_eur.toLocaleString("ru")} €)
            </div>
          </div>
        `).join("")}
      </div>`);
    }

    el.innerHTML = parts.join("") || `<div class="empty">Нет данных</div>`;
    document.querySelectorAll("#deals-list .history-item").forEach(x => {
      x.addEventListener("click", () => chrome.tabs.create({ url: x.dataset.url }));
    });
  } catch (e) {
    el.innerHTML = `<div class="empty">Не удалось загрузить: ${e.message}</div>`;
    _dealsLoadedFor = null;
  }
}

document.querySelectorAll(".country-btn").forEach(btn => {
  btn.addEventListener("click", () => loadDeals(btn.dataset.c));
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

// ── Alerts / Watchlist ─────────────────────────────────────────────
async function loadAlerts() {
  const stored = await chrome.storage.local.get(["aidi_watchlists"]);
  const list = stored.aidi_watchlists || [];
  const el = document.getElementById("alerts-list");
  if (list.length === 0) {
    el.innerHTML = `<div class="empty">Alerts пусто. Создай ниже.</div>`;
  } else {
    el.innerHTML = list.map((w, i) => `
      <div style="padding:6px 8px;background:#f6f9f9;border-radius:6px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600;font-size:12px">${escapeHtml(w.label || "(no name)")}</div>
          <div style="font-size:10px;color:#5a6566">
            ${w.kind} · ${w.country || ""}
            ${w.seen_uids?.length ? `· ${w.seen_uids.length} видели` : ""}
          </div>
        </div>
        <button data-idx="${i}" class="alert-delete" style="padding:3px 8px;background:#fbe9e5;color:#b04a3a;border:0;border-radius:4px;font-size:11px;cursor:pointer">×</button>
      </div>
    `).join("");
    document.querySelectorAll(".alert-delete").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const removed = list.splice(idx, 1)[0];
        if (removed?.id) {
          try { await fetch(`${API}/api/watchlist/${removed.id}`, { method: "DELETE" }); } catch {}
        }
        await chrome.storage.local.set({ aidi_watchlists: list });
        loadAlerts();
      });
    });
  }

  document.getElementById("alert-kind")?.addEventListener("change", (e) => {
    document.getElementById("realty-fields").hidden = e.target.value !== "realty";
    document.getElementById("vehicle-fields").hidden = e.target.value !== "vehicle";
  });

  document.getElementById("alert-create")?.addEventListener("click", async () => {
    const kind = document.getElementById("alert-kind").value;
    const country = document.getElementById("alert-country").value;
    const label = document.getElementById("alert-label").value.trim();
    const price = parseFloat(document.getElementById("alert-price").value);

    const body = { kind, country, label: label || null };
    if (!isNaN(price)) body.max_price_eur = price;

    if (kind === "realty") {
      const areaMin = parseFloat(document.getElementById("alert-area-min").value);
      const areaMax = parseFloat(document.getElementById("alert-area-max").value);
      const addr = document.getElementById("alert-address").value.trim();
      if (!isNaN(areaMin)) body.min_area_m2 = areaMin;
      if (!isNaN(areaMax)) body.max_area_m2 = areaMax;
      if (addr) body.address_contains = addr;
    } else {
      const brand = document.getElementById("alert-brand").value.trim().toLowerCase();
      const model = document.getElementById("alert-model").value.trim().toLowerCase();
      const year = parseInt(document.getElementById("alert-year").value);
      const mile = parseInt(document.getElementById("alert-mile").value);
      if (brand) body.brand = brand;
      if (model) body.model = model;
      if (!isNaN(year)) body.year_min = year;
      if (!isNaN(mile)) body.max_mileage_km = mile;
    }

    try {
      const r = await fetch(`${API}/api/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      list.push({
        id: data.id, kind, country, label: label || `${kind} alert`,
        seen_uids: [], created_ts: Date.now(),
      });
      await chrome.storage.local.set({ aidi_watchlists: list });
      // Reset form
      ["alert-label", "alert-price", "alert-area-min", "alert-area-max", "alert-address",
       "alert-brand", "alert-model", "alert-year", "alert-mile"].forEach(id => {
        const e = document.getElementById(id); if (e) e.value = "";
      });
      loadAlerts();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  });
}


// ── Settings — unlock code ─────────────────────────────────────────
const input = document.getElementById("unlock-input");
const save = document.getElementById("unlock-save");
const msg = document.getElementById("settings-msg");
chrome.storage.local.get(["aidi_unlock_code"], (d) => {
  if (d.aidi_unlock_code) input.value = d.aidi_unlock_code;
});
save?.addEventListener("click", () => {
  const code = input.value.trim();
  chrome.storage.local.set({ aidi_unlock_code: code }, () => {
    msg.textContent = code ? "✓ Сохранено — работает автоматически" : "Код очищен";
    setTimeout(() => msg.textContent = "", 3000);
  });
});
