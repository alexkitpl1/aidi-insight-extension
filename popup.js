// Popup logic: tabs, history + brokers + unlock code save.

const API = "https://api.aidi.ee";

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    ["history", "brokers", "sites", "settings"].forEach(id => {
      const el = document.getElementById("tab-" + id);
      if (el) el.style.display = id === tab.dataset.tab ? "" : "none";
    });
    if (tab.dataset.tab === "brokers") loadBrokers();
  });
});

// ── History ────────────────────────────────────────────────────────
const VERDICT_STYLE = {
  good_deal:  { bg: "#d7ecec", color: "#0e4b51", text: "🟢" },
  fair:       { bg: "#f3e6d3", color: "#7a4b0c", text: "🟡" },
  overpriced: { bg: "#fbe9e5", color: "#b04a3a", text: "🔴" },
  underpriced:{ bg: "#f3e6d3", color: "#7a4b0c", text: "⚠️" },
  cant_tell:  { bg: "#eef1f1", color: "#5a6566", text: "❔" },
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
    const s = VERDICT_STYLE[it.verdict] || VERDICT_STYLE.cant_tell;
    return `
      <div class="history-item" data-url="${it.url}">
        <div>
          <span class="h-verdict" style="background:${s.bg};color:${s.color}">${s.text}</span>
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
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
