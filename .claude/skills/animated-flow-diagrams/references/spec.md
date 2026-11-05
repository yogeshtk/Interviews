# Spec reference (JSON)

Minimal shape. Everything not marked required is optional.

```json
{
  "title": "…",                       // required, shown in the app bar
  "type": "dataflow",                 // dataflow | context | logical | physical (label + conventions only)
  "mode": "scenes",                   // starting mode: scenes | timeline
  "theme": "auto",                    // auto | light | dark
  "pace": 1,                          // >1 slower, <1 faster
  "camera": "auto",                   // auto: follow scenes/steps only when the whole diagram would be too small to read | follow | fit
  "autoplay": false, "loop": true, "autoAdvance": false, "focus": true,
  "layout": { "mode": "layered", "direction": "LR", "rankGap": 150, "nodeGap": 46, "groupAware": true },
  "keys": { "slowModifier": "Shift", "fastModifier": "Alt", "map": { "playPause": ["Space","k"] } },
  "groups": [ … ], "nodes": [ … ], "edges": [ … ], "scenes": [ … ]
}
```

- `loop`: Timeline mode restarts at the end. `autoAdvance`: Scenes mode continues into the next scene instead of pausing. `focus`: dim components not involved in the current scene.
- `layout.mode`: `layered` (ranks left→right or top→bottom by data flow) or `radial` (the node with `"center": true`, or the busiest node, in the middle - good for context diagrams). `direction`: `LR` or `TB`.
- `keys.map` replaces whole actions. Actions: `playPause prevScene nextScene prevStep nextStep speedUp speedDown restart toggleControls toggleHelp toggleMode fit togglePanel toggleLegend toggleTheme toggleCamera sizeUp sizeDown toggleSize`. Key names are `KeyboardEvent.key` values (`Space`, `ArrowLeft`, `Enter`, single letters). Modifiers (`Shift`, `Alt`, `Control`) are held-state speed modifiers.

## nodes

```json
{ "id": "orders", "label": "Order Service", "kind": "service", "tech": "Java · Spring Boot",
  "description": "Shown in tooltip and side panel.", "group": "backend",
  "fill": 0.2, "queue": ["#1","#2"], "x": 0, "y": 0, "rank": 2, "center": false, "w": 180, "h": 64, "color": "#1976d2" }
```

| kind | use for | notes |
|---|---|---|
| `actor` | people, roles | |
| `service` | processes, apps, microservices | default |
| `gateway` | API gateway, load balancer, router, proxy | |
| `database` | relational/NoSQL stores | cylinder; `fill` 0..1 is the initial level |
| `storage` | object stores, file systems, archives | cylinder, teal |
| `queue` | queues, topics, streams | message chips; `queue` preloads chip labels |
| `cache` | Redis, CDN cache | |
| `external` | third-party / out-of-scope systems | dashed border |
| `server`, `container`, `device`, `cloud` | physical and deployment views | |

`x`,`y` pin a node (world units, top-left); unpinned nodes are auto-laid-out around pinned ones. `rank` forces a column. Prefer auto layout, then drag in the browser; `__fds.layout()` in the console prints positions you can paste back as `x`,`y`.

Labels: aim for <= 28 characters. Longer labels wrap to 2 lines then shorten with "…" (full text in tooltip and legend).

## groups (boundaries: region, VPC, trust zone, team, layer)

```json
{ "id": "vpc", "label": "VPC 10.0.0.0/16", "parent": "region", "color": "#1976d2", "style": "solid" }
```
Membership comes from `node.group`; `parent` nests groups. The box is drawn around members; dragging its header moves everything inside.

## edges

```json
{ "id": "e1", "from": "gw", "to": "orders", "label": "POST /orders", "kind": "async",
  "protocol": "HTTPS", "description": "…", "bidirectional": false, "color": "#9c27b0" }
```
`kind: "async"` (or `"dashed": true`) draws a dashed line. Labels wider than ~120 px become numbered badges listed in the legend. `id` is optional (`e0`, `e1`… by order) but give ids if scenes refer to them; scenes may also say `"edge": "gw->orders"`.

## scenes and steps

```json
{ "title": "Customer places an order", "text": "One-line summary shown in the side panel.",
  "steps": [
    { "edge": "e1", "payload": "order #1042", "caption": "Sentence shown while this plays." },
    { "edge": "e3", "payload": "INSERT", "fillBy": 0.12, "caption": "…" },
    { "edge": "e4", "payload": "charge", "parallel": true, "caption": "…" },
    { "node": "db", "fillTo": 0.4, "caption": "state change with no arrow" },
    { "caption": "A pause with just text.", "dur": 2 }
  ] }
```

Step fields:
- `edge` (id or `a->b`) animates a coloured dot with a trail along the link and pulses the target. `payload` is the label that rides with it; `msg` is a message identity (colour + chip label in queues).
- `node` instead of `edge`: pulse that node; combine with `fillTo`/`fillBy`, `enqueue: "msgLabel"` or `dequeue: true`.
- `fillTo` (absolute 0..1) / `fillBy` (delta) fill a store on arrival (`fillNode` to fill a different node than the target).
- Queues: an edge into a queue enqueues on arrival, an edge out dequeues the oldest chip at the start; set `"enqueue": false` / `"dequeue": false` to opt out.
- `parallel: true` starts together with the previous step (use sparingly, max 2 at once). `delay` shifts the start in seconds. `dur` and `hold` override timing. `persist: true` keeps the trail drawn.
- `caption` is the text shown during the step.

Scenes may also set `focus: ["nodeId", …]` to keep extra components undimmed.
