# Work sample: write the spec (60 min)

You will turn a vague regulatory rule into a spec that an AI coding agent could implement safely. Spec quality is the core skill in a spec-driven workflow.

## Format

- Tasks 1 and 2: by hand, no AI assistant (40 min).
- Tasks 3 and 4: an AI assistant is allowed (20 min).
- Write in plain markdown. Talk through your thinking as you go.

## The rule (fictional, modelled on transaction reporting)

> Firms must report each executed trade to the regulator by the end of the next business day (T+1). Each report carries trade date, execution time, price, quantity, venue, counterparty identifier and a unique transaction reference. Corrections must be sent as amendments, and cancelled trades must be reported as cancellations. Reports with invalid identifiers are rejected by the regulator.

## Tasks

1. (10 min, by hand) List the clarifying questions you would ask before writing anything. Rank them by risk.
2. (30 min, by hand) Write a one-page spec covering purpose, inputs, outputs, business rules, acceptance criteria and edge cases. Say what you would leave to the agent and what you would pin down.
3. (10 min, AI allowed) List the constraints a project constitution should hold.
4. (10 min, AI allowed) Run your spec through an AI assistant, or use the sample output provided, and tell the interviewer what you would check before trusting it.
