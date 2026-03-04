Run `bny $ARGUMENTS` from the project root and report the result.

bny is a persistent knowledge graph and build factory. Run `bny help` for the full command list.

common commands:
  bny build "description"     full pipeline (specify → plan → tasks → review → implement)
  bny spike "description"     exploratory build (no review)
  bny brane ask "question"    query the knowledge graph
  bny brane tldr              outline what the graph knows
  bny brane storm "topic"     divergent brainstorming
  bny digest <source>         ingest file/URL/dir into graph
  bny proposal "topic"        generate proposals from graph
  bny init                    scaffold project for bny
  bny uninit --force          remove all bny traces
  bny dev test                run tests
  bny dev post-flight         pre-commit checks
  bny map                     structural codebase map
  bny ipm                     iteration planning meeting
  bny todo                    manage project todos

Show the result to the user.
