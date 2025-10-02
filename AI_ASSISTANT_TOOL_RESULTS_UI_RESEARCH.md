# AI Coding Assistant Tool Results UI/UX Research Report

**Research Date:** October 1, 2025
**Focus:** How modern AI coding assistants display tool results and search results in chat interfaces

---

## Executive Summary

Modern AI coding assistants employ sophisticated UI patterns to balance **transparency** (showing what the AI saw) with **clean UX** (avoiding overwhelming users with technical details). The prevailing approach is:

1. **Progressive disclosure**: Hide verbose metadata by default, show summaries
2. **Inline citations**: Numbered references [1], [2] embedded in text
3. **Collapsible sections**: Expandable tool execution details
4. **Visual indicators**: Loading states, thinking animations, status badges
5. **Source attribution cards**: Separate section for citation details at the end

---

## Key Findings by Question

### 1. How do they handle verbose tool outputs?

**Pattern: Progressive Disclosure + Summarization**

- **ChatGPT Search**:
  - Shows synthesized answer in natural language
  - Hides raw search API responses completely
  - Displays only: inline citations + "Sources" button at end
  - Metadata (request_id, response_time, domains) never shown to users

- **Perplexity AI**:
  - Shows curated summary with inline numbered citations [1], [2], etc.
  - Hides: API responses, search queries, ranking scores
  - Shows: Source cards with title, domain, relevance snippets
  - "Pro Search" mode asks clarifying questions before searching

- **Claude Code**:
  - Tool execution shown with status indicators ("Running...", "Completed")
  - Terminal output shown in code blocks with syntax highlighting
  - File operations shown as diffs (before/after view)
  - Long outputs can be collapsed/expanded

- **Cursor IDE**:
  - Agent panel shows high-level steps ("Analyzing codebase", "Running tests")
  - Terminal commands and output shown in dedicated terminal pane
  - File changes shown as inline diffs in editor
  - Verbose logs hidden unless explicitly requested

- **Windsurf (Cascade)**:
  - Turbo mode can auto-execute commands without showing details
  - Shows execution status with progress indicators
  - Terminal output appears in integrated terminal
  - Focus on "what changed" rather than "how it happened"

### 2. Do they show raw tool results or parse/format them?

**Answer: Almost always parsed and formatted**

- **Never show raw JSON/API responses** to end users
- **Always apply semantic formatting**:
  - Search results → Citation cards with title, snippet, URL
  - Code execution → Syntax-highlighted output
  - File operations → Diff views (green/red highlighting)
  - Errors → Formatted error messages with context

- **Exception: Developer modes**
  - Some tools offer "Show raw output" toggle for debugging
  - OpenAI API docs show raw response format for developers
  - But consumer-facing UIs never expose this by default

### 3. UI patterns for displaying search results

**Pattern 1: Inline Citations (ChatGPT, Perplexity, Gemini)**

```
Climate change is affecting global temperatures [1]. Recent studies
show a 1.5°C increase since pre-industrial times [2].

Sources:
[1] NASA Climate Change - https://climate.nasa.gov/
[2] IPCC Report 2023 - https://ipcc.ch/report/...
```

**Benefits:**
- Clear source attribution
- Easy to verify claims
- Scannable numbered references
- Clickable for more context

**Pattern 2: Source Cards (Perplexity, ChatGPT)**

Visual cards at the end of response with:
- Favicon/site icon
- Page title
- Domain name
- Brief excerpt/snippet
- Click to open in new tab

**Pattern 3: Hover Previews (ChatGPT)**

- Hover over [1] to see mini-preview
- Shows title + first few lines
- Click to open full source
- Desktop web only (mobile shows on tap)

**Pattern 4: Related Questions (Perplexity)**

After answer, suggest:
- "People also ask..."
- Related search queries
- Topic exploration paths

### 4. Do they hide technical metadata by default?

**YES - Universally hidden:**

- `request_id`, `response_time`, `api_version`
- Search query rewrites (ChatGPT rewrites "restaurants near me" → "restaurants San Francisco")
- Model selection logic
- Token counts, confidence scores
- Rate limiting headers
- Caching indicators
- Internal routing decisions

