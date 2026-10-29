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

## Diagnostic revision: message-ownership fingerprint
The second field test kept the selection but showed 25 levels of mostly anonymous wrappers, with no match for the existing assistant-role selector. The next diagnostic traverses towards the HTML root (maximum 256 levels), reports total depth, and emits only selected *structural* markers: element tags, restricted role/author categories, presence (not values) of classes/test IDs/message IDs, likely turn test-ID pattern, and presence of Copy/Read-aloud controls near the selection. It does not return text, identifiers, class names, or HTML.

**Test:** After updating/reloading this branch and refreshing ChatGPT, highlight a harmless sentence from a finished **assistant** reply; click **Inspect selection** and retain the report. Repeat with a harmless sentence from a **user** message. Compare the two reports to identify a distinguishing, stable container marker. Review before sharing; reports can still reveal page layout. Action controls are only clues, not verified authorship or completion. **Extraction remains fail-closed and unchanged.**

## Experiment 001B.2 — geometry comparison (diagnostic only)
Chrome popup now exposes **Inspect geometry** for ChatGPT. It returns the selected range bounding rectangle, viewport dimensions, scroll offsets, pixel ratio, and nearest visible Copy / audio-labelled button bounding rectangles and nonnegative edge-to-edge X/Y gaps. It returns neither text nor DOM content. It **does not authorize extraction**, establish turn ownership, or send/store messages.

Field test: select a short ordinary passage in a finished assistant reply, open popup, click **Inspect geometry**, retain JSON. Repeat for a user message. Then resize the window (or change zoom) and repeat both. Compare the relative placements; do not infer authorship from proximity alone. Results are viewport-dependent; selection may be offscreen, so select visible paragraphs. Check diagnostic output before sharing, as layout coordinates can reveal browsing layout.

## Experiment 001B.3 — user-authorized local selection capture
Pivot: explicit highlighting plus clicking **Capture selection** authorizes capturing the selected page text for local popup review only. It is **not** proof of message authorship or response completion and does **not** authorize automatic sending to another tab. The selected range must be nonempty, a single range, within the page, outside editable inputs, and no more than 12,000 characters. Existing stop-generation detection stays as a conservative block. No background sending, external requests, or persistence. The popup states these limits.

Next field test: select harmless text in the ChatGPT tab and click Capture selection; verify text appears **only in popup**. Repeat in Gemini. Confirm that highlighting text in the editor is rejected. Only after these pass should we design an explicit, preview-and-confirm delivery stage.

001B.2 geometry inspector remains available for optional investigation, with true viewport intersection now required for control visibility. Geometry never authorizes capture or sending.

## Experiment 001C — first manual tab-to-tab draft handoff
Select harmless text in the source tab, use Capture selection, then explicitly choose **Prepare draft in [destination]**. The extension transfers only the selected text to that specific tab's empty composer; it never submits a prompt. It refuses if the composer is nonempty, unavailable, or disabled, and attempts to verify inserted text. Browser contenteditable compatibility is untested and needs real Chrome trials on ChatGPT and Gemini. Each operation is user initiated; no session-wide monitoring, automatic reply capture, outgoing send, or persistent storage is added. Destination tab is activated after insertion to allow manual review and Send. Repeat in reverse direction after validating the first path.
