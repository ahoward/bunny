# Tasks: Harden brane file ops

- [x] Add `validate_op_path()` to `bny/lib/brane.ts` — check resolved path is within worldview_dir
- [x] Call `validate_op_path()` from `apply_operations()` — skip ops with bad paths, log warning
- [x] Call `validate_op_path()` from `preview_operations()` — skip ops with bad paths
- [x] Fix `confirm_intake()` in `bny/lib/brane.ts` — try/finally for /dev/tty fd, static imports
- [x] Fix `confirm()` in `bny/next.ts` — same try/finally pattern
- [x] Validate parseInt/parseFloat in `bin/bny.ts` `parse_args()` — reject NaN with error message
- [x] Validate parseInt in `bny/next.ts` `--max-iter` — ignore invalid values
- [x] Run `./dev/test` — 139 pass, 9 pre-existing fail, no regressions
