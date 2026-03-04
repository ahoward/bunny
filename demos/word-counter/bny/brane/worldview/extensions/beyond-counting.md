# Beyond Counting
Adjacent capabilities that a word counter could grow into — or deliberately avoid.

## Natural Extensions
- **Sentence count** — split on `.?!` with abbreviation awareness
- **Paragraph count** — blocks separated by blank lines
- **Reading time** — words / 250 (average reading speed)
- **Speaking time** — words / 150 (average speaking speed)

## Analytical Extensions
- **Vocabulary richness** — unique words / total words (type-token ratio)
- **Average word length** — proxy for text complexity
- **Flesch-Kincaid readability** — grade level estimation
- **Frequency distribution** — most common words

## The Slippery Slope
Each extension pulls the tool away from "word counter" toward "text analyzer." The Unix philosophy says: stop at counting. Ship frequency analysis as a separate tool that reads word-counter output.
