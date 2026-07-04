// Popup logic: tabs, history from chrome.storage, unlock code save.

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    ["history", "sites", "settings"].forEach(id => {
      const el = document.getElementById("tab-" + id);
      if (el) el.style.display = id === tab.dataset.tab ? "" : "none";
    });
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

chrome.storage.local.get(["aidi_history"], (data) => {
  const list = document.getElementById("history-list");
  const items = (data.aidi_history || []).slice(0, 20);
  if (items.length === 0) return;
  list.innerHTML = items.map(it => {
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
});

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
save.addEventListener("click", () => {
  const code = input.value.trim();
  chrome.storage.local.set({ aidi_unlock_code: code }, () => {
    msg.textContent = code ? "✓ Сохранено — работает автоматически" : "Код очищен";
    setTimeout(() => msg.textContent = "", 3000);
  });
});
