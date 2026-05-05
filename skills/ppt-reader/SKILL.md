---
name: ppt-reader
description: Read and comprehend presentation files (PPT, PPTX). Use when the user asks to read, parse, analyze, or extract content from a PowerPoint file.
---

# PPT Reader

Read and comprehend PowerPoint presentation files. Uses `python-pptx` for text, structure, and speaker notes extraction from `.pptx` files. For legacy `.ppt` files, LibreOffice converts to `.pptx` transparently before reading. Visual slide rendering uses LibreOffice + PyMuPDF.

## Setup

All scripts use a venv at `SKILL_DIR/.venv` with `python-pptx` and `PyMuPDF` installed. If the venv is missing, create it from `requirements.txt`:

```bash
python3 -m venv SKILL_DIR/.venv
SKILL_DIR/.venv/bin/pip install -r SKILL_DIR/requirements.txt
```

**Python command:** Always invoke scripts with:
```
SKILL_DIR/.venv/bin/python SKILL_DIR/scripts/<script>.py [args]
```

### LibreOffice (required for visual rendering and .ppt support)

LibreOffice Impress is needed for:
- Rendering slides to PNG images (`ppt_render.py`)
- Reading legacy `.ppt` files (auto-converted to `.pptx` for text extraction)

```bash
# Debian/Ubuntu
sudo apt install libreoffice-impress

# macOS
brew install --cask libreoffice
```

Without LibreOffice, you can still extract text from `.pptx` files — but you won't get slide images or `.ppt` support.

## Scripts

All scripts are in `SKILL_DIR/scripts/`. There is also a shared utility module `ppt_utils.py`.

| Script | Purpose | Key args |
|---|---|---|
| `ppt_info.py <path>` | Slide-by-slide analysis: layout, title, shape breakdown (text/image/table/chart), speaker notes presence, empty slide detection | — |
| `ppt_extract.py <path> [--slides SPEC] [--no-notes] [--no-tables] [--titles-only]` | Extract text from slides: titles, body shapes, tables, speaker notes | `--slides`, `--no-notes`, `--no-tables`, `--titles-only` |
| `ppt_render.py <path> [--slides SPEC] [--dpi N]` | Convert to PDF via LibreOffice, then render slides to PNG in `/tmp/pi-ppt-*/` | `--slides`, `--dpi` (default 150) |
| `ppt_search.py <path> <query> [--context N] [--literal] [--max-matches N]` | Search text across slides, shapes, tables, and speaker notes | `--context` lines (default 2), `--literal` flag, `--max-matches` (default 50) |

Slide specs: `all`, `1-5`, `1,3,7`, `3` (1-indexed, inclusive ranges).

### Supported Formats

| Format | Library | Notes |
|---|---|---|
| `.pptx` | `python-pptx` | Full support: slides, shapes, text, tables, images, notes |
| `.ppt` | LibreOffice → `python-pptx` | Auto-converted to `.pptx` for text extraction; LibreOffice handles rendering natively |

## Critical: Presentations Are Visual-First

Unlike PDFs, DOCX, or XLSX files where text or data extraction gives you meaningful content, **presentation slides are fundamentally visual**. Text extracted from slides is:
- Fragmented across multiple shapes with no reading order
- Missing visual hierarchy (font sizes, colors, positioning)
- Devoid of images, charts, diagrams, and slide layouts
- Stripped of all design intent

**The default strategy for presentations is the inverse of the other readers: render first, extract text for search and notes only.**

## Strategy: How to Read a Presentation

### Step 1: Always Triage First

Run `ppt_info.py` on every new presentation before doing anything else. This tells you:
- Total slide count (determines strategy)
- Slide dimensions and aspect ratio
- Per-slide breakdown: how many text shapes, images, tables, charts
- Which slides have speaker notes and empty slides
- Total image/table/chart counts across the whole deck

### Step 2: Pick a Strategy Based on Size

#### Short Presentations (≤15 slides)
- **Render all slides immediately**: `ppt_render.py <path>`
- Read all rendered images with the `read` tool for full visual comprehension
- Extract text only if you need to search specific terms or read detailed notes
- This gives complete understanding of the presentation as the audience would see it

#### Medium Presentations (15–40 slides)
- Render all slides at 150 DPI
- Read images slide by slide, summarizing in groups
- Check `ppt_info.py` for slides marked `has_notes: true` — extract notes for those slides
- Focus especially on slides with low `text_length` but high `image_count` — those are visual slides that need careful reading

