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


  // Bounded PR #4 actuation: one user-authorized seed, never an AI reply.
  async function submitSeed(request) {
    const text = request?.text;
    if (typeof text !== "string" || !text.trim() || text.length > 500)
      return { error: "Seed must contain 1–500 characters." };
    const selectors = platform === "chatgpt"
      ? ['#prompt-textarea[contenteditable="true"]', '[contenteditable="true"][role="textbox"]', 'textarea']
      : ['rich-textarea [contenteditable="true"]', '[contenteditable="true"][role="textbox"]', 'textarea'];
    const candidates = [...new Set(selectors.flatMap(selector => [...document.querySelectorAll(selector)]))];
    const editor = candidates.find(el => (el.matches("textarea") || el.getAttribute("contenteditable") === "true") &&
      el.getClientRects().length > 0);
    if (!editor || editor.matches('[disabled], [aria-disabled="true"]'))
      return { error: "Editable composer unavailable." };
    const read = () => editor.matches("textarea") ? editor.value : editor.innerText;
    if (read().trim()) return { error: "Composer occupied. Nothing inserted." };
    editor.focus();
    try {
      if (editor.matches("textarea")) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        if (!setter) return { error: "Native textarea setter unavailable." };
        setter.call(editor, text);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (!document.execCommand("insertText", false, text)) {
        return { error: "Browser rejected insertion." };
      }
      // Different rich-text editors normalize line endings and nonbreaking spaces.
      // Accept only these explicitly understood representation changes; never
      // collapse paragraphs, punctuation, or other substantive differences.
      const normalizeEditorText = value => value.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").normalize("NFC");
      const observed = read();
      if (normalizeEditorText(observed) !== normalizeEditorText(text)) return {
        error: "Inserted draft differs from intended text; no send attempted. Inspect tab.",
        diagnostic: {
          expectedLength: text.length, observedLength: observed.length,
          expectedLines: text.split(/\r\n?|\n/).length,
          observedLines: observed.split(/\r\n?|\n/).length,
          sameAfterLineEndingAndSpaceNormalization: false
        }
      };
      await new Promise(resolve => setTimeout(resolve, 650));
      const sendSelector = platform === "chatgpt"
        ? 'button[data-testid="send-button"]'
        : 'button[aria-label="Send message"], button[aria-label="Send"], button[aria-label="Submit"], button[title="Submit"], button[type="submit"], button[data-test-id="send-button"]';
      const send = [...document.querySelectorAll(sendSelector)]
        .filter(el => el.getClientRects().length && !el.disabled && el.getAttribute("aria-disabled") !== "true");
      const diagnostic = {
        matchedSendButtons: send.length,
        candidates: [...document.querySelectorAll('button')].filter(el =>
          el.getClientRects().length && /send|submit/i.test([
            el.getAttribute("aria-label"), el.getAttribute("data-test-id"),
            el.getAttribute("title"), el.textContent?.trim().slice(0, 40)
          ].filter(Boolean).join(" "))).slice(0, 12).map(el => ({
            ariaLabel: (el.getAttribute("aria-label") || "").slice(0, 70),
            testId: (el.getAttribute("data-test-id") || "").slice(0, 70),
            title: (el.getAttribute("title") || "").slice(0, 70),
            disabled: Boolean(el.disabled),
            ariaDisabled: el.getAttribute("aria-disabled"),
            htmlTag: el.tagName
          }))
      };
      if (send.length !== 1) {
        // Inspect structure and geometry only. Never read text or HTML from the composer.
        const box = editor.getBoundingClientRect();
        const nearby = [...document.querySelectorAll('button, [role="button"], [type="submit"], [data-test-id], [aria-label]')]
          .filter(el => el !== editor && !editor.contains(el) && el.getClientRects().length)
          .map(el => {
            const rect = el.getBoundingClientRect();
            return { el, rect, distance: Math.hypot(
              Math.max(0, box.left - rect.right, rect.left - box.right),
              Math.max(0, box.top - rect.bottom, rect.top - box.bottom)
            ) };
          })
          .filter(item => item.distance < 250)
          .sort((a,b) => a.distance - b.distance)
          .slice(0, 18)
          .map(({el, distance}) => ({
            tag: el.tagName.toLowerCase(),
            role: (el.getAttribute("role") || "").slice(0, 32),
            ariaLabel: (el.getAttribute("aria-label") || "").slice(0, 80),
            testId: (el.getAttribute("data-test-id") || el.getAttribute("data-testid") || "").slice(0, 80),
            title: (el.getAttribute("title") || "").slice(0, 80),
            type: (el.getAttribute("type") || "").slice(0, 24),
            disabled: Boolean(el.disabled),
            ariaDisabled: el.getAttribute("aria-disabled"),
            distancePx: Math.round(distance)
          }));
        diagnostic.nearbyControls = nearby;
        const parent = editor.closest("rich-textarea")?.parentElement?.parentElement || editor.parentElement?.parentElement?.parentElement;
        diagnostic.composerRegion = parent ? [...parent.querySelectorAll('button, [role="button"], [type="submit"], [tabindex]')]
          .filter(el => el !== editor && !editor.contains(el) && el.getClientRects().length)
          .slice(0, 24).map(el => ({
            tag: el.tagName.toLowerCase(), ariaLabel: (el.getAttribute("aria-label") || "").slice(0, 70),
            title: (el.getAttribute("title") || "").slice(0, 70),
            testId: (el.getAttribute("data-test-id") || "").slice(0, 70),
            classes: [...el.classList].slice(0, 5).map(x => x.slice(0, 40)),
            disabled: Boolean(el.disabled), ariaDisabled: el.getAttribute("aria-disabled"),
            hasIcon: Boolean(el.querySelector("svg, mat-icon"))
          })) : null;
        return { error: "Send control not verified. Draft left untouched for manual send.", diagnostic };
      }
      // Do not use Enter as a fallback; ambiguous UI = stop.
      send[0].click();
      // A synthetic click may be ignored by the host UI. Never equate click() with sending.
      await new Promise(resolve => setTimeout(resolve, 900));
      if (read().trim()) return { error: "Send click attempted but draft remains in composer. Not confirmed sent; do not retry automatically.", diagnostic };
      return { ok: true, note: "Composer cleared after Send click; host acceptance still not independently verified." };
    } catch {
      return { error: "Submission failed or uncertain; inspect tab before retrying." };
    }
  }
  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request?.type === "TREEHOUSE_STATUS") respond(probe());
    if (request?.type === "TREEHOUSE_SUBMIT_SEED") {
      submitSeed(request).then(respond).catch(() => respond({ error: "Submission status uncertain; inspect destination." }));
      return true;
    }
    if (request?.type === "TREEHOUSE_EXTRACT_SELECTED") respond(extractSelection());
    if (request?.type === "TREEHOUSE_PREPARE_DRAFT") respond(prepareDraft(request));
  });
  chrome.runtime.sendMessage({ type: "TREEHOUSE_PROBE", platform, host }).catch(() => {});
})();
