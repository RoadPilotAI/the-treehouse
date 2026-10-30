# Experiment 004: reviewed return staging (draft)

**Not autonomous reply capture. Not live-tested.** This experiment builds a durable handoff for a single selected Gemini reply while retaining the working bounded submission in PR #4.

## Workflow
1. Load branch extension; reload in Chrome and refresh both AI tabs.
2. Generate a harmless Gemini reply and wait for it to stop. **Manually check the response is complete and from Gemini.**
3. Highlight *only* the intended reply text (1–500 characters) in Gemini, open Treehouse, select **Stage Gemini selection**.
4. Treehouse stores the selection in Chrome local extension storage. No message is sent yet.
5. Check the selected text in Gemini. With an empty ChatGPT composer, select **Approve & send once**. Explicit confirmation is mandatory.
6. Verify in ChatGPT that it received the exact text. A cleared composer is not proof of provider receipt.
7. **Discard queue** after review. A sent/attempted item cannot be sent a second time until discarded and restaged.

## Boundaries
- The selection adapter explicitly returns `completion:not-verified`. User verifies author/completion; observer UNKNOWN never triggers forwarding.
- Message content is plain data. Background control actions only from extension UI, not content scripts.
- The queue stores content **locally** in `chrome.storage.local`; unlike earlier experiments, text persists across browser restarts until discarded.
- State transitions to `attempted` **before** the destination Send attempt. If chrome dies midway, it remains locked against automatic replay; never retry without human inspection.
- No continuous loop, no automatic capture, no external backend/API, no background sends, and no unattended operation.
- The first Gemini and ChatGPT tabs found are used; **with multiple tabs per service, verify the intended tabs before testing**.
- Limit remains 500 characters in destination actuation. Full-length return remains future work.

## Open engineering work
Stable assistant-role extraction in Gemini, positive completion evidence, exact reply provenance, and tests of service-worker restart, multi-tab ambiguity and stale tab selection are required before automatic capture and dispatch.
