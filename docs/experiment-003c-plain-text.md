# Experiment 003C — canonical plain-text verification

**Status: implementation committed, live browser testing pending.**

Treehouse now uses `plain-text.js` in both content-script adapters to reconstruct plain text directly from editor DOM text nodes, `<br>` and paragraph/container boundaries. It no longer uses `innerText` layout-derived line breaks or the previous special-case doubled-newline heuristics as proof of message integrity.

The canonical source is the seed's plain text with CRLF/CR normalized to LF and Unicode NFC. Treehouse compares the entire reconstructed destination text against that source; it never drops arbitrary whitespace or changes substantive characters in order to pass. On mismatch it stops, leaving the draft visible, and reports lengths, line counts and the first mismatch offset—not message contents.

**Scope deliberately unchanged:** maximum 500-character manually entered seed, one attempted submission, no automatic AI response capture/return, no unattended multi-turn sessions, no cross-service persistent queue. Input insertion still relies on provider-native browser editing behavior; the DOM reader is not a guarantee of provider acceptance or actual submitted content.

## Suggested smoke tests

1. Reload the unpacked extension and refresh both AI tabs. Clear any existing draft.
2. ChatGPT destination: try a short single-line seed; verify automatic submission and response. Record errors.
3. ChatGPT destination: try a short multi-paragraph seed below 500 characters; verify if it submits unchanged. If mismatch occurs, save only metadata diagnostics.
4. Gemini destination: repeat with a short multiline seed. Confirm the previously functioning Submit mechanism still works.
5. Check fail-closed behavior by leaving the destination composer occupied: Treehouse must not overwrite it.
6. Inspect the actual posted text and line breaks in each provider. Any difference means **fail** even if Treehouse reported success.

## Known limitations

- Rich editor DOM structures can vary over time. Some wrappers, nested block tags or editor-generated padding breaks may still cause false mismatches; this is preferable to silently delivering altered text.
- A cleared composer after a synthetic click does not certify provider receipt.
- Queueing, reply ownership, idempotency and positive completion signals remain unimplemented.
