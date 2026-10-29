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
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return { error: "Select text inside a completed Gemini response first." };
    const range = selection.getRangeAt(0);
    const start = range.startContainer.parentElement;
    const end = range.endContainer.parentElement;
    // These are tentative Gemini UI markers, subject to live validation.
    const bubble = start?.closest('model-response, .model-response, [data-test-id="model-response"]');
    if (!bubble || !bubble.contains(end)) return { error: "Could not verify a single Gemini response. Please report this selector mismatch." };
    if (document.querySelector('button[aria-label*="Stop response"], button[aria-label*="Stop generating"], [data-test-id="stop-response-button"]')) {
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
