// Experiment 002: observation-only lifecycle radar. No response text is read or transmitted.
(() => {
  const platform = location.hostname === "gemini.google.com" ? "gemini" : "chatgpt";
  const selectors = platform === "gemini"
    ? ['button[aria-label*="Stop response"]', 'button[aria-label*="Stop generating"]', '[data-test-id="stop-response-button"]', '[aria-busy="true"]']
    : ['[data-testid="stop-button"]', 'button[aria-label*="Stop generating"]', 'button[aria-label="Stop"]', '[aria-busy="true"]'];
  const signalSelector = selectors.join(",");
  let active = false;
  let sequence = 0;
  let updates = 0;
  let lastReported = 0;
  let pendingCompletion = null;
  let startedAt = 0;
  const emit = (type, extra = {}) => {
    // Emit only bounded metadata; no DOM text, HTML, node IDs, or URLs.
    chrome.runtime.sendMessage({
      type: "TREEHOUSE_LIFECYCLE",
      platform,
      event: type,
      sequence,
      elapsedMs: active ? Math.round(performance.now() - startedAt) : undefined,
      ...extra
    }).catch(() => {});
  };
  const signalPresent = () => {
    // Visible stop controls and busy markers are signals, never definitive evidence.
    for (const el of document.querySelectorAll(signalSelector)) {
      if (el.getClientRects().length && el.getAttribute("aria-hidden") !== "true") return true;
    }
    return false;
  };
  const cancelPending = () => {
    if (pendingCompletion !== null) clearTimeout(pendingCompletion);
    pendingCompletion = null;
  };
  const inspect = (mutationCount = 0) => {
    const busy = signalPresent();
    if (busy) {
      cancelPending();
      if (!active) {
        active = true;
        sequence++;
        updates = 0;
        startedAt = performance.now();
        lastReported = startedAt;
        emit("RESPONSE_START", { signal: "visible-stop-or-busy" });
      } else if (mutationCount > 0) {
        updates += mutationCount;
        const now = performance.now();
        if (now - lastReported >= 1000) {
          emit("RESPONSE_UPDATE", { mutationCount: Math.min(updates, 100000) });
          updates = 0;
          lastReported = now;
        }
      }
    } else if (active && pendingCompletion === null) {
      // Requires disappearance of a previously observed active signal, not idle timeout alone.
      pendingCompletion = setTimeout(() => {
        pendingCompletion = null;
        if (!active || signalPresent()) return;
        emit("PROBABLE_RESPONSE_COMPLETE", { signal: "active-indicator-disappeared", bufferedMutations: Math.min(updates, 100000) });
        active = false;
        updates = 0;
      }, 350);
    }
  };
  // The observer receives structural notifications. It never reads mutation text payloads.
  const watcher = new MutationObserver(mutations => inspect(mutations.length));
  watcher.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, characterData: true,
    attributeFilter: ["aria-busy", "aria-label", "aria-hidden", "data-testid", "data-test-id", "style", "class"]
  });
  // A generation already active when the extension loads is tagged as observed, not proven start.
  inspect();
  window.addEventListener("pagehide", () => { cancelPending(); watcher.disconnect(); }, { once: true });
})();
