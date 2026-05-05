---
name: xlsx-reader
description: Read and comprehend spreadsheet files (XLSX, XLSM, XLS, CSV, TSV). Use when the user asks to read, parse, analyze, search, or extract data from a spreadsheet file.
---

# Spreadsheet Reader

Read and comprehend spreadsheet files. Uses `openpyxl` for modern Excel formats (xlsx/xlsm), `xlrd` for legacy XLS, and the stdlib `csv` module for CSV/TSV. Visual page rendering uses LibreOffice + PyMuPDF.

## Setup

All scripts use a venv at `SKILL_DIR/.venv` with `openpyxl`, `xlrd`, and `PyMuPDF` installed. If the venv is missing, create it from `requirements.txt`:

```bash
python3 -m venv SKILL_DIR/.venv
SKILL_DIR/.venv/bin/pip install -r SKILL_DIR/requirements.txt
```

**Python command:** Always invoke scripts with:
```
SKILL_DIR/.venv/bin/python SKILL_DIR/scripts/<script>.py [args]
```

### LibreOffice (optional, for visual rendering)

The `xlsx_render.py` script requires LibreOffice to convert spreadsheets to PDF before rasterizing. Install if you need visual page rendering (to see charts, colors, merged cell layouts, conditional formatting):

```bash
# Debian/Ubuntu
sudo apt install libreoffice-core libreoffice-calc

# macOS
brew install --cask libreoffice
```

Without LibreOffice, you can still extract data, search, and analyze structure — you just won't get page images.

## Scripts

All scripts are in `SKILL_DIR/scripts/`.

| Script | Purpose | Key args |
|---|---|---|
| `xlsx_info.py <path>` | Structural analysis per sheet: row/column counts, column headers, data type distribution, formula count | — |
| `xlsx_extract.py <path> [--sheets NAME,...] [--max-rows N] [--delimiter CHAR] [--formulas] [--list-sheets]` | Extract sheet data as CSV | `--sheets` for specific sheets, `--max-rows` to limit output, `--formulas` to show formulas instead of values, `--list-sheets` to list sheet names only |
| `xlsx_render.py <path> [--pages SPEC] [--dpi N]` | Convert to PDF via LibreOffice, then render pages to PNG in `/tmp/pi-xlsx-*/` | `--pages`, `--dpi` (default 150) |
| `xlsx_search.py <path> <query> [--context N] [--literal] [--max-matches N]` | Search cells across all sheets by regex or literal | `--context` columns (default 2), `--literal` flag, `--max-matches` (default 50) |

Page specs (for `xlsx_render.py`): `all`, `1-5`, `1,3,7`, `3` (1-indexed, inclusive ranges). Pages emerge only after PDF conversion — LibreOffice determines page breaks based on print layout.

### Supported Formats

| Format | Library | Notes |
|---|---|---|
| `.xlsx`, `.xlsm` | `openpyxl` | Full support: cell values, formulas, styles, merged cells |
| `.xls` | `xlrd<2` | Legacy Excel format. Values only (formulas not exposed by xlrd) |
| `.csv` | stdlib `csv` | Comma-separated values |
| `.tsv` | stdlib `csv` | Tab-separated values |

### Key Differences from PDF and DOCX

Spreadsheets are **data grids**, not flowing documents:
- **Multi-sheet**: natural namespacing — always note which sheet data came from
- **Data types preserved**: numbers, dates, strings, booleans, formulas — no guessing from text
- **Column-level analysis**: `xlsx_info.py` reports dominant data type per column, which is far more useful than "text density"
- **Formulas vs values**: `openpyxl` can read both; `xlsx_extract.py --formulas` shows the raw formulas
- **Charts and formatting**: invisible to data extraction — you must render to see them visually
- **CSV files have exactly one "sheet" and no type information** — type detection is heuristic

## Strategy: How to Read a Spreadsheet

### Step 1: Always Triage First

Run `xlsx_info.py` on every new spreadsheet before doing anything else. This tells you:
- How many sheets and their names
- Row and column counts per sheet (determines extraction strategy)
- Column headers (first row of each sheet)
- Data type distribution per column (dates, numbers, strings, nulls)
- Whether formulas are present (only with openpyxl, not xlrd)

### Step 2: Pick a Strategy Based on Size and Content

#### Small Spreadsheets (≤5 sheets, ≤1,000 rows total)
- Extract all data: `xlsx_extract.py <path>`
- This gives complete data at reasonable token cost
- If formula count is high, also extract with `--formulas` if you need to understand the logic