**Shown to developers only:**
- API documentation includes full response schemas
- Console/network tab shows raw responses
- Developer modes in some tools (Claude Code has verbose logging)

**Never shown to end users:**
- Technical implementation details
- Performance metrics
- Internal system states

### 5. Balance between transparency and clean UX

**The Spectrum:**

```
Low Transparency                                    High Transparency
(Clean UX)                                         (Developer Focus)
    |                    |                    |                    |
  ChatGPT          Perplexity           Claude Code            Cursor
(Hides all       (Shows sources,      (Shows tool          (Shows all
 technical       hides metadata)      execution,           execution
 details)                             formatted)           details)
```

**Best Practices Identified:**

1. **Tiered Information Architecture**
   - Level 1: Natural language answer (always visible)
   - Level 2: Source citations (visible, minimal)
   - Level 3: Tool execution status (collapsible)
   - Level 4: Raw output (hidden, toggle available)
   - Level 5: Technical metadata (never shown)

2. **Visual Hierarchy**
   ```
   ┌─────────────────────────────────┐
   │ AI Response (Primary)           │
   │ Natural language, easy to read  │
   └─────────────────────────────────┘

   ┌─────────────────────────────────┐
   │ [1] [2] [3] Inline Citations   │ ← Subtle, non-intrusive
   └─────────────────────────────────┘

   ┌─────────────────────────────────┐
   │ 📚 Sources (3)                  │ ← Expandable section
   │ > Click to view all sources     │
   └─────────────────────────────────┘
   ```

3. **Status Indicators Over Raw Output**
   - ✅ "Search completed (3 sources)"
   - ⏳ "Running tests..." (with spinner)
   - ⚠️ "Command failed" (with brief error)
   - NOT: Full stderr dump

4. **Context-Aware Verbosity**
   - **For non-technical users**: Hide everything except answer + sources
   - **For developers**: Show command execution, test output, file changes
   - **For debugging**: Offer "Show details" toggle

---

## Implementation Patterns

### Pattern A: Citation Badge System (ChatGPT, Perplexity)

```tsx
// Inline citation component
<span className="citation-badge" onClick={() => showSource(1)}>
  [1]
</span>

// Source card at bottom
<div className="source-card">
  <img src={favicon} />
  <div>
    <h4>{title}</h4>
    <p className="domain">{domain}</p>
    <p className="excerpt">{snippet}</p>
  </div>
</div>
```

**Visual Style:**
- Numbered badges: Small, superscript or inline
- Subtle hover effect
- Blue/accent color for interactivity
- Source cards: White/light background, shadow, rounded corners

### Pattern B: Tool Execution Display (Claude Code, Cursor)

```tsx
// Collapsible tool execution
<div className="tool-execution">
  <div className="tool-header" onClick={toggleExpanded}>
    <span className="tool-icon">🔧</span>
    <span className="tool-name">Running tests</span>
    <span className="tool-status">✅ Completed</span>
  </div>

  {expanded && (
    <div className="tool-output">
      <pre><code>{formattedOutput}</code></pre>
    </div>
  )}
</div>
```

**States:**
- Pending: Spinner icon + "Running..."
- Success: Checkmark + "Completed"
- Failed: X icon + "Failed" + brief error message
- Collapsed by default for successful operations
- Auto-expand on failure

### Pattern C: Streaming Status (All Tools)

```tsx
// While AI is working
<div className="thinking-indicator">
  <div className="dots-animation">
    <span>●</span>
    <span>●</span>
    <span>●</span>
  </div>
  <span className="status-text">Searching the web...</span>
</div>

// Update to show progress
"Searching the web..." →
"Found 15 sources..." →
"Analyzing results..." →
"Generating response..."
```

### Pattern D: Diff View for Code Changes (Claude Code, Cursor)

```tsx
// Side-by-side or unified diff
<div className="code-diff">
  <div className="diff-line removed">- const x = 1;</div>
  <div className="diff-line added">+ const x = 2;</div>
</div>
```

**Features:**
- Syntax highlighting preserved
- Line numbers shown
- Green/red color coding
- "Accept" / "Reject" buttons
- Inline or side-by-side view toggle

---

## Specific Tool Analysis

### ChatGPT Search

