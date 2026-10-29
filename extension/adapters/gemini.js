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

  // Deliberate draft-only delivery; cannot submit or replace existing text.
  function prepareDraft(request) {
    const text = request?.text;
    if (typeof text !== "string" || !text.trim() || text.length > 12000)
      return { error: "Draft must contain 1–12,000 characters." };
    const selectors = platform === "chatgpt"
      ? ['#prompt-textarea', '[contenteditable="true"][role="textbox"]', 'textarea']
      : ['rich-textarea [contenteditable="true"]', '[contenteditable="true"][role="textbox"]', 'textarea'];
    const target = selectors.map(selector => document.querySelector(selector)).find(Boolean);
    if (!target || !target.getClientRects().length) return { error: "Composer not found or not visible." };
    if (target.matches('[disabled], [aria-disabled="true"]')) return { error: "Composer is disabled." };
    const existing = target.matches("textarea") ? target.value : target.innerText;
    if (existing?.trim()) return { error: "Destination composer is not empty; nothing was changed." };
    target.focus();
    try {
      if (target.matches("textarea")) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        if (!setter) return { error: "Text input not supported." };
        setter.call(target, text);
        target.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        // Browser editing action is closer to actual typing than assigning textContent.
        const inserted = document.execCommand("insertText", false, text);
        if (!inserted) return { error: "Browser editor rejected insertion." };
      }
      const actual = target.matches("textarea") ? target.value : target.innerText;
      if (actual !== text) return { reviewRequired: true, reason: "Draft was inserted, but the editor rendered it differently from the captured text. Review before sending; do not retry insertion.", expectedLength: text.length, observedLength: actual.length };
      return { ok: true, length: text.length, note: "Draft prepared but NOT submitted. Review and send manually." };
    } catch {
      return { error: "Composer insertion failed. Review destination; no send was attempted." };
    }
  }

  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request?.type === "TREEHOUSE_STATUS") respond(probe());
    if (request?.type === "TREEHOUSE_EXTRACT_SELECTED") respond(extractSelection());
    if (request?.type === "TREEHOUSE_PREPARE_DRAFT") respond(prepareDraft(request));
  });
  chrome.runtime.sendMessage({ type: "TREEHOUSE_PROBE", platform, host }).catch(() => {});
})();