#### Long Presentations (40+ slides)
- Do NOT render all slides (too many tokens)
- Start with `ppt_extract.py --titles-only` to get the slide deck outline
- Identify key sections using slide titles and layouts
- Render only the most important slide ranges
- Use `ppt_search.py` for targeted lookups
- Warn the user about scope — offer to focus on specific sections

### Step 3: Understand Slide Content Types

Use `ppt_info.py` output to identify what kinds of slides are in the deck:

- **Text-heavy slides** (`text_length` > 500, `image_count` = 0): bullet lists, paragraphs — can often be read from text extraction alone
- **Visual slides** (`text_length` < 100, `image_count` > 0): charts, diagrams, photos — **must render**
- **Mixed slides** (`text_length` > 200, `image_count` > 0): text + supporting visuals — render for full understanding
- **Table slides** (`table_count` > 0): data tables — text extraction can get the data, rendering shows formatting
- **Empty slides** (`text_length` < 20, `image_count` = 0): likely section dividers or template artifacts — note them but don't spend tokens on them
- **Slides with notes** (`has_notes: true`): the real content might be in the speaker notes rather than on the slide itself — extract notes for these

### Step 4: Visual Reading Guidelines

When reading rendered slide images:
- **150 DPI** (default) is good for most slides
- **200 DPI** for slides with small text, dense diagrams, or detailed charts
- **100 DPI** only if you need to quickly scan the slide structure
- Describe each slide's visual layout: what's the title, what's the main visual element, how is the content arranged
- For chart slides: describe what the chart shows, its type, key data points visible
- For diagram slides: describe the diagram structure and what it communicates

### Step 5: Speaker Notes Are Gold

Speaker notes often contain the real substance — explanations, talking points, data sources, or the actual message that the sparse slide text only hints at. Always check:
- `ppt_info.py` → `has_notes` and `slides_with_notes` count
- `ppt_extract.py <path> --slides N` — extract full text including notes for important slides
- When a slide makes no sense visually, the notes probably explain it

### Step 6: What to Watch For

- **Slides with `layout: "Blank"`**: no title placeholder — the title might be in a regular text box instead
- **Slides with many `other_shapes`**: likely grouped shapes, SmartArt, or embedded objects that need visual reading
- **High `total_charts`**: the presentation is data-heavy — render to see the actual charts
- **Many `empty_slides`**: might be template artifacts, hidden slides, or section dividers with background images
- **No `has_notes` on any slide**: the presentation is probably designed to stand alone without a speaker

## Common Patterns

### "Read this presentation" (full deck)
```
1. ppt_info.py → assess size, slide types, notes presence
2. Pick strategy (short/medium/long)
3. Render all (or key) slides
4. Read images with read tool — describe each slide
5. Extract notes for slides that have them
6. Provide overall summary with key messages per section
```

### "What's on slide 7?"
```
1. ppt_render.py --slides 7 → render just that slide
2. Read the image → see the visual
3. ppt_extract.py --slides 7 → get text and notes for context
```

### "Find all slides about X"
```
1. ppt_search.py <path> "X" → search titles, shapes, and notes
2. For each match, note the slide number
3. Render or extract those specific slides
```

### "Summarize just the key points" (presentation outline)
```
1. ppt_extract.py --titles-only → get all slide titles
2. This gives the narrative arc of the presentation
3. For important-looking titles, render those slides for detail
```

### "Show me the speaker notes"
```
1. ppt_info.py → identify which slides have notes
2. ppt_extract.py --slides "3,7,12" → extract those slides with notes
3. The notes often contain the real message
```

### "What charts are in this deck?"
```
1. ppt_info.py → check total_charts and per-slide chart_count
2. ppt_render.py → render all slides
3. Read images → identify and describe each chart slide
```

## Limitations

- **Reading order**: Text shapes on a slide have no guaranteed reading order — visual rendering is the only way to understand content flow
- **Grouped shapes**: `ppt_info.py` counts grouped shapes as `other_shapes` — their internal text/images aren't counted individually
- **SmartArt**: Appears as a single group shape — text inside SmartArt is extractable but structure is lost without rendering
- **Embedded video/audio**: Detected as shapes but not playable or describable
- **Animations**: Not extractable — only the static slide content is readable
- **Master slide content**: Backgrounds, logos, and footers from slide masters are not included in per-slide analysis
