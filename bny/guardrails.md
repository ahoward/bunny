# Guardrails

Machine-readable constraints for autonomous agents. Source of truth: `guardrails.json`.

- **protected_files** — agents must never modify these without human approval
- **protected_patterns** — glob patterns for files that must not be deleted
- **blast_radius** — limits on how much a single PR can change
- **forbidden_actions** — actions that are never allowed autonomously
- **require_human_approval** — actions that need explicit human sign-off
