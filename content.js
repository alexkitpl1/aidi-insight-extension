/**
 * AIDI Insight — content script.
 * Runs on every kv.ee / city24 / ss.lv page.
 * Detects if current page is a listing detail — injects overlay widget.
 */

(() => {
  if (window.__aidiInsightInjected) return;
  window.__aidiInsightInjected = true;

  const API = "https://api.aidi.ee";

  // ── Site profiles ─────────────────────────────────────────────────
  // Каждый сайт: pattern детекции detail-страницы + branding overlay
  // (accent-цвет из фирменной палитры сайта) + label + country.
  const SITE_PROFILES = {
    "kv.ee": {
      match: /kv\.ee\/[a-z0-9\-]+-\d{6,}\.html/,
      accent: "#6c3bd9",  // фиолетовый kv.ee
      label: "kv.ee",
      country: "EE",
      icon: "🇪🇪",
    },
    "city24.ee": {
      match: /city24\.ee\/real-estate\/[^\/]+\/[^\/]+\/\d+/,
      accent: "#004b9f",  // синий city24
      label: "city24.ee",
      country: "EE",
      icon: "🇪🇪",
    },
    "city24.lv": {
      match: /city24\.lv\/real-estate\/[^\/]+\/[^\/]+\/\d+/,
      accent: "#004b9f",
      label: "city24.lv",
      country: "LV",
      icon: "🇱🇻",
    },
    "ss.lv": {
      match: /ss\.(lv|com)\/msg\/[a-z]+\/[a-z0-9\-]+\/[a-z0-9\-]+\/[a-z0-9\-]+\/[a-z0-9\-]+\.html/,
      accent: "#4a8f2f",  // зелёный ss.lv
      label: "ss.lv",
      country: "LV",
      icon: "🇱🇻",
    },
    "soov.ee": {
      match: /soov\.ee\/kuulutused\/\d+/,
      accent: "#e37b32",
      label: "soov.ee",
      country: "EE",
      icon: "🇪🇪",
    },
    "1a.ee": {
      match: /1a\.ee\/kinnisvara\/\d+/,
      accent: "#c62828",
      label: "1a.ee",
      country: "EE",
      icon: "🇪🇪",
    },
  };

  const url = location.href;
  let source = null;
  let profile = null;
  for (const [key, prof] of Object.entries(SITE_PROFILES)) {
    if (prof.match.test(url)) {
      source = key;
      profile = prof;
      break;
    }
  }
  if (!source) return;  // не detail-страница — не показываем ничего

  // ── Language detection ────────────────────────────────────────────
  function detectLang() {
    const html = document.documentElement.lang || "";
    if (html.startsWith("ru")) return "ru";
    if (html.startsWith("et")) return "et";
    if (html.startsWith("lv")) return "lv";
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    if (["ru", "et", "lv"].includes(nav)) return nav;
    if (url.includes("/est/") || url.includes(".ee/")) return "et";
    if (url.includes(".lv/")) return "lv";
    if (url.includes("/rus/")) return "ru";
    return "en";
  }
  const lang = detectLang();

  const T = {
    ru: {
      brand: "AIDI Insight", checking: "Смотрим объект", secs: "с",
      fair: "Оценка", ask: "Заявлено", delta: "Разница",
      confirmed: "Подтверждено", warn: "Обратить внимание", hidden: "Замечено AI",
      unlock: "Открыть полный отчёт", openWeb: "Открыть в aidi.ee",
      unlockPh: "Код (опционально)",
      verdicts: { good_deal: "🟢 Ниже средней", fair: "🟡 В рынке", overpriced: "🔴 Выше рынка", underpriced: "⚠️ Значительно ниже", cant_tell: "❔ Мало данных" },
    },
    et: {
      brand: "AIDI Insight", checking: "Vaatame objekti", secs: "s",
      fair: "Hinnang", ask: "Küsitakse", delta: "Erinevus",
      confirmed: "Kinnitatud", warn: "Pane tähele", hidden: "AI märkas",
      unlock: "Ava täisülevaade", openWeb: "Ava aidi.ee-s",
      unlockPh: "Kood (valikuline)",
      verdicts: { good_deal: "🟢 Alla turu", fair: "🟡 Turul", overpriced: "🔴 Üle turu", underpriced: "⚠️ Oluliselt madalam", cant_tell: "❔ Andmeid vähe" },
    },
    lv: {
      brand: "AIDI Insight", checking: "Skatām objektu", secs: "s",
      fair: "Vērtējums", ask: "Prasa", delta: "Atšķirība",
      confirmed: "Apstiprināts", warn: "Pievērst uzmanību", hidden: "AI pamanīja",
      unlock: "Atvērt pilnu pārskatu", openWeb: "Atvērt aidi.ee",
      unlockPh: "Kods (izvēles)",
      verdicts: { good_deal: "🟢 Zem tirgus", fair: "🟡 Tirgū", overpriced: "🔴 Virs tirgus", underpriced: "⚠️ Būtiski zemāk", cant_tell: "❔ Datu par maz" },
    },
    en: {
      brand: "AIDI Insight", checking: "Analyzing", secs: "s",
      fair: "Estimate", ask: "Asking", delta: "Delta",
      confirmed: "Confirmed", warn: "Consider", hidden: "AI noticed",
      unlock: "Open full report", openWeb: "Open on aidi.ee",
      unlockPh: "Code (optional)",
      verdicts: { good_deal: "🟢 Below market", fair: "🟡 On market", overpriced: "🔴 Above market", underpriced: "⚠️ Significantly lower", cant_tell: "❔ Not enough data" },
    },
  };
  const t = T[lang] || T.en;

  // ── Overlay UI (site-adaptive branding) ───────────────────────────
  const el = document.createElement("div");
  el.id = "aidi-insight-overlay";
  el.setAttribute("data-source", source);
  // Динамический accent-цвет header'а из profile
  el.style.setProperty("--aidi-accent", profile.accent);
  el.innerHTML = `
    <div class="aidi-header" style="background: linear-gradient(135deg, ${profile.accent} 0%, ${shade(profile.accent, -18)} 100%);">
      <span class="aidi-brand">🤖 ${t.brand}</span>
      <span class="aidi-site" title="${profile.label}">${profile.icon} ${profile.label}</span>
      <button class="aidi-close" title="Close">×</button>
    </div>
    <div class="aidi-body">
      <div class="aidi-status">${t.checking}…</div>
    </div>
  `;
  document.body.appendChild(el);

  function shade(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(255 * percent / 100)));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100)));
    const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(255 * percent / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }
  el.querySelector(".aidi-close").addEventListener("click", () => el.remove());

  const body = el.querySelector(".aidi-body");

  function renderStatus(text) {
    body.innerHTML = `<div class="aidi-status">${text}</div>`;
  }

  function fmt(n) { try { return Math.round(n).toLocaleString(lang === "ru" ? "ru" : "en") + " €"; } catch { return n + " €"; } }

  async function findOnOtherPortals(listing) {
    if (!listing?.address || listing.address.length < 6) return null;
    try {
      const params = new URLSearchParams({ address: listing.address });
      if (listing.area_m2) params.set("area_m2", String(listing.area_m2));
      if (listing.rooms) params.set("rooms", String(listing.rooms));
      params.set("current_url", url);
      const r = await fetch(`${API}/api/analyze/cross-portal?${params}`);
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  function renderReport(r) {
    const verdict = t.verdicts[r.verdict] || r.verdict;
    const deltaTxt = (r.price_delta * 100).toFixed(0) + "%";
    const deltaCol = r.price_delta > 0.1 ? "#b04a3a" : r.price_delta < -0.1 ? "#0e4b51" : "#5a6566";

    let sections = "";
    if (r.confirmed?.length) {
      sections += `<div class="aidi-sec"><b>✅ ${t.confirmed}</b><ul>${r.confirmed.slice(0, 3).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`;
    }
    if (r.exaggerated?.length) {
      sections += `<div class="aidi-sec aidi-warn"><b>⚠️ ${t.warn}</b><ul>${r.exaggerated.slice(0, 3).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`;
    }
    if (r.hidden?.length) {
      sections += `<div class="aidi-sec aidi-hidden"><b>🕵 ${t.hidden}</b><ul>${r.hidden.slice(0, 3).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`;
    }
    if (r.forensics?.reconstructed_facade_warning) {
      sections += `<div class="aidi-sec aidi-facade">⚠️ ${r.forensics.notes?.[0] || "Fassaad kaetud"}</div>`;
    }

    body.innerHTML = `
      <div class="aidi-verdict">${verdict}</div>
      <div class="aidi-prices">
        <div><span>${t.fair}</span><b>${fmt(r.fair_price_median)}</b></div>
        ${r.listing?.asking_price ? `<div><span>${t.ask}</span><b>${fmt(r.listing.asking_price)}</b></div>` : ""}
        <div><span>${t.delta}</span><b style="color:${deltaCol}">${deltaTxt}</b></div>
      </div>
      ${sections}
      ${r.tier === "basic" ? `
        <div class="aidi-unlock">
          <input id="aidi-unlock-input" placeholder="${t.unlockPh}" />
          <button id="aidi-unlock-btn">🔓 ${t.unlock}</button>
        </div>` : ""}
      <a class="aidi-open" href="https://aidi.ee/honest?url=${encodeURIComponent(url)}" target="_blank">${t.openWeb} →</a>
    `;

    if (r.tier === "basic") {
      el.querySelector("#aidi-unlock-btn").addEventListener("click", () => {
        const code = el.querySelector("#aidi-unlock-input").value.trim();
        if (code) analyze(code);
      });
    }

    // Cross-portal — ищем ту же квартиру на других сайтах
    findOnOtherPortals(r.listing).then(cp => {
      if (!cp || !cp.matches || cp.matches.length === 0) return;
      const cheapest = cp.savings ? cp.savings.min_price : null;
      const savingLine = cp.savings && cp.savings.delta_eur > 500
        ? `<div style="background:#e6f3f4;padding:6px 8px;border-radius:6px;font-size:12px;color:#0e4b51;margin-bottom:6px">
             💡 Дешевле на ${Math.round(cp.savings.delta_eur).toLocaleString("ru")} € (${cp.savings.delta_pct.toFixed(0)}%)
           </div>` : "";
      const items = cp.matches.slice(0, 4).map(m => {
        const price = m.asking_price ? Math.round(m.asking_price).toLocaleString("ru") + " €" : "";
        const badge = cheapest && m.asking_price === cheapest ? " 🏷" : "";
        return `<div style="padding:6px 0;border-top:1px solid #eef1f1;font-size:12px">
          <a href="${escapeHtml(m.url)}" target="_blank" style="color:#007782;font-weight:600">
            ${escapeHtml(m.source)}${badge}
          </a>
          <div style="color:#5a6566">${escapeHtml(m.title.slice(0,50))}</div>
          <div style="color:#171c1c;font-weight:700">${price}</div>
        </div>`;
      }).join("");
      const wrapper = document.createElement("div");
      wrapper.className = "aidi-sec";
      wrapper.style.borderLeft = "3px solid #007782";
      wrapper.innerHTML = `<b>🔍 На других сайтах (${cp.matches.length})</b>${savingLine}${items}`;
      body.appendChild(wrapper);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ── API flow ──────────────────────────────────────────────────────
  async function analyze(unlockCode) {
    renderStatus(`${t.checking}…`);
    try {
      // Extension отдаёт HTML страницы — backend не может fetch kv.ee (Datadome).
      const html_snapshot = document.documentElement.outerHTML.slice(0, 500_000);
      const start = await fetch(`${API}/api/analyze/listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, unlock_code: unlockCode || undefined, lang, html_snapshot }),
      }).then(r => r.json());
      if (!start.task_id) throw new Error("no task");
      const t0 = Date.now();
      while (Date.now() - t0 < 240_000) {
        await new Promise(r => setTimeout(r, 3000));
        const secs = Math.round((Date.now() - t0) / 1000);
        renderStatus(`${t.checking}… ${secs}${t.secs}`);
        const r = await fetch(`${API}/api/analyze/status/${start.task_id}`).then(r => r.json());
        if (r.status === "done") return renderReport(r);
        if (r.status === "error") return renderStatus("⚠ " + (r.error || "error"));
      }
      renderStatus("⌛ timeout");
    } catch (e) {
      const msg = e.message || "network";
      const isNetErr = /fetch|network|failed/i.test(msg);
      renderStatus(isNetErr
        ? "⚠ Сервис временно недоступен — авто-повтор через 30с"
        : "⚠ " + msg);
      if (isNetErr) {
        setTimeout(() => analyze(unlockCode), 30000);
      }
    }
  }

  // ── Badge sync ────────────────────────────────────────────────────
  function notifyBg(type, extra = {}) {
    try { chrome.runtime.sendMessage({ type, ...extra }); } catch {}
  }

  // Патчим renderReport/renderStatus чтобы обновлять badge
  const _renderReport = renderReport;
  renderReport = (r) => { _renderReport(r); notifyBg("verdict", { verdict: r.verdict }); };
  const _renderStatus = renderStatus;
  renderStatus = (text) => { _renderStatus(text); if (text.includes("timeout")) notifyBg("clear"); };

  notifyBg("loading");

  // ── Enrichment: показывает ВСЕ данные об объекте (EHR, POI, соседи)
  // мгновенно, без ожидания LLM.
  function extractAddress() {
    const t = document.title || "";
    const h = document.querySelector("h1")?.innerText || "";
    for (const c of [t, h].filter(Boolean)) {
      const m = c.match(/([A-ZÕÄÖÜŠŽа-я][A-Za-zÕÄÖÜŠŽõäöüšžа-я\s\-\.]+\s\d+[a-z]?(?:[\/\-]\d+)?[^,]*,\s*[^,]+,\s*[^,\|]+)/i);
      if (m) return m[1].trim().slice(0, 200);
    }
    return "";
  }

  // Fallback: если наш backend не доступен — идём напрямую в Nominatim+Overpass
  async function fallbackEnrich(address) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1&accept-language=ru,et,lv,en`);
      const arr = await r.json();
      if (!arr || !arr[0]) return null;
      const g = arr[0];
      const lat = parseFloat(g.lat), lon = parseFloat(g.lon);
      const a = g.address || {};
      const q = `[out:json][timeout:8];(node["amenity"~"school|kindergarten|pharmacy|supermarket|cafe|restaurant"](around:600,${lat},${lon});node["shop"~"supermarket|convenience|mall"](around:600,${lat},${lon});node["leisure"~"park|playground"](around:600,${lat},${lon});node["highway"="bus_stop"](around:400,${lat},${lon}););out body 20;`;
      const r2 = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST", body: "data=" + encodeURIComponent(q),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const data = await r2.json();
      const pois = (data.elements || []).map(e => {
        const t = e.tags || {};
        const name = t.name || t["name:ru"] || t["name:et"] || t["name:lv"];
        if (!name) return null;
        const kind = t.amenity || t.shop || t.leisure || t.public_transport || t.highway;
        const dlat = (e.lat - lat) * Math.PI / 180;
        const dlon = (e.lon - lon) * Math.PI / 180;
        const s = Math.sin(dlat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(e.lat*Math.PI/180) * Math.sin(dlon/2)**2;
        const dist = Math.round(2 * 6371000 * Math.asin(Math.sqrt(s)));
        return { name, kind, dist_m: dist };
      }).filter(Boolean).sort((a, b) => a.dist_m - b.dist_m).slice(0, 10);
      return {
        geocoded: { lat, lon, city: a.city || a.town || a.village || "",
                   district: a.suburb || a.neighbourhood || a.city_district || "" },
        nearby: pois, ehr: null, era: null, warnings: [], notes: [],
      };
    } catch { return null; }
  }

  async function loadEnrich() {
    const addr = extractAddress();
    if (!addr) return;
    let d = null;
    try {
      // Backend enrich может занять до 15 сек (Overpass медленный при cold cache)
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(`${API}/api/analyze/enrich?address=${encodeURIComponent(addr)}`,
                            { signal: ctrl.signal });
      clearTimeout(timer);
      if (r.ok) d = await r.json();
    } catch {}
    if (!d) {
      // Backend лежит или таймаут — degraded fallback через прямые OSM
      d = await fallbackEnrich(addr);
    }
    if (!d) return;
    (function useEnrich(d) {
      const items = [];
      if (d.ehr) {
        items.push(`🏗 <b>По EHR:</b> год ${d.ehr.build_year || '?'}${d.ehr.construction ? ', ' + d.ehr.construction : ''}`);
      }
      if (d.era === "panel_hruschovka_era") {
        items.push(`⚠️ Эпоха панельной застройки — уточнить состояние коммуникаций`);
      } else if (d.era === "pre_war") {
        items.push(`🕰 Довоенное здание — часто деревянные перекрытия`);
      } else if (d.era === "new_conc") {
        items.push(`🆕 Новое здание (после 2015)`);
      }
      if (d.geocoded?.district) {
        items.push(`📍 ${d.geocoded.district}${d.geocoded.city ? ', ' + d.geocoded.city : ''}`);
      }
      if (d.nearby && d.nearby.length) {
        const top = d.nearby.slice(0, 4).map(p => `${escapeHtml(p.name)} ${p.dist_m}м`);
        items.push(`🚏 Рядом: ${top.join(' · ')}`);
      }
      if (d.neighborhood && d.neighborhood.length) {
        const years = d.neighborhood.filter(b => b.build_year).map(b => b.build_year);
        if (years.length) {
          const avg = Math.round(years.reduce((a, b) => a + b, 0) / years.length);
          items.push(`🏘 Соседних зданий: ${years.length}, средний год: ${avg}`);
        }
      }
      (d.warnings || []).forEach(w => items.push(`⚠️ ${escapeHtml(w)}`));
      (d.notes || []).forEach(n => items.push(`💡 ${escapeHtml(n)}`));

      if (items.length) {
        const div = document.createElement("div");
        div.className = "aidi-sec";
        div.style.borderLeft = "3px solid #6c3bd9";
        div.innerHTML = `<b>🔎 Что мы знаем об объекте</b>${items.map(x => `<div style="margin-top:6px;font-size:12px;color:#171c1c">${x}</div>`).join('')}`;
        body.insertBefore(div, body.firstChild);
      }
    })(d);
  }

  loadEnrich();

  // Save history in chrome.storage
  const _renderReport2 = renderReport;
  renderReport = (r) => {
    _renderReport2(r);
    try {
      chrome.storage.local.get(["aidi_history"], (data) => {
        const hist = data.aidi_history || [];
        const entry = { url, source, verdict: r.verdict, title: r.listing?.title,
                        ts: Date.now() };
        const filtered = hist.filter(h => h.url !== url).slice(0, 19);
        chrome.storage.local.set({ aidi_history: [entry, ...filtered] });
      });
    } catch {}
  };

  // Autoload unlock code from storage + auto-run
  try {
    chrome.storage.local.get(["aidi_unlock_code"], (data) => {
      setTimeout(() => analyze(data.aidi_unlock_code), 800);
    });
  } catch {
    setTimeout(() => analyze(), 800);
  }
})();
