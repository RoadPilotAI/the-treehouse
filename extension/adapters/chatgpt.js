// Experiment 001B.1: explicit, read-only extraction of user-selected response text.
(() => {
  const platform = "chatgpt";
  const host = location.hostname;
  const probe = () => ({
    platform, host,
    inputPresent: Boolean(document.querySelector('[contenteditable="true"][role="textbox"], #prompt-textarea, textarea')),
    urlMatched: ["chatgpt.com", "chat.openai.com"].includes(host)
  });

  function extractSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return { error: "Select text inside a completed assistant message first." };
    const range = selection.getRangeAt(0);
    const start = range.startContainer.parentElement;
    const end = range.endContainer.parentElement;
    const bubble = start?.closest('[data-message-author-role="assistant"]');
    if (!bubble || !bubble.contains(end)) return { error: "Selection must be inside one ChatGPT assistant message." };
    // Fail closed if there is evidence a response is still being generated.
    if (document.querySelector('[data-testid="stop-button"], button[aria-label*="Stop generating"], button[aria-label="Stop"]')) {
      return { error: "Generation may still be active; wait until the reply finishes." };
    }
    const text = selection.toString();
    if (!text.trim() || text.length > 12000) return { error: "Select non-empty text under 12,000 characters." };
    return { platform, text, completion: "not-verified", warning: "Selected text only. Confirm this reply is complete before trusting it." };
  }

  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request?.type === "TREEHOUSE_STATUS") respond(probe());
    if (request?.type === "TREEHOUSE_EXTRACT_SELECTED") respond(extractSelection());
  });
  chrome.runtime.sendMessage({ type: "TREEHOUSE_PROBE", platform, host }).catch(() => {});
})();
