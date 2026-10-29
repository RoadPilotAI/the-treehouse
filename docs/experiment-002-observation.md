# Experiment 002 — Observation-only response lifecycle probe

**Status:** Implemented for exploratory Chrome testing; **not field validated**. This PR is stacked on `experiment/001a-extension-scaffold` (PR #2) and does not imply its merge.

## Design
- Injects `observer.js` into ChatGPT and Gemini pages from the MV3 manifest, alongside the unchanged manual capture/prepare adapters.
- Observes DOM mutations, but reads only the **presence/visibility of known stop-generation controls or `aria-busy="true"` markers**.
- A transition from no signal to a visible signal emits `RESPONSE_START` and increments a page-local sequence number. This may represent an already-active generation detected at startup.
- While active, throttles `RESPONSE_UPDATE` reporting to at most approximately once per second; telemetry contains only mutation counts.
- Disappearance of observed active indicators begins a short 350ms *debounce*, which is cancelled if a signal returns; emits `PROBABLE_RESPONSE_COMPLETE` only if indicators remain absent. This is **a heuristic**, not verified completion.
- Background logs bounded metadata only: provider, source tab ID, event, page-local sequence, elapsed milliseconds, signal name and mutation counts. No selected text, message content, DOM HTML, URLs, stored transcript, or automatic submit.
- The main UI and manual transport behaviour remain unchanged.

## Browser test protocol

1. Update an unpacked extension from `experiment/002-observation-probe`, reload at `chrome://extensions`, and refresh both AI tabs.
2. On the Treehouse extension card, choose **Service worker → Inspect** to open the background console and watch `[Treehouse observation]` entries.
3. Run at least five **harmless normal responses per provider** and record actual visible start/end against emitted lifecycle events.
4. Try a long streaming response, a very short response, a regenerated response, an interrupted response (click Stop), switching tabs, and refreshing while generation is active.
5. Record missed starts/completions, premature completions and false signals during idle UI changes; compare against manually observed response lifecycle.
6. Confirm the experiment does not alter composer contents, send requests, persist transcripts, or display any response text in the console.

## Interpretation / limitations
- A generic `aria-busy` marker elsewhere in the page can cause **false positives**. Controls vary as providers update their UI.
- An indicator absent throughout an extremely short generation gives **false negatives**. Inactive UI changes are observed at the mutation level but should produce no lifecycle events.
- A user interruption is not distinguishable from a normal completed response with the current signals.
- Background console disappears across MV3 service-worker suspension; it is an exploratory log, not durable evidence.
- The 350ms debounce prevents rapid flicker from creating a completion event but is **not** a standalone time-based completion detector.
- No acceptance threshold is established from implementation alone. Collect field measurements first; adjust selectors and observer scope based on results.

## Security boundary
Content scripts are host-limited. Background checks sender hostname, tab presence, allowed event names, and numeric bounds. Model output text is never interpreted as extension control instructions.
