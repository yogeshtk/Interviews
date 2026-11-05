# Decision points

Ask only where a wrong guess costs a rebuild or the user clearly has a preference. Everything has a default so the skill can run unattended; whenever you used a default, list it in the final reply.

| Decision | Options (first = default) | Ask when |
|---|---|---|
| Diagram type | data flow · system context · logical architecture · physical/deployment | the request doesn't make it obvious. Offer to build two linked diagrams if both are wanted |
| Detail level / audience | executives (6-8 nodes, no tech labels) · engineers (tech + protocols on nodes) · onboarding (names + descriptions) | audience is unknown. Default: engineers |
| Story structure | scripted scenes with narration · single continuous timeline | the system has a clear "happy path" (scenes) vs a steady-state pipeline (timeline). The viewer can always toggle with `M`, this only picks the starting mode |
| Scenes | proposed list of 3-5 scene titles | always propose your list in one line and let them veto; it is the highest-leverage choice |
| Keyboard scheme | Space, arrows, hold Shift = slow, hold Alt = fast | user mentions Ctrl/other keys, or says the audience uses a particular OS. Remap through `keys` |
| Theme | auto (follows OS, toggle with `T`) · light · dark | presenting on a projector/big monitor |
| Camera | auto (follows the active scene only when the full diagram would be too small) · always show all · always follow | the diagram is large (more than ~10 nodes) |
| Pace | normal (1) · slower (1.3) · quicker (0.8) | live presentation vs self-service reading |
| Layout | automatic layers/radial · fixed `x`,`y` per node | the user wants a particular arrangement (e.g. mirrors an existing drawing). Otherwise auto, then they can drag |
| Autoplay | off (start paused, hint shows `Space`) · on | embedding on a kiosk/screen |
| Delivery | single offline `.html` file | only if they ask for a link/hosting or another format |

## Ideas worth offering unprompted

- A second, higher-level context diagram if they gave a detailed container diagram (and vice versa).
- A "failure path" scene (dead-letter queue, retry, fallback) after the happy path.
- Fill levels for stores and message chips for queues when the system has them.
- Grouping boxes for trust boundaries, regions, VPCs or teams.
