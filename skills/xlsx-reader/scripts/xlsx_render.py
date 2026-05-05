#!/usr/bin/env python3
"""Render spreadsheet pages to PNG images by converting to PDF first via LibreOffice.

Works with all formats LibreOffice can open: xlsx, xlsm, xls, csv, tsv.
"""

import sys
import os
import shutil
import hashlib
import subprocess
import tempfile
import argparse
import pymupdf


def find_libreoffice() -> str | None:
    """Find libreoffice binary on the system."""
    candidates = [
        "libreoffice",
        "soffice",
        "/usr/bin/libreoffice",
        "/usr/bin/soffice",
        "/usr/lib/libreoffice/program/soffice",
    ]
    for candidate in candidates:
        if shutil.which(candidate):
            return candidate
    return None


def parse_pages(spec: str, total: int) -> list[int]:
    """Parse page spec into 0-indexed list."""
    if spec.strip().lower() == "all":
        return list(range(total))

    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            start = max(1, int(start))
            end = min(total, int(end))
            pages.update(range(start - 1, end))
        else:
            p = int(part) - 1
            if 0 <= p < total:
                pages.add(p)
    return sorted(pages)


def render(path: str, page_spec: str = "all", dpi: int = 150) -> list[str]:
    lo_bin = find_libreoffice()
    if not lo_bin:
        print("ERROR: LibreOffice not found. Install it with:", file=sys.stderr)
        print("  sudo apt install libreoffice-core libreoffice-calc", file=sys.stderr)
        print("  or: brew install --cask libreoffice", file=sys.stderr)
        sys.exit(1)

    abs_path = os.path.abspath(path)
    work_dir = tempfile.mkdtemp(prefix="pi-xlsx-")

    print(f"Converting → PDF via LibreOffice...", file=sys.stderr)
    result = subprocess.run(
        [lo_bin, "--headless", "--convert-to", "pdf", "--outdir", work_dir, abs_path],
        capture_output=True, text=True, timeout=120,
    )

    if result.returncode != 0:
        print(f"ERROR: LibreOffice conversion failed:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        shutil.rmtree(work_dir, ignore_errors=True)
        sys.exit(1)

    pdf_files = [f for f in os.listdir(work_dir) if f.endswith(".pdf")]
    if not pdf_files:
        print("ERROR: No PDF produced by LibreOffice conversion", file=sys.stderr)
        shutil.rmtree(work_dir, ignore_errors=True)
        sys.exit(1)

    pdf_path = os.path.join(work_dir, pdf_files[0])

    # Render PDF to PNGs
    doc = pymupdf.open(pdf_path)
    pages = parse_pages(page_spec, len(doc))

    file_hash = hashlib.md5(abs_path.encode()).hexdigest()[:10]
    out_dir = os.path.join("/tmp", f"pi-xlsx-{file_hash}")
    os.makedirs(out_dir, exist_ok=True)

    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)

    output_paths = []
    for i in pages:
        page = doc[i]
        pix = page.get_pixmap(matrix=mat)
        out_path = os.path.join(out_dir, f"page_{i + 1:04d}.png")
        pix.save(out_path)
        output_paths.append(out_path)
        print(f"Page {i + 1} -> {out_path}")

    doc.close()
    shutil.rmtree(work_dir, ignore_errors=True)

    return output_paths


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render spreadsheet pages to PNG via PDF conversion")
    parser.add_argument("path", help="Path to spreadsheet file")
    parser.add_argument("--pages", default="all",
                        help="Page range in the rendered PDF: 'all', '1-5', '1,3,7', '3'")
    parser.add_argument("--dpi", type=int, default=150,
                        help="Render resolution (default: 150)")
    args = parser.parse_args()

    render(args.path, args.pages, args.dpi)
