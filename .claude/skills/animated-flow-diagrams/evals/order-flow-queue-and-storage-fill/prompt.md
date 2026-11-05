---
tags: [animated-flow-diagrams]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

can you make me an animated data flow diagram of our order flow? customer -> api gateway -> order service, which writes to postgres, calls the payment provider, and publishes an OrderCreated event to a kafka topic. fulfilment consumes from the topic and we archive every event to S3. i want to actually see the DB and S3 filling up and messages sitting in the topic before they get consumed. i'm offline for a bit so just pick sensible defaults and tell me what you chose
