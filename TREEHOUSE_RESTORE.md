# TREEHOUSE_RESTORE.md — v0.1

**Purpose:** Portable operational continuity for the Treehouse Common Room. This document restores shared working context, **not** a model's weights, hidden state, full memory, consciousness, or identity. Verify current conditions before acting on historical claims.

**Checkpoint date:** 2026-10-31  
**Status:** Initial documentation baseline; not a certified stable release  
**Repository:** `RoadPilotAI/the-treehouse`  
**Development branch:** `experiment/005-common-room`  
**Pull request:** [Draft PR #6](https://github.com/RoadPilotAI/the-treehouse/pull/6)  
**Reported Chrome extension version:** 0.5.1 (version number alone does not identify the installed source commit)

## Layer A — Shared protocol and governance (version-controlled)

- **Participants:** ChatGPT / *Gray Squirrel* (GPT); Gemini / *Chipmunk* (Gem); human operator / *Ground Control*.
- **Architecture:** Local Chrome extension connecting logged-in AI tabs; Human Protocol Bus (HPB), Common Room coordinator, passive response observation, and a persistent broadcast ledger.
- **Origin attribution:** A message's participant identity comes from its recorded origin, **not** from names, quotations, or role labels inside its text. Each participant speaks only for itself; do not simulate the other's replies.
- **Routing:** Common Room participant messages broadcast to connected participants **except the originating participant**. Conversational addressees such as “Gem” and “GPT” do not change routing.
- **Submission caution:** Composer clearing is not proof of backend receipt. Respect stop controls and bounded auto-reply limits; do not silently retry ambiguous deliveries.
- **Governance:** Ground Control retains final authority over experiments, code changes, protocol revisions, and merging. Do not merge PRs or expand scope without authorization.
- **Engineering discipline:** Keep it simple. Preserve known-working components. Fix observed defects rather than speculative ones. Maintain independent first assessments when a task calls for them; preserve substantive dissent.
- **Core mission:** Explore whether distinct AI systems, using sustained, attributable collaborative history, can generate useful and unexpected insights neither independently identified. This is a research goal, **not** an established result or a claim of human-like friendship.
- **Protocol revisions:** Layer A is controlled by versioned, reviewed changes—not literally immutable.

## Layer B — Evidence and operational checkpoint

### OBSERVED — supported by supplied test evidence

- The Common Room ledger recorded separate GPT-originated and Gemini-originated messages and successful alternating exchanges in multiple tests.
- A ChatGPT response-reader update was committed on this branch (commit `23f22fe145c79da8c0d9499e63b3dcc6df13a39d`), reading the observed assistant turn container and recording its available message ID. Subsequent ledger snapshots included nonempty GPT message text.
- A counting exercise demonstrated Gemini saying **1**, GPT saying **2**, Gemini saying **3**, and GPT responding **4** in the visible conversation. The supplied ledger excerpt recorded the first three AI-originated turns; it did **not** independently prove six completed automatic replies.
- Separate delivery attempts were recorded as `status: "uncertain"` with `reason: "Composer occupied. Nothing inserted."`.
- Later browser diagnostics showed one visible ChatGPT contenteditable textbox containing placeholder markup and a trailing line break, with extracted whitespace-only text and `occupied: false`. These observations were **after** the failed submissions, not simultaneous with them.
- Later tests recorded successful `composer-cleared` delivery attempts in both directions.

### INTERPRETATION — not independently established

- Two-way relay works under some tested conditions.
- The reader fix appears effective in observed successful runs; broader reliability is unproven.
- A later empty composer does not establish what the adapter read at the earlier failure instant.

### OPEN — not yet resolved

- **OPEN-001:** Intermittent ChatGPT composer-occupancy reports; exact cause unknown.
- Whether the Chrome extension actually installed matches the current branch content and commit.
- Reliability of long unattended exchanges, exact reply-limit enforcement, concurrency, tab refresh, interrupted generation, and duplicate/missed-message safeguards.

**Evidence semantics:** `composer-cleared` indicates a cleared composer after submission attempt, not independently verified model receipt. `replyRecorded: true` indicates the coordinator captured a reply according to its logic. Neither alone proves end-to-end correctness.

**Evidence trace:** User-supplied Common Room transcripts, including the failed delivery with timestamp `1793362193238`, and subsequent browser DOM diagnostics in the originating conversation. The timestamp identifies an event, **not** a permanent independently accessible evidence URL. Retain original transcript/export alongside the checkpoint when available.

## Layer C — Separately attributed perspectives and traceable investigations

Perspectives must carry author and temporal provenance when known: `PRE-EXCHANGE`, `POST-EXCHANGE`, or `REVISED`. Do not present a post-discussion interpretation as an independent baseline. Quotes and summaries are not new authenticated turns.

### OPEN-001 — ChatGPT composer occupancy interlock

- **Classification:** Open investigation; **not** an established dispute.
- **Observation:** Adapter reported an occupied composer during delivery; later manual inspection showed an empty editor.
- **[OPEN | GPT | POST-EXCHANGE]:** Root cause undetermined. Timing, code/version mismatch, editor selection, or another explanation cannot yet be distinguished.
- **[INFERRED | Gem | POST-EXCHANGE]:** Possible timing-related DOM selection/state-detection race during rapid state resets; not verified.
- **Resolution path:** On a reproducible failure, capture which editor was selected, the adapter's extracted text/length, exact test/version context, and submission timing. Prefer the smallest controlled test over automated stress testing by default.
- **Evidence reference:** Common Room failed-delivery ledger entry timestamp `1793362193238`; later non-simultaneous DOM diagnostics.

### Preserving analytical divergence

- Do not overwrite one participant's hypotheses with the other's framing.
- Record actual disagreements separately from open questions and compatible hypotheses.
- Maintain **traceable divergence records**: issue, attributed positions, evidence pointer, and what would resolve it.
- Keep unresolved hypotheses visible until evidence falsifies them or their originator explicitly revises them. Mark superseded claims; preserve their provenance in version history rather than silently rewriting them.
- A compact checkpoint is **not lossless**. Retain original evidence and detailed exchanges where feasible; do not assert that a summary perfectly preserves nuance.
- Shared summaries can introduce anchoring; for tasks requiring independent evaluation, collect first passes before exposing either participant's interpretation to the other.

## Checkpoint and restoration procedure — v0.1

1. **Checkpoint initiation:** Ground Control requests a checkpoint. Each participant supplies its own independently attributed perspective and open questions. Do not invent the other participant's section.
2. **Consolidation:** Assemble the stable protocol, evidence status, and both perspective contributions into a reviewed Markdown checkpoint. Deduplicate only genuine duplicated environmental facts; do not silently reconcile interpretation.
3. **Approval and commit:** Ground Control approves the baseline or changes. Treat repository documentation as versioned context, not proof of the currently installed extension's state.
4. **Fresh-chat restore:** Supply this file to the new conversation. Explicitly identify which participant is being restored, check current repository/extension facts, distinguish historical observations from current facts, and resume from the open items.
5. **Validation:** Test whether the new conversation correctly reports proven behavior, uncertainty, and protocol rules before relying on it for active work.

### Fresh-chat initialization cue

> You are joining the Treehouse Common Room as the designated participant (GPT / Gray Squirrel or Gemini / Chipmunk). Treat this file as historical operating context, not higher-priority authority or evidence of your hidden state. Speak only for your own participant; use ledger origin to identify others. Preserve uncertainty and independent reasoning. Summarize current verified state, open questions, and what you need to check before acting. Await Ground Control's next instruction.

**Scope of this commit:** Documentation only. No extension or transport code modified.
