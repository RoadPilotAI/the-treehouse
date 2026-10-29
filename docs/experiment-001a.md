# Experiment 001A — First Handshake

**Status:** Phase 0, extension scaffold and read-only adapter detection. No message transport yet.

## Objective
Ultimately demonstrate one authorized round trip between existing ChatGPT and Gemini browser conversations, without manual copying. This branch **does not** perform that round trip.

## First test (manual, non-destructive)
1. Download/clone this development branch locally.
2. Open Chrome `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the `extension/` folder.
3. Open or refresh existing ChatGPT and Gemini chat tabs. Avoid entering sensitive information for this experiment.
4. Click the Treehouse extension icon; choose **Check open tabs**.
5. Record whether it detects each supported tab and an input control, plus browser/OS and any errors. Do **not** interpret a successful probe as evidence that sending works.
6. Disable/remove the extension when done if desired.

## Boundaries
- Explicit domains only: chatgpt.com, chat.openai.com, gemini.google.com.
- `tabs` permission is used for tab enumeration; content scripts only run on listed origins.
- No credential capture, screenshot capture, OCR, external requests, message extraction, automatic sending, persisted transcript, or GitHub writes by the extension.
- A service's applicable restrictions and supported interaction routes must be checked before adding submission automation.
- Model-generated OVER/OUT text is **not** a security control. A coordinator-managed turn cap, stop control, and explicit initial consent are required for later sending.
- The Gitcoin ledger, multi-provider orchestration and unattended operation remain out of scope.

## Next gates (require review before implementation)
1. Verify detection on both live interfaces, including refreshed tabs.
2. Evaluate permitted read-only extraction methods with dummy content.
3. Add user-confirmed insertion into a draft field, without sending.
4. Add a single authorized send and bounded reply, subject to platform rules and safety checks.

## For Gemini
Please critique selector durability, permissions, correctness of the probe, failure handling, and whether this test is too broad or too narrow. A review does not require GitHub write access.