#### Medium Spreadsheets (5–20 sheets or 1,000–10,000 rows total)
- Start with `xlsx_info.py` to understand structure
- Extract specific sheets: `xlsx_extract.py <path> --sheets "Sheet1,Sheet2" --max-rows 200`
- Use `--max-rows` to preview large sheets without overwhelming token limits
- Render specific pages if charts or formatting are important

#### Large Spreadsheets (20+ sheets or 10,000+ rows total)
- Do NOT extract everything — too many tokens
- Use `xlsx_extract.py --list-sheets` to confirm sheet names
- Extract summary data: first few rows of each sheet, then targeted extraction
- Use `xlsx_search.py` to find specific values across all sheets
- For structural understanding: work sheet by sheet, sampling top-N rows
- Warn the user about scope — offer to focus on specific sheets

### Step 3: Visual Rendering (When Needed)

When you need to see charts, colors, merged cell layouts, or print-formatting:

1. Render: `xlsx_render.py <path> --pages all` (or a specific sheet's pages)
2. Read the generated PNG images with the `read` tool

Rendering is most valuable for:
- **Charts and graphs** — invisible to data extraction, need visual reading
- **Heavily formatted sheets** — color coding, conditional formatting, merged headers
- **Print-layout comprehension** — how sheets would look printed/exported

**Note:** LibreOffice determines page breaks and sheet-to-page mapping. A single sheet may span multiple pages if it's wide. Large sheets with many columns may render with pages split awkwardly — in those cases, data extraction is better than rendering.

### Step 4: Targeted Lookups

When the user asks about something specific (e.g., "find all cells mentioning Q4", "what's in the 'Summary' sheet"):

1. `xlsx_search.py <path> "query"` — search all sheets, returns cell references with row context
2. `xlsx_extract.py <path> --sheets "SheetName" --max-rows 50` — extract the relevant sheet
3. If the match is near a chart or formatted region, render that page for visual context

### Step 5: What to Watch For

- **Sheets with many null columns**: the header row may have trailing empty columns — `xlsx_info.py` reports actual `max_column`, which may be inflated
- **Formula-heavy sheets**: if `total_formulas_sampled` > 0, the sheet has logic beyond raw values — consider extracting with `--formulas` to understand the computation
- **Date columns**: `xlsx_info.py` reports `date_str` as a type when strings match `MM/DD/YYYY` patterns — actual Excel dates are stored as floats and show as `float` or `number`
- **CSV/TSV type detection is heuristic**: there's no schema — all values are strings, and type detection uses regex patterns
- **Empty sheets**: some spreadsheets have empty placeholder sheets — `rows: 1, columns: 1` with no data

## Common Patterns

### "Read this spreadsheet" (full file)
```
1. xlsx_info.py → assess size, sheets, and content
2. Pick strategy (small/medium/large)
3. Extract data (all or sampled)
4. If charts/formatted regions present, render visually
5. Provide summary with key findings per sheet
```

### "What's in the Summary sheet?"
```
1. xlsx_extract.py --sheets "Summary" → full extraction of that sheet
2. OR: xlsx_extract.py --sheets "Summary" --max-rows 50 → preview first 50 rows
3. Describe the structure: columns, key aggregations, notable values
```

### "Find all mentions of X"
```
1. xlsx_search.py <path> "X" → search all sheets
2. For each match, note the sheet, cell reference, and row context
3. If many matches, use --max-matches to limit output
```

### "List all sheet names"
```
1. xlsx_info.py → sheet_names array
2. OR: xlsx_extract.py --list-sheets → simpler output
```

### "Compare sheets A and B"
```
1. xlsx_extract.py --sheets "SheetA,SheetB" --max-rows 100 → extract both
2. Compare headers, row counts, overlapping data
3. Note differences in structure and content
```

### "What formulas are used?"
```
1. xlsx_extract.py <path> --formulas → extract with formulas instead of values
2. Note: this only works for xlsx/xlsm, not xls or csv
3. Look for =SUM(...), =VLOOKUP(...), =IF(...), etc.
```

### "Are there charts in this?"
```
1. xlsx_render.py --pages all → render full spreadsheet
2. Read images → identify and describe each chart
3. xlsx_info.py output can't tell you about charts — only rendering reveals them
```

## Error Handling

- **Password-protected xlsx**: `openpyxl` will throw an exception — mention this to the user
- **Corrupted CSV**: `csv.Error` may occur on malformed rows — the script will stop
- **Missing xlrd for .xls**: `pip install xlrd==1.2.0` in the venv
- **LibreOffice not found**: a clear error message with install instructions will be shown
