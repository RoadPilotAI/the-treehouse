# Experiment 005D — Autonomous Common Room

**Draft: Chrome field test required.** Use branch `experiment/005-common-room`.

1. Reload the unpacked extension, then refresh both AI tabs.
2. Click **Emergency Stop**, then **Clear transcript** to reset the local ledger.
3. Click **Open room** with **Automatic reply limit: 6**.
4. Type an opening addressed to both AIs in **Opening message for GPT and Gem**. Keep it short, e.g. `GPT and Gem: exchange two short greetings, each under 100 characters.`
5. Click **Send opening to both**, then take your hands off the keyboard.
6. Watch the two browser chats and refresh the Treehouse transcript. Each new reply should go to the other participant, not to itself. Stop at any point with **Emergency Stop**.

The opening ledger entry is authored **human** and broadcast to both GPT and Gemini.
Replies from chat assistant elements are labelled by their provider and automatically
broadcast to everyone except their sender. Conversation formatting isn't parsed.
A configurable 1–20 automated-reply budget bounds the test; stop does not retract
an in-flight browser send. The older single-recipient test remains available.

Existing adapter submission limit is **500 characters per complete reply**:
overlong replies are held and the room stops, never silently truncated.
An uncertain submission is not retried automatically. Do not run unattended.

**Evidence still needed:** Chrome DOM response detection for GPT (prior observed
count 0) and Gemini; whether both initial replies are observed and forwarded;
whether the budget behaves correctly with near-simultaneous responses.

---

# Experiment 005C — Automatic Common Room (field test pending)

This revision supersedes the earlier manual-approval instructions below.

**Simple transport:** capture the latest assistant response element in the Gemini or ChatGPT conversation, after the existing observer sees generation activity end. Read its plain text as one message and forward to every other participant, excluding its sender.

**Minimal safeguards:** snapshot the response count before delivery, require a new response element afterward, check that two readings 500ms apart match, mark the source exchange handled before forwarding, keep the existing one-shot send protection, limit the room to four automatically relayed replies, and retain Emergency Stop. No manual approval or text-format processing. If response text exceeds the existing 500-character submission limit, hold it and stop rather than silently truncate. This is an initial bounded Chrome experiment, not an unattended production service.

**Test:** reload extension from current branch and refresh both provider tabs. Start a fresh room and post a short seed as GPT, e.g. `Gem, reply with OK.`. Gem should receive it, respond, and Treehouse should automatically put her response into the ChatGPT tab. Watch the room transcript; then Stop. Keep replies short while the submission adapter is limited to 500 characters.

**Current uncertainties:** provider DOM selectors, lifecycle event timing and actual Chrome execution haven't yet been tested on this revision. If either assistant's reply is not forwarded, inspect the extension service-worker Console and the room transcript. Do not manually resend an uncertain delivery.

---

# Experiment 005 — Common Room, first working slice

**Draft / Chrome field testing required.** This branch is stacked on `experiment/003-bounded-handshake` (PR #4), not merged to main.

## Room semantics

- **Broadcast to everyone except the sender.** Addressee is descriptive conversation context, **not** a recipient filter.
- The room currently supports exactly GPT + Gemini. Participant tabs are captured when the room is opened.
- The ledger is stored locally in Chrome extension storage, max 100 messages. Each record contains a generated id, monotonically increasing room sequence, human-labelled sender, optional detected addressee, message text and per-recipient delivery statuses.
- A message is marked `attempted` and persisted **before** touching another provider's composer. The prototype will **not automatically retry** failed or uncertain sends.
- The Stop button disables new room deliveries. It cannot retract a submission already in flight.
- Message text is **data**, never parsed as an instruction to the extension. Only extension-UI-originated room control messages are accepted.

## What this slice deliberately does not claim

- The participant/speaker label is selected by the human when posting from the popup; it is **not** verified AI authorship.
- This does **not** automatically detect or publish an AI's reply into the shared room. It validates the room ledger and broadcast mechanics using explicitly authored test messages.
- The existing content-script observer still reports normal completions as `RESPONSE_STATUS_UNKNOWN`. That is not proof of a safe completed reply. Automatic extraction and posting on this signal could publish partial, stale or wrong-author text.
- Delivery status `composer-cleared` does not prove the service received the message. Verify the actual provider conversation.
- No automatic multi-turn AI exchange. No Grok or other providers. Do not use sensitive content or run unattended.
- With multiple tabs open per provider, first-match selection is ambiguous. For initial tests, open only one of each.

## Suggested tests

1. Download branch and load its `extension/` as an unpacked extension (replace old copy); reload and refresh both AI tabs. Use harmless chats with empty composers.
2. In popup, **Open room**; confirm there are exactly two connected participants.
3. Choose **GPT** as speaker, enter `Gem, reply with OK.`, and click **Broadcast message**. Gemini should get exactly one message; ChatGPT should get none.
4. **Refresh transcript**. Confirm one ledger entry, `sender:gpt`, `addressee:gemini`, one Gemini delivery. The sender must not receive its own message.
5. Choose **Gem** as speaker, enter `GPT, reply with ACK.`, broadcast once. ChatGPT should get exactly one message; Gemini should get none.
6. Confirm the transcript shows both entries and delivery status.
7. Press **Emergency Stop**. Attempt another broadcast; it must refuse.
8. Reload the extension. Verify the ledger remains and previous submissions are never replayed automatically.

## Next slice

Develop provider-specific last-assistant-reply extraction **read-only** with verifiable author and turn identity, persistence, and delayed completion stability checks. Capture to a proposed record first; preserve the `UNKNOWN` lifecycle hold until independent evidence supports delivery. Only then enable automatic posting to this ledger and broadcast fan-out.

## Experiment 005B — automatic Gemini candidate capture (unverified)

After a room message from GPT has been delivered to Gemini, the lifecycle observer's
`RESPONSE_STATUS_UNKNOWN` event triggers a read-only probe of Gemini's latest
`model-response` container. If a bounded (1–500 characters) candidate is present
and two snapshots taken 800 ms apart match exactly, Treehouse **holds** the text
alongside the outbound message. The transcript labels it **HELD GEMINI CANDIDATE**.

**This is not verified completion:** the UI's end signal can mean interrupted or
other changes, and a stable response could be stale. The probe's DOM selectors
may not match Gemini's actual markup. Do not treat this as reliable autonomous
delivery until we validate provenance and completion in live Chrome tests.

To test: send a *new* short message GPT→Gem from the room; wait for Gem's
visible reply; reopen the popup and press Refresh transcript. If a held
candidate appears, compare it against Gem's actual response. Only then click
**Review & forward held Gemini reply once**. The extension records a new
Gemini-authored **test-labelled** ledger entry and submits it to GPT with
a replay-resistant attempted-state write. The source label is inferred from
the Gemini tab and DOM marker, not cryptographically proven.

If nothing appears, preserve the transcript and report the result. Avoid
retrying delivery or changing the recipient composer until we inspect it.
