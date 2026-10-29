# Treehouse — Experiment 001C: manual two-way transport

## Status (28 October 2026)

**Field-tested by Norm in Chrome:** The extension recognized both open AI tabs; text highlighted in ChatGPT was captured and inserted into Gemini's composer; selected Gemini text was inserted into ChatGPT's composer. Norm reviewed and manually sent the drafts. A temporary false mismatch occurred after successful insertion into ChatGPT, prompting a fix that reports **inserted but unverified** and switches to the destination for review. Norm subsequently reported that the handoff worked in both directions.

**Not proven:** Byte-for-byte fidelity for all rich text, multiline content and Unicode; reliable message author identity or generation completion; unattended delivery, automated submission, queued messages, or session continuity. The field test is *manual draft transport*, not autonomous AI conversation.

## How to test the current branch

1. Download branch `experiment/001a-extension-scaffold` and load its `extension` directory unpacked in Chrome. On updates, reload in `chrome://extensions` and refresh both chat tabs.
2. Open ChatGPT and Gemini chats with **empty destination composers**.
3. Highlight a harmless passage in the source tab. Open Treehouse, select **Capture selection** for the corresponding source tab, and review the preview.
4. Press **Prepare draft in [destination]**. Treehouse tries to put the captured passage into the selected destination tab and activates the tab for inspection.
5. Review the complete draft **before clicking Send yourself**. If Treehouse reports `reviewRequired`, text may already be inserted—**do not click Prepare again**, and inspect it for differences.
6. Repeat in reverse. Test ordinary and multiline text separately; retain observations if the editor changes formatting.
7. Confirm the tool refuses to replace an occupied destination composer or capture text selected inside an editable input. Do not test with sensitive chat content.

## Current behaviour and security boundary

- User gesture required to capture selection; another explicit click required to prepare a destination draft.
- Destination chosen from currently open supported tabs; no automatic submission, polling, cross-site HTTP calls, persistent transcript, or background relay.
- Capture rejects empty/multiple selections, input/editor selections (at either endpoint), and text greater than 12,000 characters.
- Draft preparation refuses nonempty or disabled composer where detected, and attempts an exact-text readback.
- The readback can differ due to site editor normalization; an inserted-but-unverified result is shown distinctly from outright failure.
- The extension uses the user's existing logged-in web sessions. Text shown as coming from Norm's account is **not** authenticated as a particular AI author.
- Selected content is untrusted text. No model response may set permissions or alter extension controls.
- Composer insertion depends on changing, provider-specific DOM implementations; user observation is the present validation method.
- The extension has a broad `tabs` permission and host-limited content scripts. Future permission minimization should be considered before distributing beyond the owner's test environment.

## Deferred exploratory diagnostics

ChatGPT-only **Inspect selection** and **Inspect geometry** remain as explicitly invoked, structural-only debugging aids. They helped establish that DOM ancestor proximity and action-bar buttons do **not** prove authorship. Geometry now filters out-of-viewport controls. Neither diagnostic authorizes message capture or submission.

## Known limitations / review tasks

- **Input semantics:** `document.execCommand("insertText")` is deprecated and editor-specific; the tested editor may reformat whitespace or render inserted text differently.
- **Destination identity:** The popup relies on URL hostname and tab ID. It does not enforce that destination and source represent different providers, or that a specific intended conversation is active.
- **Potential stale selection:** Captured text is held in popup memory until the popup closes; the selection and destination can change between user actions.
- **Error states:** Some insertion errors may occur after partial text insertion; never auto-retry without checking destination.
- **Stop-generation indicators:** Heuristic only; response completion is not verified.
- **No automated response detection, submit action, identity protocol, or kill switch exists.**

## Next step — PR #3 proposal

Once PR #2 is reviewed and explicitly approved for merge, prototype **observation-only** reply lifecycle telemetry using targeted `MutationObserver` callbacks. No conversation-text logging, automatic capture, injection, or submission in that PR's initial scope. Test against real browser sessions and record false-positive/false-negative observations before considering autonomous routing.
