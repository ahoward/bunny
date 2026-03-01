# Worldview Knowledge Base

## Security
- [Autonomous Agent Risks](security/autonomous-agent-risks.md) — Attack surfaces (spec poisoning, guardrails bypass, supply chain, symlinkable tool directory), mitigations (antagonist review, test locking, blast radius limits, assassin cleanup), and gaps to watch

## Architecture
- [Dual-AI Loop](architecture/dual-ai-loop.md) — Claude implements, Gemini reviews, human gatekeeps; locked tests prevent self-weakening; Ralph retry loop with bounded iterations
- [Guardrails System](architecture/guardrails-system.md) — Four enforcement layers: guardrails.json constraints, git hooks, dev scripts pipeline, locked tests after review; append-only decision log for audit
- [Project Structure](architecture/project-structure.md) — Bun + TypeScript template with Unix philosophy; POD-only data, snake_case conventions, no frameworks; process management via assassin (cleanup) and ralph (retry); symlinkable bny/ tool directory; full command reference for dev scripts and bny CLI
