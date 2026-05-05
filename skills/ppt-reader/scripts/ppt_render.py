#!/usr/bin/env python3
"""Render presentation slides to PNG images via LibreOffice → PDF → PyMuPDF.

Supports both .ppt and .pptx files.
"""

import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(__file__))
from ppt_utils import render_pages


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render presentation slides to PNG")
    parser.add_argument("path", help="Path to PPT or PPTX file")
    parser.add_argument("--slides", default="all",
                        help="Slide range: 'all', '1-5', '1,3,7', '3'")
    parser.add_argument("--dpi", type=int, default=150,
                        help="Render resolution (default: 150)")
    args = parser.parse_args()

    render_pages(args.path, args.slides, args.dpi)
