// Experiment 001A: no automatic sending, external network calls, or persistent data.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "TREEHOUSE_PROBE") return;
  const approvedHosts = new Set(["chatgpt.com", "chat.openai.com", "gemini.google.com"]);
  let host;
  try { host = new URL(sender.url || sender.tab?.url || "").hostname; } catch { return; }
  if (!approvedHosts.has(host) || message.host !== host) return;
  sendResponse({ ok: true, stage: "read-only", platform: message.platform });
});
