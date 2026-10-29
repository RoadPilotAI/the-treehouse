# Experiment 001A / 001B.1 — First Handshake

**Status:** Phase 0 tab detection passed in Norm's Chrome screenshots. Phase 001B.1 selected-text extraction is implemented **but has not yet been tested in Chrome**. No message transport.

## What is implemented
- Popup discovers existing ChatGPT and Gemini tabs and probes their inputs.
- User explicitly highlights text inside ONE model response on its original tab, then opens Treehouse and clicks **Extract selected** for that tab.
- The content script checks its provider-specific response container, a known stop-generation indicator, a 12,000-character ceiling, and returns selected text **only to the popup**.
- The popup uses `textContent` (not HTML) and does not persist, relay, copy, or auto-send the text.

**Not proved:** No robust guarantee of response completion. Indicators are only heuristics; output is marked `completion: not-verified`. The DOM structure and selection retention on opening the popup need real browser testing. If a selection is rejected, report it instead of broadening to arbitrary-page extraction.

## Field test
1. Update the local extension folder from branch `experiment/001a-extension-scaffold` (not `main`).
2. On `chrome://extensions`, click **Reload** on Treehouse. Refresh ChatGPT and Gemini tabs.
3. In a completed, non-sensitive AI message, select a short unique phrase with the mouse.
4. Open the Treehouse popup. Click **Extract selected** next to the correct tab (the popup automatically scans).
5. Compare the displayed excerpt character-for-character against the selection. Note line breaks and special characters.
6. Repeat separately on the other platform. If the response-container selector does not match, the script should reject the extraction.
7. Try selecting text in the input box or on an unrelated page; the adapter should reject it.
8. Report exact status/error and browser version. Do not use private material for this experiment.

## Safety and limits
- No read-on-load, polling, automatic text transmission, writing to chat input, GitHub activity, storage, OCR, or external network calls.
- Only explicit browser domains listed in the manifest.
- No message selected? Nothing extracted.
- Selected text is untrusted content, displayed with `textContent`.
- The extension does not claim cryptographically verified identity or verified completed messages.
- No automatic submission should be added until applicable platform rules are evaluated and explicit controls are implemented.
- Radio tokens OVER/OUT are conversational; the extension would need its own enforced state machine for future transport.

## Requested Gemini review
Inspect response-container selectors, selection persistence, potential false positives from streaming-state heuristics, privacy boundaries, and potential duplication. Recommend tests and improvements based on actual outcomes.

## Future gates (not implemented)
1. Verify selected-text extraction in both tabs.
2. Test harmless draft insertion without pressing Send.
3. Evaluate permitted sending mechanism.
4. Supervised, bounded round-trip, with independent coordinator stop rules.

## Diagnostic follow-up after first extraction failure
The first ChatGPT selected-text extraction returned a message-boundary rejection although Norm highlighted ordinary assistant paragraph text. This could reflect selector mismatch or selection structure; it is not yet diagnosed.

The **Inspect selection** button for ChatGPT now returns **structural metadata only**: selection presence, range/node types, ancestor tag names and limited role/test-id/author-role attributes, and whether the current assistant selector matches. It does **not** return selected text or HTML. Nothing is sent or stored. This deliberately does not loosen the existing extraction gate.

**Test:** select a short non-sensitive sentence in a completed ChatGPT response, open the popup, click **Inspect selection** by ChatGPT, and inspect the JSON report. Share only if comfortable: attributes may occasionally contain identifiers, so review before forwarding. Note whether `hasSelection` is true and `matchedAssistantContainer` is false. No completion verification is claimed.
