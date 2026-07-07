// AIDI Insight — service worker (MV3).
// - Badge management (verdict/loading/clear)
// - Watchlist polling каждые 15 мин через chrome.alarms → notifications

const API = "https://api.aidi.ee";

const VERDICT_BADGE = {
  good_deal:  { text: "$",  color: "#0e4b51" },
  fair:       { text: "OK", color: "#7a4b0c" },
  overpriced: { text: "!",  color: "#b04a3a" },
  underpriced:{ text: "?",  color: "#7a4b0c" },
  cant_tell:  { text: "?",  color: "#5a6566" },
};

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender?.tab?.id;
  if (!tabId) return;
  if (msg.type === "verdict") {
    const v = VERDICT_BADGE[msg.verdict] || VERDICT_BADGE.cant_tell;
    chrome.action.setBadgeText({ tabId, text: v.text });
    chrome.action.setBadgeBackgroundColor({ tabId, color: v.color });
  }
  if (msg.type === "loading") {
    chrome.action.setBadgeText({ tabId, text: "…" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#94a3a3" });
  }
  if (msg.type === "clear") {
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});


// ── Watchlist polling ────────────────────────────────────────────
// Каждые 15 мин: fetch matches per watchlist, compare с last seen uids,
// push chrome notification при новых.

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("watchlist_poll", { periodInMinutes: 15 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "watchlist_poll") {
    await pollWatchlists();
  }
});


async function pollWatchlists() {
  const stored = await chrome.storage.local.get(["aidi_watchlists"]);
  const watchlists = stored.aidi_watchlists || [];  // [{id, label, kind, seen_uids: [...]}]

  for (const w of watchlists) {
    try {
      const r = await fetch(`${API}/api/watchlist/${w.id}/matches?only_new=false`);
      if (!r.ok) continue;
      const data = await r.json();
      const newSeen = new Set(w.seen_uids || []);
      const newMatches = (data.matches || []).filter(m => !newSeen.has(m.uid));

      if (newMatches.length === 0) continue;

      // Show notification для первых 3 новых
      for (const m of newMatches.slice(0, 3)) {
        const title = w.label || `AIDI: ${w.kind === "vehicle" ? "новое авто" : "новая квартира"}`;
        const bodyText = w.kind === "vehicle"
          ? `${(m.brand || "").toUpperCase()} ${(m.model || "").toUpperCase()} ${m.year || ""}: ${m.price_eur.toLocaleString("ru")} € ${m.mileage_km ? "· " + Math.round(m.mileage_km/1000) + "k км" : ""}`
          : `${m.price_eur.toLocaleString("ru")} € · ${m.area_m2 || "?"}m² · ${m.rooms || "?"} комн\n${(m.title || "").slice(0, 80)}`;

        const notifId = `aidi-${w.id}-${m.uid}`;
        chrome.notifications.create(notifId, {
          type: "basic",
          iconUrl: "icons/128.png",
          title,
          message: bodyText,
          priority: 2,
        });
        // Store URL для клика
        await chrome.storage.local.set({ [`notif_${notifId}`]: m.url });
      }

      // Update seen
      for (const m of newMatches) newSeen.add(m.uid);
      w.seen_uids = Array.from(newSeen).slice(-500);  // keep last 500
      w.last_check_ts = Date.now();
    } catch (e) {
      // ignore, retry next alarm
    }
  }

  await chrome.storage.local.set({ aidi_watchlists: watchlists });
}


chrome.notifications.onClicked.addListener(async (notifId) => {
  if (!notifId.startsWith("aidi-")) return;
  const { [`notif_${notifId}`]: url } = await chrome.storage.local.get(`notif_${notifId}`);
  if (url) {
    chrome.tabs.create({ url });
    chrome.notifications.clear(notifId);
    chrome.storage.local.remove(`notif_${notifId}`);
  }
});
