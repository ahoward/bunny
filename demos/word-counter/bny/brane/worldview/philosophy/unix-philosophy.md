# Unix Philosophy
A word counter is a case study in "do one thing well" — but what is that one thing?

## The `wc` Precedent
`wc` does three things (lines, words, bytes/chars) and has done so since V1 Unix (1971). It's one of the oldest surviving Unix commands. Its behavior is codified in POSIX.

## Composition Over Features
The Unix way says: don't add flags for "ignore blank lines" or "count unique words." Instead, let users pipe through `grep -v '^$'` or `sort -u`. A word counter that tries to do everything becomes a text analyzer.

## The Tension
Modern CLIs (ripgrep, fd, bat) break Unix minimalism by adding color, smart defaults, and combined features. Should a new word counter be a faithful `wc` clone, or a modern reimagining?

## Structured Output
Unix pipes assume line-oriented text. JSON output enables composition with `jq` but breaks `awk` pipelines. This is a philosophical fork: old Unix vs new Unix.
