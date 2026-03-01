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

### Blast Radius Limits

- Max files/lines per PR bounds the damage from a single autonomous run
- But accumulated PRs could still introduce systemic issues if review is rubber-stamped

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
