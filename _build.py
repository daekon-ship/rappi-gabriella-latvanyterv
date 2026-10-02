#!/usr/bin/env python3
"""index.html -- beagyazza a styles.css es main.js tartalmat a marker koze.

Hasznalat: python3 _build.py  (utana frissul a preview)
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent


def replace_block(text: str, opener: str, closer: str, payload: str, label: str) -> str:
    i = text.find(opener)
    if i == -1:
        sys.exit(f"hianyzo marker: {label}")
    start = i + len(opener)
    j = text.find(closer, start)
    if j == -1:
        sys.exit(f"hianyzo zarojel: {label}")
    return text[:start] + "\n" + payload.rstrip() + "\n" + text[j:]


def main() -> None:
    html_path = ROOT / "index.html"
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    js = (ROOT / "main.js").read_text(encoding="utf-8")
    html = html_path.read_text(encoding="utf-8")

    html = replace_block(html, '<style id="app-css">', "</style>", css, "css")
    html = replace_block(html, '<script id="app-js">', "</script>", js, "js")

    html_path.write_text(html, encoding="utf-8")
    print(f"ok: index.html frissitve ({len(html) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
