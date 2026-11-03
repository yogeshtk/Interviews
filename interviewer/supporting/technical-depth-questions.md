# Technical depth: platform, HA, performance and SLA

Stack: Java, MongoDB, Solace with JMS, S3, Docker on Kubernetes. Candidate brief: `candidate/design-exercise-brief.md`

The SLA figures below are illustrative. Replace them with your own.

| Area | Probe | Good answer includes |
| --- | --- | --- |
| Java | How do you tune a service that pauses under load? | Heap sizing, GC choice and logs, profiling before changing, thread pool limits |
| Java | How do you make a consumer safe to retry? | Idempotency keyed on transaction reference, no side effects before commit |
| Solace / JMS | Client acknowledge, auto acknowledge or transacted session? | Acknowledge after durable processing, redelivery handling, duplicate tolerance |
| Solace / JMS | A message keeps failing. What happens? | Redelivery limit, dead-letter queue, alerting, replay procedure |
| Solace / JMS | How do you keep order and still scale consumers? | Partitioned or exclusive queues, ordering by key, trade-offs |
| MongoDB | Replica set write concern and read preference for reporting? | Majority write concern for reported data, failover behaviour, stale reads on secondaries |
| MongoDB | How do you model amendments and keep an audit trail? | Versioned documents or append-only events, indexes for the reporting query |
| S3 | How do you guarantee the file submitted is the file generated? | Checksums, versioning, immutability or object lock, access control, retention |
| Docker / Kubernetes | How do you deploy without losing in-flight messages? | Graceful shutdown, readiness and liveness probes, rolling updates, pod disruption budgets |
| Docker / Kubernetes | How do you spread risk across failures? | Replicas across zones, resource requests and limits, autoscaling limits |

## High availability and SLA

- What is the difference between an SLA, an SLO and an SLI? Which would you set for this report?
- Illustrative target: the daily file submitted by 07:00 UTC, 99.9% of business days. How much error budget is that per year?
- Where are your single points of failure, and how would you find the ones you haven't thought of?
- What are your RTO and RPO for MongoDB and for the Solace broker? How do you test them?
- What happens if the regulator's endpoint is down at 06:55?
- How would you run a failover drill without risking production reporting?

## Performance

- How would you size the system for a peak day, such as 5x normal volume?
- Where do you expect the bottleneck: the broker, the service, MongoDB or S3? How would you prove it?
- Which metrics would you alert on? Strong answers cover queue depth and age, consumer lag, processing latency percentiles, error rate and time to file completion.
- How do you load test with realistic data without exposing real trades?

## Strong signals

- Designs for the deadline first, then for throughput.
- Treats duplicates and replays as normal, not exceptional.
- Gives numbers (volumes, latencies, recovery times) and says how they'd be measured.
- Names the trade-off in each choice, such as consistency against availability.
- Describes an outage they handled, including what monitoring missed.
