// AIDI Insight — service worker (MV3).
// Держит tab-badge актуальным: в момент запроса → «…», по verdict → цвет.

const VERDICT_BADGE = {
  good_deal:  { text: "$",  color: "#0e4b51" },
  fair:       { text: "OK", color: "#7a4b0c" },
  overpriced: { text: "!",  color: "#b04a3a" },
  underpriced:{ text: "?",  color: "#7a4b0c" },
  cant_tell:  { text: "?",  color: "#5a6566" },
};

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
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
