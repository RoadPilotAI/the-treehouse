// Treehouse: manual transport plus observation-only lifecycle telemetry.
// No message text, automatic routing, submission, or persistent storage.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const approved = new Map([
    ["chatgpt.com", "chatgpt"],
    ["chat.openai.com", "chatgpt"],
    ["gemini.google.com", "gemini"]
  ]);
  let host;
  try { host = new URL(sender.url || sender.tab?.url || "").hostname; } catch { return; }
  const platform = approved.get(host);
  if (!platform || message?.platform !== platform || !sender.tab?.id) return;
  if (message.type === "TREEHOUSE_PROBE") {
    sendResponse({ ok: true, stage: "manual-transport", platform });
    return;
  }
  if (message.type !== "TREEHOUSE_LIFECYCLE") return;
  const allowed = new Set(["RESPONSE_START", "RESPONSE_UPDATE", "STOP_CLICK_OBSERVED", "GENERATION_ENDED", "RESPONSE_INTERRUPTED", "RESPONSE_STATUS_UNKNOWN"]);
  if (!allowed.has(message.event) || !Number.isSafeInteger(message.sequence) || message.sequence < 1) return;
  const record = {
    platform,
    tabId: sender.tab.id,
    event: message.event,
    sequence: message.sequence,
    elapsedMs: Number.isFinite(message.elapsedMs) ? Math.min(Math.max(0, Math.round(message.elapsedMs)), 3600000) : null,
    mutationCount: Number.isSafeInteger(message.mutationCount) ? Math.min(Math.max(message.mutationCount, 0), 100000) : undefined,
    bufferedMutations: Number.isSafeInteger(message.bufferedMutations) ? Math.min(Math.max(message.bufferedMutations, 0), 100000) : undefined,
    signal: ["visible-stop-or-busy", "active-indicator-disappeared", "trusted-stop-click"].includes(message.signal) ? message.signal : undefined,
    stopClicked: typeof message.stopClicked === "boolean" ? message.stopClicked : undefined,
    actionFooterPresent: typeof message.actionFooterPresent === "boolean" ? message.actionFooterPresent : undefined
  };
  console.info("[Treehouse observation]", record);
});
