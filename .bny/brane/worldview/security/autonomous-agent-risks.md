# Security: Autonomous Agent Risks

## Attack Surface

### Agent-to-Agent Trust

- Claude implements, Gemini reviews — but both consume the same spec written by a human
- A poisoned spec could direct both agents toward insecure implementations
- The locked-test mechanism mitigates claude weakening its own tests, but doesn't prevent both agents from missing the same class of vulnerability

### Guardrails Bypass

- `guardrails.json` is the primary constraint mechanism — if an agent can modify it, all constraints are void
- It should be listed in its own `protected_files` (self-referential protection)
- Git hooks enforce `post_flight` but hooks can be skipped with `--no-verify` (the protocol forbids this but the system doesn't physically prevent it)

### Constitution Integrity

- The constitution defines foundational principles — if amended maliciously, all downstream behavior shifts
- Amendment process requires rationale documentation but enforcement is social, not mechanical
- Constitution should be in `protected_files` if not already
- Version bumps provide change detection but not prevention

### Brane Poisoning (Strange Loop Risk)

- The brane accumulates knowledge that influences what gets built next
- If poisoned data is eaten into the brane, it corrupts the worldview
- Subsequent `digest` operations propagate the poison through all lenses
- The loop amplifies: bad knowledge → bad specs → bad implementations → bad feedback → worse knowledge
- **Brane gate (iteration 001)** mitigates intake poisoning — see Mitigations below
- **Remaining exposure:** auto-confirm when not a TTY means piped/scripted intake bypasses the gate silently
- **Remaining exposure:** individual re-eats within `digest` auto-apply without per-source confirmation

### Brane Output Trust (Provenance Gap)

- `bny ask` queries the brane and returns LLM-generated answers
- **Source provenance (iteration 002)** adds citation of worldview files and their original sources to every answer
- Provenance is **prompt-enforced, not mechanical** — claude cites sources because the prompt instructs it to, not because the system parses or validates citations
- An LLM could hallucinate sources, omit sources, or attribute claims to the wrong worldview file
- No programmatic verification that cited sources actually contain the claimed information
- The provenance chain (worldview file → original source) depends on the source manifest being accurate — a corrupted manifest propagates false attribution

### Pipeline Orchestration (`bny next`)

- `bny next` runs the full pipeline (pre_flight → specify → plan → tasks → review → implement → post_flight → roadmap update) with a single human gate at spec review
- **Reduced oversight surface** — iterations 001-002 had multiple manual checkpoints; `bny next` collapses them to one. If a good-looking spec produces a bad implementation, the remaining gates are automated, not human
- **Review failure is non-fatal** — gemini's antagonist role can be silently skipped if unavailable. This means a full pipeline run can complete with zero adversarial review, and the human may not notice unless they check the output logs
- **Automatic roadmap mutation** — the orchestrator modifies `.bny/roadmap.md` and `.bny/decisions.md` on success. The system that decides what to build next also marks items as done. A successfully-run-but-subtly-wrong implementation gets checked off automatically
- **Broad authority concentration** — the orchestrator has execute access to every stage. A bug or exploit in `bny next` itself could cascade through the entire pipeline in a single invocation
- **`--dry-run` mitigates** — allows previewing the plan without executing, but only useful if someone actually runs it first
- **Second confirm on failure** — implementation failure triggers "continue anyway?" defaulting to No, which is the correct safe default

### Fully Autonomous Mode (`--auto` + `bny spin`)

- **`--auto` eliminates the last human gate** — the spec review checkpoint that `bny next` preserved is now skippable. The pipeline runs end-to-end without any human interaction
- **All existing guardrails still apply** (blast radius, gemini review, locked tests, post_flight), but the human checkpoint — the one gate designed to catch plausible-but-flawed specs — is gone
- **Detached execution via `bny spin`** — the factory runs in a tmux session without the human present. The human reviews output asynchronously, after the fact
- **Post-hoc review replaces pre-approval** — the security model shifts from "human approves before execution" to "human reviews after execution." This is fundamentally weaker: a bad implementation is already committed, merged, and marked done in the roadmap before the human sees it
- **Clean env stripping** — `bny spin` strips `CLAUDECODE` and `CLAUDE_CODE_SESSION` vars to avoid nested-session detection. This is necessary for tmux to work, but it also means the spawned session has no knowledge that it was launched programmatically rather than by a human. Any tooling that checks for nested sessions as a safety measure is bypassed
- **Duplicate detection is session-name-based** — `tmux has-session` prevents double-launch, but only for the same roadmap item. Multiple different items can spin concurrently, each autonomously modifying the codebase
- **Log-only observability** — spin output goes to `.bny/spin/{timestamp}.log`. If the human doesn't read the log, bad output persists unreviewed. There's no alerting, no summary, no diff of what changed
- **Feedback loop without verification** — the intended workflow is: spin → review log → write feedback → eat into brane → spin again. But the eat step is subject to all brane poisoning risks, and the spin step trusts the brane completely. A corrupted feedback cycle could compound across iterations with no human in the loop to notice drift

### Blast Radius Limits

- Max files/lines per PR bounds the damage from a single autonomous run
- But accumulated PRs could still introduce systemic issues if review is rubber-stamped
- **With `bny spin`, PRs may accumulate faster than humans review them** — the factory doesn't wait for review before starting the next item

### Supply Chain

- `bun install` in `./dev/setup` pulls external dependencies
- No mention of lockfile integrity checks or dependency pinning
- Agents could potentially add dependencies within blast radius limits

### Symlinkable Tool Directory

- `bny/` is explicitly designed to be symlinked across projects
- If symlinked from an untrusted source, all tool code (specify, plan, implement, review) could be malicious
- `bny ai init` creates symlinks for AI tool awareness — symlink targets should be validated
- A compromised `bny/` directory would control the entire development loop: spec generation, planning, implementation, and review orchestration

### Retry Loop (Ralph)

- Bounded iterations prevent infinite loops
- But each iteration generates code changes — the final state may carry artifacts from failed attempts
- No mention of clean-slate between retries

## Mitigations Present

- Antagonist review pattern (gemini as adversary)
- Test locking after review
- Blast radius limits
- Human checkpoints when stuck
- Append-only decision log for audit
- Protected files list
- Assassin process cleanup (prevents leaked child processes from autonomous runs)
- Constitution versioning (change detection for principle modifications)
- **Brane gate** — intake diff + human confirmation before worldview changes
  - `preview_operations()` computes line-level diff stats (added/removed/new/updated)
  - `print_intake_diff()` prints compact diff summary to stderr
  - `confirm_intake()` reads y/n from `/dev/tty` so it works even when stdin is piped
  - `--yes` / `-y` flag for explicit opt-out of confirmation
  - Digest requires confirmation before clearing worldview (destructive operation protection)
- **Source provenance in ask** — every answer cites worldview files and traces them to original ingested sources
  - Full source manifest (label + timestamp) passed to LLM in ask prompt
  - Structured `Sources:` footer on every response
  - Leverages `list_sources()` from iteration 001's stashing work
  - Prompt-enforced (social contract), not mechanically validated
- **`bny next` safety features**
  - `--dry-run` mode shows plan without executing
  - Implementation failure confirm defaults to No (safe default)
  - Bounded ralph iterations (`--max-iter N`, default 5)
  - All existing guardrails (blast radius, protected files, post_flight) still enforced within the pipeline
- **`bny spin` safety features**
  - Duplicate detection via `tmux has-session` (prevents double-launch)
  - `--dry-run` mode shows what would launch
  - Logs captured to `.bny/spin/` with `latest.log` symlink for easy review
  - Clean env is targeted (strips specific vars, not `env -i`) — preserves PATH, HOME, shell config
  - All existing guardrails still enforced within the spawned session

## Gaps to Watch

- Input validation at spec level (garbage in, garbage out)
- No sandboxing of agent execution mentioned
- `--dangerously-skip-permissions` flag exists (seen in git history)
- No mention of secrets management or credential handling
- Symlink integrity — no validation that `bny/` points to trusted source
- `bny ai init` symlink creation not audited
- Constitution amendments enforced socially, not mechanically
- **Brane gate auto-confirm on non-TTY** — piped/scripted `eat` operations bypass the gate without explicit `--yes`, which means automated pipelines skip the human review silently
- **Digest re-eats not individually gated** — after confirming the initial worldview clear, each source is re-eaten without per-source confirmation. A corrupted source in the manifest would be silently re-ingested
- **`--yes` flag is a social contract** — nothing prevents an autonomous agent from passing `--yes` to bypass the gate
- **Source provenance is prompt-enforced** — citations depend on LLM compliance, not mechanical extraction. An adversarial prompt or model error could produce false attribution without detection
- **No citation verification** — no system validates that cited worldview files actually support the claims attributed to them
- **Deferred: digest preview** — no dry-run mode to see what digest would change before committing
- **`bny next` reduces human gates to one** — spec review is the single checkpoint; a plausible-but-flawed spec passes the gate and the rest runs autonomously. The blast radius of a bad spec is now the entire pipeline, not just one step
- **Non-fatal review weakens the dual-AI pattern** — the antagonist review can be silently skipped, meaning `bny next` may complete a full run with only the implementor's perspective. No alert or warning is surfaced to the human when review is skipped
- **Automatic roadmap mutation** — the system marks its own work as done. Combined with non-fatal review, an unreviewed implementation could be marked complete in the roadmap. A human scanning the roadmap would see a checked item and might assume it was reviewed
- **Pipeline-as-single-invocation** — all stages run in one process. A crash, timeout, or partial failure mid-pipeline could leave the project in an inconsistent state (e.g., branch created but not implemented, or implemented but roadmap not updated)
- **`--auto` removes the last human gate** — the spec review that `bny next` preserved is now optional. With `--auto`, a bad roadmap item flows through the entire pipeline without any human checkpoint. The guardrails (blast radius, locked tests) constrain *how much* damage, but not *what kind*
- **Detached execution is post-hoc review** — `bny spin` shifts the security model from pre-approval to post-review. A committed-and-merged bad implementation requires active rollback rather than passive rejection
- **No alerting on spin completion** — the human must actively check logs. No notification when a spin finishes, succeeds, or fails. Silent failures could go unnoticed
- **Concurrent spins** — nothing prevents multiple spin sessions running simultaneously on different roadmap items, each autonomously modifying code. Merge conflicts and interaction effects between concurrent autonomous changes are unaddressed
- **Env stripping bypasses nested-session safety** — removing `CLAUDECODE`/`CLAUDE_CODE_SESSION` vars is necessary for tmux but eliminates any tooling that uses these vars to detect and restrict programmatic invocation
- **Compounding feedback loop** — the spin→review→eat→spin cycle is the strange loop at its most autonomous. Each cycle trusts the brane, which trusts the previous cycle's output. Drift or corruption compounds across iterations with diminishing human attention per cycle
