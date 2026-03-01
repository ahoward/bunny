# Feature Specification: URL and stdin support

**Feature Branch**: `005-url-and-stdin-support`
**Created**: 2026-03-01
**Status**: Complete
**Input**: User description: "URL and stdin support"

## User Scenarios & Testing

### User Story 1 - URL Summarization (Priority: P1)

User passes a URL (http/https) as argument. The tool fetches the content and summarizes it.

**Why this priority**: URLs are the most common new input source — extends tldr beyond local files.

**Independent Test**: `app.call("/summarize", { url: "https://example.com" })` returns summary.

**Acceptance Scenarios**:

1. **Given** a valid URL returning text, **When** `tldr https://example.com/article.txt`, **Then** prints summary to stdout
2. **Given** a URL returning 404, **When** `tldr https://example.com/missing`, **Then** prints error to stderr, exit 1
3. **Given** an invalid URL format, **When** `tldr not-a-url` passed as url, **Then** returns structured error

---

### User Story 2 - stdin Summarization (Priority: P2)

User pipes content via stdin. The tool reads it and summarizes.

**Why this priority**: Enables composability with other Unix tools (curl, cat, grep).

**Independent Test**: `echo "text" | tldr` returns summary.

**Acceptance Scenarios**:

1. **Given** piped text on stdin, **When** `cat file.txt | tldr`, **Then** reads stdin, prints summary
2. **Given** explicit stdin flag, **When** `tldr -`, **Then** reads stdin, prints summary
3. **Given** empty stdin, **When** `echo "" | tldr`, **Then** prints error to stderr, exit 1

---

### User Story 3 - Auto-detect Input Type (Priority: P3)

CLI auto-detects whether input is a file path, URL, or stdin without user flags.

**Why this priority**: Reduces friction — user doesn't need to remember flags.

**Independent Test**: Same `tldr` command works with file paths, URLs, and pipes.

**Acceptance Scenarios**:

1. **Given** arg starts with http/https, **When** `tldr https://...`, **Then** treats as URL
2. **Given** no args and stdin is piped, **When** `cat x | tldr`, **Then** reads stdin
3. **Given** no args and stdin is TTY, **When** `tldr`, **Then** prints usage

---

### Edge Cases

- URL returns content larger than 1MB → structured error with size info
- URL returns empty body → structured error "URL returned empty content"
- Network error (DNS, timeout) → structured error with fetch error details
- Whitespace-only stdin content → structured error "content is empty"
- Multiple input sources provided (file_path + url) → structured error "provide exactly one"

## Requirements

### Functional Requirements

- **FR-001**: Handler MUST accept `url` param and fetch content via HTTP/HTTPS
- **FR-002**: Handler MUST accept `content` param for pre-read text (stdin)
- **FR-003**: Handler MUST reject requests with zero or multiple input sources
- **FR-004**: CLI MUST auto-detect URL (http/https prefix) vs file path
- **FR-005**: CLI MUST detect piped stdin when no args provided
- **FR-006**: CLI MUST support `-` flag for explicit stdin reading
- **FR-007**: All input sources MUST respect the 1MB size limit
- **FR-008**: Result MUST include `source` field identifying input origin

## Success Criteria

### Measurable Outcomes

- **SC-001**: 24 tests pass (10 new tests for URL/stdin/content)
- **SC-002**: Zero type check errors (post_flight clean)
- **SC-003**: All error cases return structured Result envelope (never exceptions)
- **SC-004**: Backward compatible — existing file_path usage unchanged
