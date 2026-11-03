# Design exercise: platform, resilience and SLA (30 min)

> Trades arrive on Solace queues all day. Java services validate and enrich them, store them in MongoDB, and write the daily regulatory file to S3 for submission. The file must be with the regulator by 07:00 UTC on T+1.
>
> Design it so one node, one zone or one dependency can fail without missing the deadline.

Be ready to cover:

- Message handling (acknowledgement, retries, duplicates, poison messages)
- Data model for amendments and audit
- File integrity from generation to submission
- Deployment on Kubernetes without losing in-flight messages
- Service levels you would commit to, how you would measure them, and what you would alert on
- How you would size and test for a peak day
