#!/usr/bin/env python3
"""Build a single self-contained, offline HTML diagram from a JSON spec.

Usage: python build.py spec.json out.html [--no-validate]
The output has no external dependencies (no CDN, no fonts, no images).
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")


def read(name):
    with open(os.path.join(ASSETS, name), encoding="utf-8") as f:
        return f.read()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        sys.exit(__doc__)
    spec_path, out = args
    if "--no-validate" not in sys.argv:
        rc = subprocess.call([sys.executable, os.path.join(HERE, "validate_spec.py"), spec_path])
        if rc:
            sys.exit("Fix the errors above, then rebuild.")
    spec = json.load(open(spec_path, encoding="utf-8"))
    payload = json.dumps(spec, ensure_ascii=False).replace("</", "<\\/")
    html = (read("template.html")
            .replace("__TITLE__", (spec.get("title") or "Diagram").replace("<", "&lt;"))
            .replace("__CSS__", read("runtime.css"))
            .replace("__SPEC__", payload)
            .replace("__JS__", read("runtime.js").replace("</script", "<\\/script")))
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {out} ({len(html)//1024} KB)")


if __name__ == "__main__":
    main()
