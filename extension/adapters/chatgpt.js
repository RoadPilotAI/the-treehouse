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
    if (request?.type === "TREEHOUSE_INSPECT_SELECTION") respond(inspectSelection());
  });
  chrome.runtime.sendMessage({ type: "TREEHOUSE_PROBE", platform, host }).catch(() => {});
})();
