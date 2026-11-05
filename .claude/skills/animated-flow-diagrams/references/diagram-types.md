# Diagram types and their conventions

Pick the type from the question being answered, and set `"type"` in the spec (it only changes the label in the app bar; the conventions below are what you apply).

## System context (`context`)
Question: *who and what does this system talk to?*
- One system in the middle (`"center": true`, `layout.mode: "radial"`), people (`actor`) and other systems (`external`) around it. No internals, no databases or queues of the system itself.
- Label links with the business meaning ("Payment instruction"), not the protocol. 5-9 neighbours at most.
- Scenes: follow one business event through the neighbours; request/response as two edges.

## Data flow (`dataflow`)
Question: *where does data come from, what transforms it, where does it rest?*
- Use `service` for processes, `database`/`storage` for data at rest, `queue` for buffers, `actor`/`external` for sources and sinks. Every edge carries named data (`payload`).
- Show stores filling (`fillBy`) and queues buffering (`msg`) - that is the point of this type.
- Layered LR layout. Group by team or bounded context if useful.

## Logical architecture (`logical`)
Question: *what are the building blocks and how do they depend on each other?*
- Technology-neutral names ("Order Service", not "order-svc-prod"). Put technology in `tech` only if the audience needs it.
- Groups = layers (Presentation, Domain, Data) or bounded contexts; `direction: "TB"` often suits layer diagrams.
- Edges = interfaces/dependencies; label with the contract ("REST", "events: OrderCreated"). Scenes: a use case end to end.

## Physical / deployment architecture (`physical`)
Question: *what runs where?*
- Nodes are `server`, `container`, `device`, `gateway`, `cloud`, `database`, plus `queue`/`cache` where managed services. Put sizes/zones in `tech` ("AZ a · 2 vCPU").
- Groups = region ⊃ VPC/network ⊃ cluster/subnet/zone (nest with `parent`). Trust boundaries are groups with a distinct `color`.
- Label edges with port/protocol ("HTTPS 443", "JDBC 5432"). Scenes: a request path, a failover, a deployment.
- Replicas: show both (pod A, pod B) but animate one path per scene to keep it calm.

## Choosing between them
If the user says "architecture diagram" without more: ask whether they want logical (what) or physical (where) - or offer both as two files, and build the logical one first.
