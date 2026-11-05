#!/usr/bin/env python3
"""Validate a diagram spec before building. Prints errors (exit 1) and warnings (exit 0).

Usage: python validate_spec.py spec.json
Warnings flag things that make a diagram look busy or hard to read, so fix them before delivering.
"""
import json, sys

KINDS = {"actor", "service", "gateway", "database", "storage", "queue", "cache", "external",
         "server", "container", "device", "cloud"}


def words(s):
    return len(str(s or "").split())


def main(path):
    spec = json.load(open(path, encoding="utf-8"))
    errs, warns = [], []
    nodes = {n.get("id"): n for n in spec.get("nodes", [])}
    if len(nodes) != len(spec.get("nodes", [])):
        errs.append("duplicate or missing node ids")
    groups = {g.get("id") for g in spec.get("groups", [])}
    edges = spec.get("edges", [])
    eids = {}
    for i, e in enumerate(edges):
        eid = e.get("id") or f"e{i}"
        if eid in eids:
            errs.append(f"duplicate edge id {eid}")
        eids[eid] = e
        for end in ("from", "to"):
            if e.get(end) not in nodes:
                errs.append(f"edge {eid}: unknown node '{e.get(end)}' in '{end}'")
    for n in nodes.values():
        if n.get("kind", "service") not in KINDS:
            warns.append(f"node {n['id']}: unknown kind '{n.get('kind')}' (falls back to service); known: {sorted(KINDS)}")
        if n.get("group") and n["group"] not in groups:
            errs.append(f"node {n['id']}: unknown group '{n['group']}'")
        if len(str(n.get("label", ""))) > 34:
            warns.append(f"node {n['id']}: label is long ({len(n['label'])} chars); it will be shortened with a tooltip. Prefer <= 28 chars and move detail into 'description'.")
        if not n.get("description"):
            warns.append(f"node {n['id']}: no 'description' (tooltip/selection card will be empty)")
    connected = {e.get("from") for e in edges} | {e.get("to") for e in edges}
    for nid in nodes:
        if nid not in connected:
            warns.append(f"node {nid}: has no edges")

    def resolve(ref):
        if ref in eids:
            return ref
        for sep in ("->", "→", ">"):
            if sep in ref:
                a, b = [x.strip() for x in ref.split(sep, 1)]
                for k, e in eids.items():
                    if e.get("from") == a and e.get("to") == b:
                        return k
        return None

    scenes = spec.get("scenes", [])
    if not scenes:
        warns.append("no scenes: the diagram will be static (no playback). Add scenes to show flow.")
    used_edges = set()
    for si, sc in enumerate(scenes):
        steps = sc.get("steps", [])
        if not sc.get("title"):
            warns.append(f"scene {si+1}: no title")
        if not steps:
            warns.append(f"scene {si+1}: no steps")
        if len(steps) > 9:
            warns.append(f"scene {si+1}: {len(steps)} steps; split into scenes of <= 8 so each stays easy to follow")
        run = 0
        for k, s in enumerate(steps):
            if "edge" in s:
                r = resolve(s["edge"])
                if not r:
                    errs.append(f"scene {si+1} step {k+1}: unknown edge '{s['edge']}'")
                else:
                    used_edges.add(r)
            elif "node" in s:
                if s["node"] not in nodes:
                    errs.append(f"scene {si+1} step {k+1}: unknown node '{s['node']}'")
            elif not s.get("caption"):
                warns.append(f"scene {si+1} step {k+1}: step has no edge, node or caption")
            if not s.get("caption"):
                warns.append(f"scene {si+1} step {k+1}: no caption (reader sees only auto text)")
            elif words(s["caption"]) > 38:
                warns.append(f"scene {si+1} step {k+1}: caption is {words(s['caption'])} words; keep under ~30 so it fits the caption card")
            run = run + 1 if s.get("parallel") else 1
            if run > 2:
                warns.append(f"scene {si+1} step {k+1}: {run} steps animate at once; more than 2 looks busy")
            if s.get("fillTo") is not None and not (0 <= s["fillTo"] <= 1):
                errs.append(f"scene {si+1} step {k+1}: fillTo must be 0..1")
    for k in eids:
        if scenes and k not in used_edges:
            warns.append(f"edge {k}: never animated in any scene (fine for context-only links)")
    for m in errs:
        print("ERROR:", m)
    for m in warns:
        print("warn: ", m)
    print(f"{len(nodes)} nodes, {len(edges)} edges, {len(scenes)} scenes — {len(errs)} error(s), {len(warns)} warning(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
