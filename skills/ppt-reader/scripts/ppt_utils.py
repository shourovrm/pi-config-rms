#!/usr/bin/env python3
"""Shared utilities for ppt-reader: LibreOffice conversion helpers."""

import os
import sys
import shutil
import subprocess
import tempfile


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


def ensure_pptx(path: str) -> str:
    """
    If path is a .pptx file, return it as-is.
    If it's a .ppt file, convert to .pptx via LibreOffice and return the temp path.
    """
    ext = os.path.splitext(path)[1].lower()
    if ext == '.pptx':
        return path

    lo_bin = find_libreoffice()
    if not lo_bin:
        print("ERROR: LibreOffice is required to read .ppt files.", file=sys.stderr)
        print("Install: sudo apt install libreoffice-impress", file=sys.stderr)
        sys.exit(1)

    abs_path = os.path.abspath(path)
    work_dir = tempfile.mkdtemp(prefix="pi-ppt-conv-")

    result = subprocess.run(
        [lo_bin, "--headless", "--convert-to", "pptx", "--outdir", work_dir, abs_path],
        capture_output=True, text=True, timeout=120,
    )

    if result.returncode != 0:
        print(f"ERROR: LibreOffice conversion failed (code {result.returncode}):", file=sys.stderr)
        if result.stdout:
            print(result.stdout, file=sys.stderr)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        shutil.rmtree(work_dir, ignore_errors=True)
        sys.exit(1)

    pptx_files = [f for f in os.listdir(work_dir) if f.endswith(".pptx")]
    if not pptx_files:
        print("ERROR: No .pptx produced by conversion", file=sys.stderr)
        shutil.rmtree(work_dir, ignore_errors=True)
        sys.exit(1)

    return os.path.join(work_dir, pptx_files[0])


def render_pages(path: str, page_spec: str = "all", dpi: int = 150) -> list[str]:
    """Convert ppt/pptx to PDF via LibreOffice, then render pages to PNG."""
    import pymupdf

    lo_bin = find_libreoffice()
    if not lo_bin:
        print("ERROR: LibreOffice not found. Install it with:", file=sys.stderr)
        print("  sudo apt install libreoffice-impress", file=sys.stderr)
        sys.exit(1)

    abs_path = os.path.abspath(path)
    work_dir = tempfile.mkdtemp(prefix="pi-ppt-")

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
        print("ERROR: No PDF produced", file=sys.stderr)
        shutil.rmtree(work_dir, ignore_errors=True)
        sys.exit(1)

    pdf_path = os.path.join(work_dir, pdf_files[0])
    doc = pymupdf.open(pdf_path)

    # Parse page spec
    if page_spec.strip().lower() == "all":
        pages = list(range(len(doc)))
    else:
        pages = set()
        for part in page_spec.split(","):
            part = part.strip()
            if "-" in part:
                start, end = part.split("-", 1)
                start = max(1, int(start))
                end = min(len(doc), int(end))
                pages.update(range(start - 1, end))
            else:
                p = int(part) - 1
                if 0 <= p < len(doc):
                    pages.add(p)
        pages = sorted(pages)

    import hashlib
    file_hash = hashlib.md5(abs_path.encode()).hexdigest()[:10]
    out_dir = os.path.join("/tmp", f"pi-ppt-{file_hash}")
    os.makedirs(out_dir, exist_ok=True)

    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)

    output_paths = []
    for i in pages:
        page = doc[i]
        pix = page.get_pixmap(matrix=mat)
        out_path = os.path.join(out_dir, f"slide_{i + 1:04d}.png")
        pix.save(out_path)
        output_paths.append(out_path)
        print(f"Slide {i + 1} -> {out_path}")

    doc.close()
    shutil.rmtree(work_dir, ignore_errors=True)

    return output_paths


def parse_pages(spec: str, total: int) -> list[int]:
    """Parse page/slide spec into 0-indexed list."""
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
