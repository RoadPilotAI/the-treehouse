// Experiment 001B.1: explicit, read-only extraction of user-selected response text.
(() => {
  const platform = "chatgpt";
  const host = location.hostname;
  const probe = () => ({
    platform, host,
    inputPresent: Boolean(document.querySelector('[contenteditable="true"][role="textbox"], #prompt-textarea, textarea')),
    urlMatched: ["chatgpt.com", "chat.openai.com"].includes(host)
  });

  // Metadata-only fingerprinting. No message text, HTML, IDs or class values leave the tab.
  function inspectSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1)
      return { hasSelection: false, rangeCount: selection?.rangeCount ?? 0 };
    const range = selection.getRangeAt(0);
    const asElement = node => node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    const common = asElement(range.commonAncestorContainer);
    const start = asElement(range.startContainer);
    const end = asElement(range.endContainer);
    const markers = [];
    let totalDepth = 0;
    let reachedDocumentRoot = false;
    const MAX_DEPTH = 256; // Safety bound, not an extraction limit.
    for (let element = common; element && totalDepth < MAX_DEPTH; element = element.parentElement) {
      const tag = element.tagName;
      const role = element.getAttribute("role");
      const author = element.getAttribute("data-message-author-role");
      const isTurn = element.hasAttribute("data-testid") &&
        /conversation.turn/i.test(element.getAttribute("data-testid") || "");
      const hasCopyAction = totalDepth < 40 && Boolean(element.querySelector('button[aria-label*="Copy"], button[data-testid*="copy"]'));
      const hasAudioAction = totalDepth < 40 && Boolean(element.querySelector('button[aria-label*="Read aloud"], button[aria-label*="Listen"]'));
      if (tag !== "DIV" || role || author || isTurn || element.hasAttribute("data-message-id") ||
          element.hasAttribute("data-testid") || hasCopyAction || hasAudioAction) {
        markers.push({
          depth: totalDepth,
          tag,
          role: ["article", "main", "list", "listitem"].includes(role) ? role : (role ? "other" : null),
          authorRole: ["assistant", "user"].includes(author) ? author : (author ? "other" : null),
          hasTestId: element.hasAttribute("data-testid"),
          isConversationTurn: isTurn,
          hasMessageId: element.hasAttribute("data-message-id"),
          hasClass: element.hasAttribute("class"),
          hasCopyAction,
          hasAudioAction
        });
      }
      totalDepth++;
      if (tag === "HTML") { reachedDocumentRoot = true; break; }
    }
    const assistant = common?.closest('[data-message-author-role="assistant"]');
    return {
      hasSelection: true,
      rangeCount: selection.rangeCount,
      startNodeType: range.startContainer.nodeType,
      endNodeType: range.endContainer.nodeType,
      commonAncestorTag: common?.tagName ?? null,
      totalAncestorDepth: totalDepth,
      reachedDocumentRoot,
      structuralMarkers: markers,
      matchedAssistantContainer: Boolean(assistant),
      sameAssistantContainer: Boolean(assistant && assistant.contains(start) && assistant.contains(end)),
      note: "Action-control checks are limited to the first 40 ancestors; such controls are clues only, not proof of authorship or completion."
    };
  }

  // Experiment 001B.2: user-triggered, read-only geometry. Never authorizes extraction.
  function inspectGeometry() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1)
      return { hasSelection: false, rangeCount: selection?.rangeCount ?? 0 };
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const rounded = n => Math.round(n * 10) / 10;
    const bounds = r => ({ top: rounded(r.top), bottom: rounded(r.bottom),
      left: rounded(r.left), right: rounded(r.right), height: rounded(r.height) });
    const selectors = {
      copy: 'button[aria-label*="Copy"], button[data-testid*="copy"]',
      audio: 'button[aria-label*="Read aloud"], button[aria-label*="Listen"]'
    };
    const actions = {};
    for (const [kind, selector] of Object.entries(selectors)) {
      const matches = [...document.querySelectorAll(selector)]
        .filter(el => el.getClientRects().length && el.getBoundingClientRect().width > 0 &&
                      el.getBoundingClientRect().height > 0 &&
                      el.getBoundingClientRect().right > 0 && el.getBoundingClientRect().left < window.innerWidth &&
                      el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < window.innerHeight)
        .map(el => {
          const r = el.getBoundingClientRect();
          const dx = r.right < rect.left ? rect.left - r.right :
            r.left > rect.right ? r.left - rect.right : 0;
          const dy = r.bottom < rect.top ? rect.top - r.bottom :
            r.top > rect.bottom ? r.top - rect.bottom : 0;
          return { dx: rounded(dx), dy: rounded(dy),
            distance: Math.hypot(dx, dy), box: bounds(r) };
        }).sort((a, b) => a.distance - b.distance);
      actions[kind] = { visibleMatches: matches.length,
        nearest: matches.length ? { dx: matches[0].dx, dy: matches[0].dy,
          box: matches[0].box } : null };
    }
    return {
      hasSelection: true,
      selectionRect: bounds(rect),
      viewport: { width: window.innerWidth, height: window.innerHeight,
        scrollX: rounded(window.scrollX), scrollY: rounded(window.scrollY),
        devicePixelRatio: window.devicePixelRatio },
      actions,
      note: "Viewport geometry only. Action proximity does not establish authorship."
    };
  }

  function extractSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return { error: "Highlight text on the page before clicking Extract selected." };
    const range = selection.getRangeAt(0);
    const start = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    const end = range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer;
    if (!start || !end || !document.body.contains(start) || !document.body.contains(end)) return { error: "Selection must be inside this page." };
    if (start.closest('[contenteditable="true"], textarea, input') || end.closest('[contenteditable="true"], textarea, input')) return { error: "Selection inside an input or editor is not supported." };
    // Fail closed if there is evidence a response is still being generated.
    if (document.querySelector('[data-testid="stop-button"], button[aria-label*="Stop generating"], button[aria-label="Stop"]')) {
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
    // Only target the actual editable control; an outer wrapper may contain
    // visible UI labels or placeholder text even when the composer is empty.
    const candidates = [...new Set(selectors.flatMap(selector => [...document.querySelectorAll(selector)]))];
    const target = candidates.find(el =>
      (el.matches("textarea") || el.isContentEditable) &&
      el.getClientRects().length > 0);
    if (!target) return { error: "Editable composer not found or not visible." };
    if (target.matches('[disabled], [aria-disabled="true"]')) return { error: "Composer is disabled." };
    const existing = target.matches("textarea") ? target.value : target.innerText;
    if (existing?.trim()) return {
      error: "Composer appears occupied; nothing was changed.",
      diagnostic: {
        tag: target.tagName,
        isContentEditable: target.isContentEditable,
        innerTextLength: (target.innerText || "").trim().length,
        textContentLength: (target.textContent || "").trim().length,
        childElementCount: target.childElementCount
      }
    };
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
    if (request?.type === "TREEHOUSE_INSPECT_SELECTION") respond(inspectSelection());
    if (request?.type === "TREEHOUSE_INSPECT_GEOMETRY") respond(inspectGeometry());
  });
  chrome.runtime.sendMessage({ type: "TREEHOUSE_PROBE", platform, host }).catch(() => {});
})();
