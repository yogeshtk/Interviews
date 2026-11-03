# Design probes (pick what the candidate hasn't covered)

Stack: Java, MongoDB, Solace with JMS, S3, Docker on Kubernetes. Candidate brief: `candidate/exercise-3-design.md`. More detail: `supporting/technical-depth-questions.md`.

| Probe | Good answer includes |
| --- | --- |
| What happens if MongoDB goes down? | Replica set failover, majority write concern, messages stay on the queue, acknowledge after durable write, recovery time |
| How do you handle duplicate messages? | Idempotency keyed on transaction reference, safe retries, duplicates as normal |
| What happens if the regulator is unavailable? | Bounded retries with backoff, alert before the deadline, manual fallback, evidence of attempts |
| How do you make sure no trades are lost? | Durable queues, acknowledge after commit, dead-letter queue, replay procedure, reconciliation against source |
| How do you prove the file is complete and correct? | Counts and totals reconciled to source, checksums, versioned and immutable S3 object, audit trail |
| What SLA would you set and how would you measure it? | SLI/SLO/SLA distinction, deadline-based target, alerts on queue age and time to file completion |

## Strong signals

- Designs for the deadline first, then for throughput.
- Gives numbers and says how they'd be measured.
- Names the trade-off in each choice.
- Describes an outage they handled, including what monitoring missed.

Java, MongoDB, Solace and Kubernetes depth comes out through these probes. Don't interview each technology separately.
