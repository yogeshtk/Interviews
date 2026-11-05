---
name: animated-flow-diagrams
description: Build interactive, animated architecture and flow diagrams as one offline HTML file with an SVG canvas (pan, zoom, drag, step-through playback with keyboard controls, tooltips, legend, light/dark, Material UI look). Use whenever the user wants a data flow diagram, system context diagram, logical or physical/deployment architecture diagram, sequence-of-events walkthrough, or any "show how data moves through the system" visual - even if they only say "diagram", "architecture picture", "flow", "draw how X talks to Y", or ask for an animated or presentable version of a design. Prefer this over static Mermaid/ASCII/PNG when the audience will watch or explore the diagram.
---

# Animated flow diagrams

Turns a description of a system into a single self-contained `.html` page: a full-screen SVG canvas that the viewer can pan, zoom and rearrange (a bit like Lucidchart or OneNote), with a narrated, step-by-step animation of how data moves. The engine is already written and tested (`assets/`); your job is to **model the system well and choreograph the flow well**, then build, check and hand over.

Why this shape: viewers lose the plot when everything animates at once. The engine therefore plays one story step at a time, dims everything not involved, and shows the matching sentence in a caption. Your spec decides what the story is, so the quality of the diagram is mostly the quality of the scenes you write.

## Workflow

1. **Intake (ask only what changes the result).** Read `references/decisions.md`. Infer what you can from the request and any attached code/docs. For the rest, ask with AskUserQuestion, in one batch of at most 4 questions, each with 2-4 concrete options and a recommended default. Suggest ideas, don't interrogate: e.g. "I'd show the order flow in 4 scenes, with the queue filling up in scene 3 - OK?". If the user is away or says "you decide", pick the defaults, and **list every decision you made at the top of your final reply** so they can change it.
2. **Model the system.** Choose the diagram type (`references/diagram-types.md`), then write the spec JSON (`references/spec.md` has the full schema; `references/examples/` has three working specs to copy from). Keep one canvas to roughly 12 nodes or fewer; if the system is bigger, split into levels (context → containers → components) rather than shrinking text.
3. **Choreograph.** Follow the pacing rules below. This is where the diagram becomes understandable.
4. **Build and validate.**
   ```bash
   python scripts/build.py spec.json out.html     # validates first, prints warnings; fix them
   python scripts/qa_render.py out.html qa/       # headless Chrome: errors, overflow, screenshots
   ```
   Open the PNGs in `qa/` with the Read tool and look at them: are labels legible, is anything overlapping, does each scene read clearly? The numeric checks cannot see ugliness. If Chrome or Playwright is missing, say so and rely on the validator.
5. **Deliver.** Send the `.html` (SendUserFile / present_files if available), say in one or two lines what it shows, and give the decisions list plus the three or four things most worth changing. Mention `Space`, `C` and `?` so they can drive it.

## Choreography rules (the part that needs judgement)

- **One thing moves at a time.** Steps run in sequence. Use `"parallel": true` only for things that truly happen together, never more than 2 at once; the validator warns beyond that. Busy diagrams read as noise.
- **Scenes of 2-6 steps, each a single idea** ("Order is saved and paid", not "Everything"). Give every scene a `title` and a one-line `text`.
- **Every step gets a caption** of at most ~30 words that says what happens *and why it matters*. Captions appear in a card at the bottom and in the side panel; the engine holds each step long enough to read it.
- **Show state, not just arrows.**
  - Databases/stores: `"fillBy": 0.1` on the write step makes the cylinder visibly fill; start with a realistic `"fill"` on the node.
  - Queues/topics: an edge *into* a queue enqueues a message chip on arrival; an edge *out of* it dequeues the oldest chip at the start. Give messages ids with `"msg": "#1042"` so you can follow one. Show a second message arriving before the first is consumed, otherwise a queue looks like a plain box.
  - Request/response pairs: animate the request, then the response as a second edge.
- **Order the story as the data travels,** from the trigger to the last consumer. End with the slow/async consumers.
- **Pacing:** durations come from edge length and caption length. Use `"pace": 1.3` at spec level for dense audiences (slower), `0.8` for a quick demo. Don't hand-set `dur` unless something is clearly too fast.
- **Text must fit.** Labels up to ~28 characters stay on the node; longer ones are shortened with a tooltip and listed in the legend, and long edge labels become numbered badges with legend entries. Prefer short labels and put detail in `description` (shown in tooltips and the side panel).

## Controls the viewer gets (fixed behaviour you can describe to the user)

`Space` play/pause, `←/→` previous/next scene, `,` `.` replay previous / play next step, `↑/↓` or `[` `]` speed, hold `Shift` slow motion, hold `Alt` fast forward, `R` restart, `M` Scenes↔Timeline, `C` show/hide control bar, `P` story panel, `L` legend, `F` fit, `A` auto camera, `T` light/dark, `+` / `-` bigger/smaller text and components together, `S` size panel (separate Text and Components sliders, remembered per browser), `?` help. Controls are hidden until asked for (`C`).

**Camera and readable size.** Fits never go below 0.8× zoom, so the smallest text stays at about 8px or more on screen. If the whole diagram would need less than that, the camera frames one scene at a time (flows of other scenes sit outside the view); if even one scene does not fit readably, it frames one step at a time (floor 0.75×). Moves between sections zoom out a little and back in. Panning or zooming by hand pauses the camera until the next scene; `A` toggles following, `F` shows everything.

Mouse: drag background to pan, wheel/pinch to zoom, drag components or group headers to rearrange, click a component for its links, double-click background to fit. Layout changes persist in that browser.

Keys can be remapped per diagram (`keys` in the spec, see `references/spec.md`). Alt is the default fast modifier because holding Ctrl clashes with browser/OS shortcuts; offer Ctrl only if the user insists.

## Things to check before you hand over

- No validator errors; warnings read and either fixed or consciously accepted.
- `qa_render.py` passes (it now also checks that the smallest on-screen text is >= 8px and that each step's components are in view) and you looked at at least the first screenshot, one mid-scene screenshot and the dark one.
- Nothing important sits outside any group box it belongs to (drag-fix by setting `x`,`y` on the node or add `"rank"`), and no two labels overlap.
- Names, protocols and numbers come from the user's material, not invented. If you had to assume something (a port, a technology), say so in the reply.

## Customising the engine

The engine lives in `assets/runtime.js` and `assets/runtime.css` (about 900 lines, no dependencies). Add a node kind by extending `KIND` in `runtime.js`; change colours/shadows in the CSS variables at the top of `runtime.css`. Rebuild with `scripts/build.py`; never hand-edit generated HTML.
