// Experiment 001B.1: explicit, read-only extraction of user-selected response text.
(() => {
  const platform = "gemini";
  const host = location.hostname;
  const probe = () => ({
    platform, host,
    inputPresent: Boolean(document.querySelector('[contenteditable="true"][role="textbox"], rich-textarea [contenteditable="true"], textarea')),
    urlMatched: host === "gemini.google.com"
  });

  function extractSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return { error: "Highlight text on the page before clicking Extract selected." };
    const range = selection.getRangeAt(0);
    const start = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    const end = range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer;
    if (!start || !end || !document.body.contains(start) || !document.body.contains(end)) return { error: "Selection must be inside this page." };
    if (start.closest('[contenteditable="true"], textarea, input') || end.closest('[contenteditable="true"], textarea, input')) return { error: "Selection inside an input or editor is not supported." };
    if (document.querySelector('button[aria-label*="Stop response"], button[aria-label*="Stop generating"], [data-test-id="stop-response-button"]')) {
      return { error: "Generation may still be active; wait until the reply finishes." };
    }
    const text = selection.toString();
    if (!text.trim() || text.length > 12000) return { error: "Select non-empty text under 12,000 characters." };
    return { platform, text, completion: "not-verified", warning: "Explicitly selected page text only; author and completion NOT verified. Review before any sharing." };
  }

  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request?.type === "TREEHOUSE_STATUS") respond(probe());
    if (request?.type === "TREEHOUSE_EXTRACT_SELECTED") respond(extractSelection());
  });
  chrome.runtime.sendMessage({ type: "TREEHOUSE_PROBE", platform, host }).catch(() => {});
})();
