Run `bny spin $ARGUMENTS` and report the result.

This launches an autonomous factory run in a detached tmux session. Common flags:
- `--attach` — launch and attach to watch live
- `--log` — tail the latest spin log
- `--dry-run` — show what would launch
- `--max-iter N` — set ralph retry count

Show the user the session name and log path on success.
