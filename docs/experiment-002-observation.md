# Experiment 002 — Observation-only response lifecycle probe

**Status:** First field observations succeeded on both platforms. A confirmed manual Stop in ChatGPT was misclassified as probable completion; evidence-first fix implemented but not yet field-tested. This PR is stacked on `experiment/001a-extension-scaffold` (PR #2) and does not imply its merge.

## Design
- Injects `observer.js` into ChatGPT and Gemini pages from the MV3 manifest, alongside the unchanged manual capture/prepare adapters.
- Observes DOM mutations, but reads only the **presence/visibility of known stop-generation controls or `aria-busy="true"` markers**.
- A transition from no signal to a visible signal emits `RESPONSE_START` and increments a page-local sequence number. This may represent an already-active generation detected at startup.
- While active, throttles `RESPONSE_UPDATE` reporting to at most approximately once per second; telemetry contains only mutation counts.
- Disappearance of observed active indicators begins a short 350ms debounce, cancelled if the signal returns. It emits `GENERATION_ENDED`, then either `RESPONSE_INTERRUPTED` if a trusted Stop-button click was observed during that generation, or `RESPONSE_STATUS_UNKNOWN` otherwise. Neither outcome authorizes forwarding.
- A capturing-phase click listener observes trusted clicks on known provider Stop controls. The listener does not click, cancel, or change provider behavior. Keyboard interruption, inaccessible Stop controls, provider errors, and site UI changes can still yield `RESPONSE_STATUS_UNKNOWN`.
- A boolean `actionFooterPresent` is logged as weak supporting evidence only. It does **not** establish completed response ownership or natural finish. No automatic `RESPONSE_COMPLETE` event is emitted.
- Background logs bounded metadata only: provider, source tab ID, event, page-local sequence, elapsed milliseconds, signal name and mutation counts. No selected text, message content, DOM HTML, URLs, stored transcript, or automatic submit.
- The main UI and manual transport behaviour remain unchanged.

## Browser test protocol

1. Update an unpacked extension from `experiment/002-observation-probe`, reload at `chrome://extensions`, and refresh both AI tabs.
2. On the Treehouse extension card, choose **Service worker → Inspect** to open the background console and watch `[Treehouse observation]` entries.
3. Run at least five **harmless normal responses per provider**. Check `RESPONSE_START` → optional `RESPONSE_UPDATE` → `GENERATION_ENDED` → `RESPONSE_STATUS_UNKNOWN`, with no false assertion of completion.
4. During a long response, click the visible **Stop generating** button with the mouse. Look for `STOP_CLICK_OBSERVED` → `GENERATION_ENDED` → `RESPONSE_INTERRUPTED` (same sequence). Do not expect an actual completion classification.
5. Try very short responses, regenerations, idle tab switching, and tab refresh. Record observed vs logged sequences.
6. Record missed starts/ends, incorrect Stop-click detection, premature end signals and idle false positives. Distinguish unobserved interruptions from normal ends; both may legitimately be UNKNOWN until better evidence exists.
7. Confirm the experiment does not alter composer contents, send requests, persist transcripts, or display any response text in the console.

## Interpretation / limitations
- A generic `aria-busy` marker elsewhere in the page can cause **false positives**. Controls vary as providers update their UI.
- An indicator absent throughout an extremely short generation gives **false negatives**. Inactive UI changes are observed at the mutation level but should produce no lifecycle events.
- A trusted click on known Stop controls provides strong interruption evidence. Absence of such a click does **not** prove completion. Keyboard/programmatic interruption and unknown provider signals remain unclassified.
- Background console disappears across MV3 service-worker suspension; it is an exploratory log, not durable evidence.
- The 350ms debounce prevents rapid flicker from creating a completion event but is **not** a standalone time-based completion detector.
- The observer never emits an event authorizing autonomous forwarding. No acceptance threshold is established from implementation alone. Collect field measurements first; adjust selectors and observer scope based on results.

## Security boundary
Content scripts are host-limited. Background checks sender hostname, tab presence, allowed event names, and numeric bounds. Model output text is never interpreted as extension control instructions.

## Recorded experiment evidence
- ChatGPT sequences 5 and 6 emitted start, updates and probable-end telemetry in the original observer, at approximately 7.5s and 14.6s.
- Gemini sequence 2 likewise emitted start, updates, and probable end at approximately 97.2s.
- ChatGPT sequence 12: Norm manually pressed Stop during a long generation. The original observer incorrectly emitted `PROBABLE_RESPONSE_COMPLETE` at approximately 41.6s. This motivated the evidence-first change; the new code still requires field validation.
