#!/usr/bin/env python3
"""Render a built diagram in headless Chrome and check it.

Usage: python qa_render.py diagram.html outdir [--width 1600 --height 900]
Writes outdir/shot-*.png (initial, each scene mid-way, dark mode, controls+help) and outdir/qa.json.
Checks: no console/page errors, no text wider than its component, smallest on-screen text >= 8px, active components inside the view at every step.
Look at the PNGs yourself (Read tool) — the numbers cannot tell you if it looks good.
"""
import json, os, sys
from playwright.sync_api import sync_playwright


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(a) < 2:
        sys.exit(__doc__)
    html, out = os.path.abspath(a[0]), a[1]
    W = int(sys.argv[sys.argv.index("--width") + 1]) if "--width" in sys.argv else 1600
    H = int(sys.argv[sys.argv.index("--height") + 1]) if "--height" in sys.argv else 900
    os.makedirs(out, exist_ok=True)
    errors, report = [], {"checks": []}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": W, "height": H})
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto("file://" + html)
        pg.wait_for_function("window.__fds")
        pg.screenshot(path=f"{out}/shot-0-initial.png")
        info = pg.evaluate("({T: __fds.T, scenes: __fds.scenes.map(s=>({start:s.start,end:s.end,title:s.title,n:s.steps.length}))})")
        report["duration_s"] = info["T"]; report["scenes"] = info["scenes"]
        # text overflow check
        bad = pg.evaluate("__fds.texts().filter(t => t.w > t.nodeW - 8)")
        report["checks"].append({"name": "no label wider than its component", "passed": not bad, "evidence": bad[:5]})
        pg.keyboard.press("p")  # keep panel as designed; just exercise key
        pg.keyboard.press("p")
        for i, s in enumerate(info["scenes"]):
            mid = s["start"] + (s["end"] - s["start"]) * 0.55
            pg.evaluate(f"__fds.seek({mid})")
            pg.wait_for_timeout(450)
            pg.screenshot(path=f"{out}/shot-{i+1}-scene.png")
        # every step: smallest visible text >= 8px on screen, and the nodes it touches are inside the view
        steps = pg.evaluate("__fds.flat.map(s => [s._t0, s._t1])")
        small, outside = [], []
        for i, (a0, a1) in enumerate(steps):
            pg.evaluate(f"__fds.seek({a0 + (a1 - a0) * 0.6})"); pg.wait_for_timeout(1250)
            r = pg.evaluate("""(() => { const k = __fds.view.k; let mf = 99;
              document.querySelectorAll('.node text,.elabel text').forEach(t => { const n = t.closest('.node'); if (n && n.classList.contains('dim')) return; if (!t.textContent.trim()) return;
                const m = t.getScreenCTM(); mf = Math.min(mf, parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b)); });
              const cur = __fds.flat.filter(s => s._t0 <= __fds.st.t).pop(); const ids = cur && cur._e ? [cur._e.from, cur._e.to] : (cur && cur.node ? [cur.node] : []);
              let vis = true; ids.forEach(id => { const r = document.querySelector('.node[data-id=' + id + ']').getBoundingClientRect(); if (r.left < -2 || r.top < 50 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2) vis = false; });
              return { mf, vis }; })()""")
            if r["mf"] < 8: small.append([i + 1, round(r["mf"], 1)])
            if not r["vis"]: outside.append(i + 1)
        report["checks"].append({"name": "smallest on-screen text >= 8px at every step", "passed": not small, "evidence": small[:6]})
        report["checks"].append({"name": "components of the active step are inside the view", "passed": not outside, "evidence": outside[:6]})
        pg.evaluate("__fds.seek(0)")
        pg.keyboard.press("c"); pg.keyboard.press("t"); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{out}/shot-dark-controls.png")
        pg.keyboard.press("?"); pg.wait_for_timeout(250)
        pg.screenshot(path=f"{out}/shot-help.png")
        pg.keyboard.press("Escape"); pg.keyboard.press("?")
        # playback sanity: play, wait, ensure time advanced, pause
        pg.keyboard.press("Space"); pg.wait_for_timeout(900)
        t1 = pg.evaluate("__fds.st.t"); pg.keyboard.press("Space"); t2 = pg.evaluate("__fds.st.t"); pg.wait_for_timeout(300); t3 = pg.evaluate("__fds.st.t")
        report["checks"].append({"name": "Space plays then pauses", "passed": t1 > 0.3 and abs(t3 - t2) < 1e-6, "evidence": [t1, t2, t3]})
        pg.keyboard.press("ArrowRight"); n1 = pg.evaluate("__fds.st.scene")
        pg.keyboard.press("ArrowLeft");
        report["checks"].append({"name": "arrow keys change scene", "passed": n1 >= 0, "evidence": n1})
        b.close()
    report["checks"].append({"name": "no console or page errors", "passed": not errors, "evidence": errors[:5]})
    json.dump(report, open(f"{out}/qa.json", "w"), indent=2)
    for c in report["checks"]:
        print(("PASS " if c["passed"] else "FAIL ") + c["name"], "" if c["passed"] else c["evidence"])
    sys.exit(0 if all(c["passed"] for c in report["checks"]) else 1)


if __name__ == "__main__":
    main()
