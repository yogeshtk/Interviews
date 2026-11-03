# Question bank

Pick two or three per area. Follow up with "what happened next?" or "how did you know?" to separate real experience from rehearsed answers.

## Regulatory domain

| Question | Good answer includes |
| --- | --- |
| A regulator rejects 3% of yesterday's submissions. What do you do? | Triage by reason code, fix and resubmit within the deadline, root cause, notify compliance |
| How do you prove a report matches the books and records? | Reconciliation, lineage from source to submission, controls, sign-off |
| A rule changes with six weeks' notice. How do you plan the change? | Impact analysis, versioned rules, parallel run, test against regulator validation |
| How do you handle late-arriving or corrected trade data? | Amendment flow, audit trail, no silent overwrites |

## Spec-driven and AI-assisted development

| Question | Good answer includes |
| --- | --- |
| What belongs in the spec and what should the agent decide? | Pins down rules and outputs, leaves implementation detail |
| How do you stop an agent confidently getting a regulatory rule wrong? | Cites source text in the spec, independent tests, human review of interpretation |
| What would you never delegate to an agent? | Rule interpretation, sign-off, data fixes without trace |
| A generated change passes all tests but feels wrong. What next? | Questions the tests, checks against the spec and source data |
| How do you keep specs and code in sync over time? | Spec changes first, review both, traceability from rule to test |

## Behavioural (STAR: situation, task, action, result)

- Tell me about a production reporting error. How was it found, and what changed afterward?
- Describe pushing back on a stakeholder's vague or risky requirement.
- Tell me about hitting a regulatory deadline under pressure. What did you cut and what did you refuse to cut?
- How have you raised the bar for a team's engineering practice?

## Red flags

- Treats the AI's output as correct because it ran.
- Describes regulatory data as just another feed.
- Blames others for every failure, or can't name one.
- Cannot say what they would not automate.
