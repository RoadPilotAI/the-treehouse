# Experiment 003 — bounded seed actuation (PR #4)

**Status:** Code written, **not yet field-tested**. Draft branch stacked on PR #3's experimental branch. Do not merge or use with sensitive messages.

## What is implemented
- Popup control selects a supported destination tab, accepts a **user-authored seed of 1–500 characters**, and asks for an additional confirmation before it attempts one submission.
- Background service worker validates two distinct ChatGPT/Gemini tabs and allows **at most one seed click attempt** for this stage. Control messages cannot originate from page content scripts.
- Target adapter refuses to overwrite a nonempty composer; inserts the seed, demands exact readback, and clicks Send only if exactly one enabled known Send control is present.
- No keyboard/Enter fallback, no retry, no autonomous extraction or reply forwarding. A response ending as UNKNOWN or INTERRUPTED halts the session.
- Stop button prevents *subsequent Treehouse actions*; **it cannot retract a submission already clicked**.
- The existing manual bridge remains available.

## Safety qualifications
- A successful `element.click()` call **does not prove provider acceptance**. The interface may ignore synthetic clicks, change selectors, or mutate its editor state. Test with harmless text only.
- An ambiguous insertion can leave a draft already entered. Never blindly press Start again.
- Session state is **in memory**, not persisted. MV3 service-worker suspension or reload discards it; this is a fail-stop prototype, **not** a durable five-exchange runtime.
- The current background uses destination-tab events as evidence, not authenticated assistant message identity. There is no completion signal capable of safely triggering relay, so **the router explicitly does not forward responses**.
- Provider UI and automated interaction rules must be checked before real-world broader deployment; stop if access is blocked or service indicates a restriction.
- No data sent to any server by Treehouse itself; a clicked Send submits the seed to the chosen AI service in the browser.

## Live test
1. Keep PR #2/#3 unchanged. Download branch `experiment/003-bounded-handshake`; update the unpacked extension directory, reload it, and **refresh both AI tabs**.
2. Use two separate existing harmless chat sessions and ensure the **destination composer is empty**. Keep the service-worker console open.
3. Open Treehouse popup. Select Gemini as destination and enter `TREEHOUSE TEST 003: Reply with OK.`.
4. Click **Start one-seed session**, confirm the explicit SEND warning, and observe the destination tab.
5. Check that exactly one user prompt appears in Gemini and a reply is generated. If the draft remains unsent, stop and record it—do not retry.
6. Inspect popup status and console. On a completed response the coordinator should halt with `RESPONSE_STATUS_UNKNOWN`, **not** automatically forward it. Test Stop control separately.
7. Repeat the opposite direction only after reviewing the first result. Observe provider-level errors and whether the exact composer content was retained.
8. Do not use an unattended loop, private conversations, or sensitive material.

## Next gates for true autonomy
- Verify provider-specific message ownership and stable response extraction.
- Establish a positive completion signal or another explicit authorizing checkpoint; UNKNOWN must never initiate forwarding.
- Add persistent session state and replay/idempotency protection across MV3 service-worker restarts.
- Verify an actual Send action was accepted, not merely that DOM click was attempted.
- Add durable event ledger, bounded routing and a reliable global Stop mechanism before increasing the exchange budget.
