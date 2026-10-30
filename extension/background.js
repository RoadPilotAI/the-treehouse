importScripts("common-room.js");
// PR #4: bounded, extension-owned single-seed session controller.
// Deliberately halts on every unknown/interrupt lifecycle end. No auto-capture or relay.
let session = null;
const provider = hostname => hostname === "gemini.google.com" ? "gemini" :
  ["chatgpt.com", "chat.openai.com"].includes(hostname) ? "chatgpt" : null;
const status = () => session ? {
  state: session.state, sourceTabId: session.sourceTabId,
  destinationTabId: session.destinationTabId, exchangeCount: session.exchangeCount,
  maxExchanges: session.maxExchanges, reason: session.reason || null,
  diagnostic: session.diagnostic || null
} : { state: "idle" };
async function halt(reason) {
  if (!session) return;
  session.state = "stopped";
  session.reason = reason;
  console.info("[Treehouse session]", status());
}
chrome.tabs.onRemoved.addListener(tabId => {
  if (session && (session.sourceTabId === tabId || session.destinationTabId === tabId))
    void halt("Participant tab closed.");
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!message || typeof message !== "object") return;
  // Control actions are accepted only from extension UI, never page content scripts.
  if (["TREEHOUSE_SESSION_STATUS", "TREEHOUSE_SESSION_STOP", "TREEHOUSE_SESSION_START"].includes(message.type) && (sender.tab || sender.id !== chrome.runtime.id)) return;
  if (typeof message.type==="string" && message.type.startsWith("TREEHOUSE_ROOM_")) {
    if(sender.tab || sender.id!==chrome.runtime.id)return;
    roomCommand(message).then(respond).catch(()=>respond({error:"Common room operation failed"}));
    return true;
  }
  if (message.type === "TREEHOUSE_SESSION_STATUS") { respond(status()); return; }
  if (message.type === "TREEHOUSE_SESSION_STOP") {
    void halt("Stopped by user.");
    respond(status()); return;
  }
  if (message.type === "TREEHOUSE_SESSION_START") {
    (async () => {
      if (session && session.state === "running") return { error: "Session already running." };
      const { sourceTabId, destinationTabId, seed } = message;
      if (!Number.isSafeInteger(sourceTabId) || !Number.isSafeInteger(destinationTabId) ||
          sourceTabId === destinationTabId || typeof seed !== "string" ||
          seed.length > 500 || !seed.trim()) return { error: "Invalid participants or seed." };
      const tabs = await Promise.all([chrome.tabs.get(sourceTabId), chrome.tabs.get(destinationTabId)]);
      const providers = tabs.map(t => { try { return provider(new URL(t.url).hostname); } catch { return null; } });
      if (!providers[0] || !providers[1] || providers[0] === providers[1])
        return { error: "Select one ChatGPT tab and one Gemini tab." };
      if (session && session.state === "running") return { error: "Session already running." };
      session = { state: "running", sourceTabId, destinationTabId, exchangeCount: 0,
        maxExchanges: 1, reason: null, diagnostic: null };
      // One explicit user-initiated seed is the entire permitted send budget in this stage.
      let result;
      try {
        result = await chrome.tabs.sendMessage(destinationTabId, {
          type: "TREEHOUSE_SUBMIT_SEED", text: seed
        });
      } catch { await halt("Destination adapter unavailable."); return status(); }
      if (!result?.ok) {
        session.diagnostic = result?.diagnostic || null;
        await halt(result?.error || "Seed insertion/submission unverified; inspect destination.");
        return status();
      }
      session.exchangeCount = 1;
      session.state = "awaiting-end";
      session.reason = "Seed submitted; awaiting lifecycle evidence. No automatic reply forwarding.";
      console.info("[Treehouse session]", status());
      return status();
    })().then(respond).catch(e => respond({ error: e?.message || "Session error." }));
    return true;
  }
  // Ignore any unsolicited control commands from content scripts.
  const approved = new Map([
    ["chatgpt.com", "chatgpt"], ["chat.openai.com", "chatgpt"],
    ["gemini.google.com", "gemini"]
  ]);
  let host;
  try { host = new URL(sender.url || sender.tab?.url || "").hostname; } catch { return; }
  const platform = approved.get(host);
  if (!platform || message.platform !== platform || !sender.tab?.id) return;
  if (message.type === "TREEHOUSE_PROBE") {
    respond({ ok: true, stage: "bounded-handshake", platform }); return;
  }
  if (message.type !== "TREEHOUSE_LIFECYCLE") return;
  const allowed = new Set(["RESPONSE_START", "RESPONSE_UPDATE", "STOP_CLICK_OBSERVED",
    "GENERATION_ENDED", "RESPONSE_INTERRUPTED", "RESPONSE_STATUS_UNKNOWN"]);
  if (!allowed.has(message.event) || !Number.isSafeInteger(message.sequence) || message.sequence < 1) return;
  const record = { platform, tabId: sender.tab.id, event: message.event,
    sequence: message.sequence,
    elapsedMs: Number.isFinite(message.elapsedMs) ? Math.min(Math.max(0, Math.round(message.elapsedMs)), 3600000) : null };
  console.info("[Treehouse observation]", record);
  if (platform==="gemini" && message.event==="RESPONSE_STATUS_UNKNOWN") {
    // Capture a bounded, held candidate only; NEVER submit or rebroadcast here.
    void roomHoldGeminiReply(sender.tab.id).catch(err =>
      console.warn("[Treehouse room] Candidate capture unavailable", String(err)));
  }
  if (session && sender.tab.id === session.destinationTabId &&
    ["RESPONSE_INTERRUPTED", "RESPONSE_STATUS_UNKNOWN"].includes(message.event) &&
    session.state === "awaiting-end") void halt(message.event + ": no automatic relay permitted.");
});
