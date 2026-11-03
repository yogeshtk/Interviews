# Senior Engineer Interview Pack: Regulatory Reporting Tech

Stack: Java, MongoDB, Solace/JMS, S3, Docker/Kubernetes. Development uses Spec Kit (spec-driven AI development).

Same exercises and rubric for every candidate. Score on evidence, not impressions.

## Layout

| Folder | Who sees it |
| --- | --- |
| `candidate/` | Hand to the candidate (briefs and code only) |
| `interviewer/` | Interviewers only (flow, notes, answer keys, rubric, questions) |

## Running order

| Stage | Length | Interviewer | File |
| --- | --- | --- | --- |
| 1. Screen call | 30 min | Hiring manager | `interviewer/04-question-bank.md` |
| 2. Spec-writing work sample | 60 min | Senior engineer | `candidate/work-sample-brief.md`, `interviewer/01-work-sample-notes.md` |
| 3. Code review and platform design | 45 min | Peer engineer | `candidate/code-review/`, `candidate/design-exercise-brief.md`, `interviewer/02-...`, `interviewer/03-...` |
| 4. Domain and stakeholder conversation | 45 min | Compliance, ops or reporting analyst | `interviewer/04-question-bank.md` |
| 5. Behavioural and values | 30 min | Hiring manager or skip-level | `interviewer/04-question-bank.md` |

Full detail: `interviewer/00-interview-flow.md`. Scoring: `interviewer/05-scorecard.md`.

## Before the interview

- Share the format and the tools with the candidate in advance.
- Print or open `interviewer/05-scorecard.md` for each interviewer.
- Compile check for the Java exercise: `cd candidate/code-review && javac *.java && java TradeReportServiceTest`

## After

Each interviewer scores independently and writes down evidence before discussion. Debrief within 24 hours.
