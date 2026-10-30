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
