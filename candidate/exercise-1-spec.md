# Exercise 1: Requirements and specification (30 min)

## The rule (fictional, modelled on transaction reporting)

> Firms must report each executed trade to the regulator by the end of the next business day (T+1). Each report carries trade date, execution time, price, quantity, venue, counterparty identifier and a unique transaction reference. Corrections must be sent as amendments, and cancelled trades must be reported as cancellations. Reports with invalid identifiers are rejected by the regulator.

## Tasks

1. (5 min) Read the rule. What is unclear or missing? Ask the interviewer.
2. (15 min, no AI) Write a short specification an AI coding agent could implement safely.
3. (10 min, AI allowed) Use an AI assistant to produce an implementation approach from your spec. Critique its output: what would you verify before trusting it?
