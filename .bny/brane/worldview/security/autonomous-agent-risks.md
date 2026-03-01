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
- **Mitigation gap:** human reviews PRs but may not review every brane eat/digest operation

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

## Gaps to Watch

- Input validation at spec level (garbage in, garbage out)
- No sandboxing of agent execution mentioned
- `--dangerously-skip-permissions` flag exists (seen in git history)
- No mention of secrets management or credential handling
- Symlink integrity — no validation that `bny/` points to trusted source
- `bny ai init` symlink creation not audited
- Brane eat/digest not gated by human review — poisoned sources propagate
- Constitution amendments enforced socially, not mechanically
