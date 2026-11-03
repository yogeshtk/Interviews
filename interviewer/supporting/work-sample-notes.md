# Work sample: interviewer notes

Candidate brief: `candidate/work-sample-brief.md`

## Rules for you

- Don't answer clarifying questions generously. Answer only when asked well, and score the quality of the questions.
- Run the same brief for every candidate.
- Ask the candidate to name the Java classes and tests the agent should produce, and what they would check at the end.

## What strong looks like

- Asks about time zones, T+1 across holidays and jurisdictions, and what "business day" means before writing a line.
- Covers amendments, cancellations, late trades, rejected reports and resubmission.
- Writes testable acceptance criteria ("given X, the report shows Y"), not adjectives.
- Separates the stable "what" from the flexible "how".
- Proposes reconciliation against source, not just unit tests.
- Names what must stay human-reviewed: rule interpretation, sign-off and regulator contact.

## Constitution (task 3): look for

Audit trail, no silent data fixes, reconciliation to source, idempotent submission, versioned rules, no mutation of reported data.

## Task 4: look for

Questions the generated tests, checks them against the spec and source data, and looks for what the spec left out (holidays, bad identifiers, amendment history).
