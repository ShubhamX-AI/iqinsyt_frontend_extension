# Backend Markdown Formatting Guide

The Chrome extension renders research results as Markdown via `react-markdown` with custom styled components. Following these conventions maximizes visual impact without any frontend changes.

## How the Frontend Renders Each Element

| Markdown syntax | Frontend rendering |
|---|---|
| `**bold text**` | Accent-colored text (purple) — draws the eye to key terms |
| `- bullet item` | Custom accent-colored dot bullet with aligned text |
| `1. numbered item` | Accent-colored counter number |
| `> blockquote` | Glassmorphic callout box with accent left border |
| `[text](url)` | Accent-colored underlined link, opens in new tab |
| `### heading` | Bold section sub-heading |
| `` `inline code` `` | Monospace with subtle background |

## Formatting Guidelines

### 1. Strategic Bolding

Bold key terms, numbers, percentages, and entity names. The frontend renders bold text in the accent color, so it visually highlights the most important data points.

```markdown
The market implies a **73% probability** of **Fed rate cut** by **June 2025**.
Key driver: **CPI data** released on **March 12** showed **3.1% year-over-year**.
```

### 2. Blockquotes for Insights & Caveats

Use `>` for key takeaways, caveats, or notable insights. These render as styled callout boxes.

```markdown
> This market has historically over-corrected after FOMC meetings. The current price may not reflect the latest statement.
```

Use blockquotes sparingly (1-2 per section max) so they retain visual weight.

### 3. Structured Lists

Prefer **unordered lists** for factors, variables, or non-sequential items:
```markdown
- **Macro conditions**: Inflation trending downward
- **Market sentiment**: Bearish positioning in futures
- **Historical pattern**: Similar setups resolved within 2 weeks
```

Use **ordered lists** for rankings, sequences, or steps:
```markdown
1. **Most likely**: Status quo maintained (62%)
2. **Second scenario**: Partial resolution by Q3 (25%)
3. **Least likely**: Full reversal (13%)
```

### 4. Headers

Use `###` (h3) for sub-sections within a section block. Avoid `#` and `##` — the section title is already rendered by the component.

```markdown
### Key Variables

- **Inflation rate**: 3.1% YoY
- **Unemployment**: 3.7%

### Historical Precedent

Similar conditions in 2019 led to...
```

### 5. Links

Include source URLs when available. They render as accent-colored clickable links that open in a new tab.

```markdown
According to [BLS data](https://www.bls.gov/cpi/), the latest CPI reading...
```

### 6. Inline Code

Use backticks for tickers, data identifiers, or technical terms:

```markdown
The `KXBTCD` contract on Kalshi tracks Bitcoin dominance.
```

## What to Avoid

- **HTML tags** — `react-markdown` strips raw HTML by default
- **Images** (`![alt](url)`) — Won't render in the extension side panel
- **Code blocks** (triple backticks) — Only use for data tables or tickers, not for general text
- **Horizontal rules** (`---`) — Sections already have visual separation
- **Deeply nested lists** — Keep to 1 level of nesting max for readability in the narrow side panel