**What they show:**
- Natural language answer with inline [1][2][3] citations
- "Sources" button at end to expand full list
- Hover preview on desktop (title + snippet)
- Images from search (with source attribution)
- Maps for location queries

**What they hide:**
- Raw Bing API responses
- Query rewrites ("near me" → "San Francisco")
- Search ranking scores
- Response times, request IDs
- Number of sources consulted vs. cited

**UX Philosophy:**
"Make it feel like a smart friend explaining something, not a search engine showing results"

### Perplexity AI

**What they show:**
- Curated answer with inline citations [1], [2]
- Source cards with favicon, title, domain
- "Pro Search" clarifying questions
- Related questions/topics
- Image results when relevant

**What they hide:**
- API calls to search providers
- Ranking/relevance scores
- Query expansion logic
- LLM model selection
- Rate limiting status

**Unique features:**
- "Focus" mode (All, Academic, Reddit, etc.)
- Thread-based organization
- Collections for saving searches
- Very transparent about sources (that's their differentiator)

**UX Philosophy:**
"Research assistant that shows its work through citations, but hides the boring technical stuff"

### Claude Code

**What they show:**
- Tool execution status ("Running command...", "Creating file...")
- Terminal output (formatted in code blocks)
- File diffs (before/after with syntax highlighting)
- Error messages (formatted, contextual)
- Checkpoints/progress for long operations

**What they hide:**
- Internal reasoning/planning
- API request/response details
- Model selection logic
- Token usage

**Unique features:**
- Native terminal integration
- File tree view
- Multi-step checkpoint system
- "Show working" toggle for extended thinking

**UX Philosophy:**
"Show developers what happened, not how the AI decided to do it"

### Cursor IDE

**What they show:**
- Agent panel: High-level task breakdown
- Inline diffs in editor
- Terminal output in dedicated pane
- Test results with pass/fail indicators
- Git status changes

**What they hide:**
- Model thinking process
- API latency/performance
- Codebase indexing status
- Token limits/usage

**Unique features:**
- Split view: Agent panel + editor + terminal
- Inline suggestions with "Tab to accept"
- Context-aware code completions
- Command palette integration

**UX Philosophy:**
"Integrate AI into existing developer workflow without changing how they work"

### Windsurf (Cascade)

**What they show:**
- Flow-based conversation
- Execution progress indicators
- Terminal output (when requested)
- File change summaries

**What they hide:**
- Auto-execution details (in Turbo mode)
- Model switching logic
- Codebase indexing
- Context assembly

**Unique features:**
- "Turbo mode" for auto-execution
- Real-time collaboration indicators
- Deep context awareness
- Flows for multi-step tasks

**UX Philosophy:**
"Stay in flow - minimize interruptions, maximize productivity"

---

## Key Design Principles Observed

### 1. **Progressive Disclosure**
Start minimal, allow expansion for those who want details

### 2. **Status Over Output**
"✅ Tests passed (23/23)" is better than showing all 23 test outputs

### 3. **Semantic Formatting**
Always translate raw data into human-readable format

### 4. **Inline Attribution**
Citations should be close to the claim, not buried at the bottom

### 5. **Collapsible by Default**
Successful operations collapse automatically; failures expand

### 6. **Visual Hierarchy**
Answer > Citations > Sources > Technical Details

### 7. **Context-Appropriate Verbosity**
Show more to developers, less to general users

### 8. **Streaming Feedback**
Show progress during long operations, not just final result

### 9. **Error Emphasis**
Failures should be immediately visible and actionable

### 10. **Metadata-Free End User Experience**
Technical metadata (IDs, timestamps, internal flags) never shown

---

## Recommendations for Implementation

### For Search Results Display

```tsx
// Recommended structure
interface SearchResultDisplay {
  // Always show
  answer: string;              // Natural language synthesis
  inlineCitations: Citation[]; // [1], [2], [3] in text

  // Show in collapsible section
  sources: Source[];           // Title, URL, snippet

  // Never show to end users
  metadata?: {
    requestId: string;
    responseTime: number;
    rawResults: any[];
    ranking: number[];
  }
}

interface Citation {
  index: number;              // [1]
  position: number;           // Character offset in text
  sourceId: string;           // Links to sources array
}

interface Source {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  snippet: string;            // 2-3 sentences
  publishDate?: string;       // Only if recent/relevant
}
```

### For Tool Execution Display

```tsx
interface ToolExecution {
  // Always show
  toolName: string;            // "Web Search", "Run Tests"
  status: 'running' | 'completed' | 'failed';

  // Show if status !== 'running'
  summary: string;             // "Found 5 sources" or "3 tests failed"

  // Show in collapsible section (collapsed by default if success)
  details?: {
    output: string;            // Formatted output
    duration?: number;         // "Completed in 2.3s"
    warnings?: string[];
  }

  // Never show
  metadata?: {
    requestId: string;
    modelVersion: string;
    internalState: any;
  }
}
```

### Visual Components

1. **Citation Badge**
   - Style: Small, rounded, subtle background
   - Color: Accent color (blue/purple)
   - Interaction: Hover shows preview, click scrolls to source
   - Size: 14-16px, slightly raised

2. **Source Card**
   - Layout: Horizontal (icon + content) or vertical
   - Content: Favicon, title (bold), domain (muted), snippet
   - Interaction: Click opens in new tab
   - Spacing: 12-16px padding, 8px gap between cards

3. **Tool Status Indicator**
   - Running: Spinner + "Running..."
   - Success: ✅ + "Completed" (green)
   - Failed: ❌ + "Failed" (red)
   - Size: 20px icon + text

4. **Collapsible Section**
   - Header: Always visible, clickable
   - Icon: Chevron (▶ collapsed, ▼ expanded)
   - Animation: Smooth expand/collapse (200-300ms)
   - Default: Collapsed for success, expanded for failure

---

## Anti-Patterns to Avoid

1. ❌ **Showing raw JSON responses**
   - Users don't care about `{"type": "search", "status": 200}`

2. ❌ **Exposing internal IDs**
   - `request_id: abc-123-def` means nothing to users

3. ❌ **Dumping unformatted logs**
   - Multi-page stderr dumps are overwhelming

4. ❌ **Performance metrics everywhere**
   - "Completed in 0.237s" is noise unless debugging

5. ❌ **Non-collapsible verbose output**
   - Forces users to scroll past irrelevant details

6. ❌ **Citations without sources**
   - [1], [2] are useless without a sources section

7. ❌ **Auto-expanding everything**
   - Respect users' attention - only expand failures

8. ❌ **Technical jargon in status messages**
   - "HTTP 429 Rate Limit" → "Too many requests, please wait"

---

## Accessibility Considerations

1. **Screen readers**:
   - Announce tool status changes
   - Provide alt text for status icons
   - Make citations keyboard-navigable

2. **Keyboard navigation**:
   - Tab through citations
   - Enter to expand/collapse sections
   - Focus indicators on interactive elements

3. **Color blindness**:
   - Don't rely on color alone (red/green)
   - Use icons + color for status
   - Sufficient contrast ratios

4. **Motion sensitivity**:
   - Respect `prefers-reduced-motion`
   - Subtle animations, no rapid flashing
   - Instant expand/collapse option

---

## Conclusion

Modern AI assistants overwhelmingly favor **clean, curated UX over raw transparency** for end users, while providing optional verbosity for developers. The key insight is **tiered information architecture**:

- **Tier 1** (always visible): Synthesized answer
- **Tier 2** (visible, minimal): Source citations
- **Tier 3** (collapsible): Tool execution details
- **Tier 4** (hidden, toggle available): Raw output
- **Tier 5** (never shown): Technical metadata

The best implementations make users feel like they're talking to a knowledgeable assistant who cites their sources, not interacting with a complex API that dumps verbose JSON responses.

---

## Sources

1. ChatGPT Search Documentation: https://help.openai.com/en/articles/9237897-chatgpt-search
2. OpenAI Web Search API: https://platform.openai.com/docs/guides/tools-web-search
3. Perplexity AI UX Analysis: https://www.uxdesigninstitute.com/blog/perplexity-ai-and-design-process/
4. Claude Code Documentation: https://www.anthropic.com/news/create-files
5. Cursor IDE Features: https://cursor.com/features
6. Windsurf Overview: https://windsurf.com/
7. GitHub Copilot UX: https://code.visualstudio.com/docs/copilot/ai-powered-suggestions

**Report compiled:** October 1, 2025
