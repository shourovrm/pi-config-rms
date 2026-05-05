---
name: docx-reader
description: Read and comprehend DOCX files (Word documents), including academic papers, reports, and lecture notes. Use when the user asks to read, parse, analyze, or extract content from a DOCX file.
---

# DOCX Reader

Read and comprehend DOCX (Microsoft Word) files. Uses `python-docx` for text and structure extraction, and optionally LibreOffice + PyMuPDF for visual page rendering when layout, images, or equations need visual comprehension.

## Setup

All scripts use a venv at `SKILL_DIR/.venv` with `python-docx` and `PyMuPDF` installed. If the venv is missing, create it from `requirements.txt`:

```bash
python3 -m venv SKILL_DIR/.venv
SKILL_DIR/.venv/bin/pip install -r SKILL_DIR/requirements.txt
```

**Python command:** Always invoke scripts with:
```
SKILL_DIR/.venv/bin/python SKILL_DIR/scripts/<script>.py [args]
```

### LibreOffice (optional, for visual rendering)

The `docx_render.py` script requires LibreOffice to convert DOCX to PDF before rasterizing. Install if you need visual page rendering:

```bash
# Debian/Ubuntu
sudo apt install libreoffice-core libreoffice-writer

# macOS
brew install --cask libreoffice
```

Without LibreOffice, you can still extract text, search, and analyze structure — you just won't get page images.

## Scripts

All scripts are in `SKILL_DIR/scripts/`.

| Script | Purpose | Key args |
|---|---|---|
| `docx_info.py <path>` | Structural analysis: paragraph/heading/table/image counts, math detection, headings as pseudo-TOC, estimated page count | — |
| `docx_extract.py <path> [--structure] [--no-tables] [--start N] [--end N]` | Extract text content | `--structure` shows heading hierarchy and style annotations, `--no-tables` skips tables, `--start/--end` for paragraph range |
| `docx_render.py <path> [--pages SPEC] [--dpi N]` | Convert to PDF via LibreOffice, then render pages to PNG in `/tmp/pi-docx-*/` | `--pages`, `--dpi` (default 150) |
| `docx_search.py <path> <query> [--context N] [--literal]` | Search paragraphs and tables by regex or literal | `--context` lines (default 3), `--literal` flag |

Page specs (for `docx_render.py`): `all`, `1-5`, `1,3,7`, `3` (1-indexed, inclusive ranges). Note that pages only exist after conversion to PDF — paragraph indices are used for extraction.

### Key Differences from PDF

DOCX is a **flow-layout** format, not a fixed-layout format like PDF. This means:
- **No inherent pages** — pages emerge only after rendering (via LibreOffice). Estimated page count is a rough heuristic (~3000 chars/page).
- **Structured content** — `python-docx` gives direct access to paragraphs, headings, tables, and styles. This makes text extraction richer than PDF.
- **Tables are first-class** — `docx_extract.py` extracts table structure with row/column formatting.
- **OMML math** — `docx_info.py` detects native Office Math elements (`<m:oMath>`) in addition to Unicode math characters.

## Strategy: How to Read a DOCX

### Step 1: Always Triage First

Run `docx_info.py` on every new DOCX before doing anything else. This tells you:
- Estimated page count (determines strategy)
- How many paragraphs, headings, tables, and images
- Whether there's embedded math (OMML count + Unicode math density)
- The heading structure (pseudo-TOC for navigation)
- Core metadata (author, title) if available

### Step 2: Pick a Strategy Based on Size and Content

#### Short DOCX (≤15 estimated pages)
- Extract all text: `docx_extract.py <path> --structure` (the structure flag gives heading hierarchy)
- This is usually sufficient — most short DOCX documents are text-heavy
- If `image_count` > 0 or `oml_math_count` > 0, render specific pages: convert and read visually

#### Medium DOCX (15–60 estimated pages)
- Extract all text with `--structure` for the full structural overview
- Check `docx_info.py` output for:
  - `image_count` > 0 → render the document to identify figure-heavy pages
  - `oml_math_count` > 0 or `math_char_density` > 0.02 → render for equation comprehension
- Render all pages at 150 DPI if the document is figure/math-heavy; otherwise render only specific sections

#### Long DOCX (60+ estimated pages)
- Extract text with `--structure` — use headings to understand structure
- Do NOT render all pages (too many tokens)
- For targeted questions: use `docx_search.py` to find relevant paragraphs, then extract or render that portion
- For full comprehension: work section by section using `--start/--end` paragraph ranges
- Warn the user about scope — offer to focus on specific sections

### Step 3: Visual Rendering (When Needed)

When you need to see layout, images, or equations visually:

1. Render: `docx_render.py <path> --pages all` (or a specific page range)
2. Read the generated PNG images with the `read` tool
3. Use 150 DPI as default; bump to 200 DPI for dense or small content

**Note:** The first time you render a DOCX, LibreOffice converts it to PDF. This takes a few seconds and the result is cached as PNGs in `/tmp/pi-docx-<hash>/`.

### Step 4: Targeted Lookups

When the user asks about something specific (e.g., "what does section 3 say about X", "find the table on Q4 results"):

1. `docx_search.py <path> "query"` — find where the term appears (paragraphs and tables)
2. `docx_search.py <path> "section title" --literal` — find a specific heading
3. `docx_extract.py <path> --start <N> --end <N+5>` — extract surrounding paragraphs
4. If the result involves figures or equations, render those pages: `docx_render.py <path> --pages <page>`

### Step 5: What to Watch For

- **High `image_count`**: the document likely has embedded figures, charts, or photos — render to see them
- **High `oml_math_count` or `math_char_density`**: equations that need visual reading — render those pages
- **High `table_count`**: use `docx_extract.py` to get structured table data (cells preserve their formatting)
- **Headings present**: the pseudo-TOC in `docx_info.py` output lets you navigate by section rather than linearly
- **"Track Changes" or comments**: these show up as extra text in extraction — `docx_info.py` may undercount paragraphs if the document has heavy revision markup

## Common Patterns

### "Read this DOCX" (full document)
```
1. docx_info.py → assess size and content
2. Pick strategy (short/medium/long)
3. Extract text (with --structure for overview)
4. Optionally render if images/math present
5. Provide summary with key findings
```

### "What does section X say?"
```
1. docx_extract.py --structure → identify the section heading
2. docx_search.py --literal "Section Title" → find the paragraph index
3. docx_extract.py --start <N> --end <N + section_length> → extract the section
4. Or render: docx_render.py --pages <estimated_page> and read visually
```

### "Explain the figures / charts in this document"
```
1. docx_info.py → check image_count
2. docx_render.py --pages all → render entire document to PNGs
3. Read the images with read tool — identify and describe each figure
```

### "Find all mentions of X and show context"
```
1. docx_search.py <path> "X" --context 5
2. For each match, note the paragraph index and surrounding text
3. If a match is in a table, the table structure is shown inline
```

### "Summarize this report"
```
1. docx_info.py → get headings, estimated size, metadata
2. docx_extract.py --structure → full text with heading hierarchy
3. Read introduction and conclusion paragraphs first
4. Use headings to build a structured summary
5. Render pages with figures/charts if needed for deeper understanding
```

### "Extract the table of contents" (if the DOCX has one)
```
1. docx_info.py → headings array IS the pseudo-TOC
2. If the document has an actual TOC field, it appears as text in extraction
```
