# Answer key: seeded flaws in TradeReportService.java (interviewers only)

| # | Location | Flaw | Failure scenario | Good fix |
|---|----------|------|------------------|----------|
| 1 | `isLate` | Uses `LocalDate.now()` in the JVM default time zone | Container runs in UTC, rule is a regulator-local deadline; report flagged late or on time wrongly near midnight | Inject a `Clock`, use an explicit zone from the spec, test around the boundary |
| 2 | `dueDate` | Skips weekends only, no holiday calendar | Trade before a bank holiday gets a due date on the holiday | Business-day calendar per jurisdiction, from a governed source |
| 3 | `roundPrice` | `double` plus `Math.round` | Binary floating point error, wrong half-way rounding, mismatch to source | `BigDecimal`, explicit scale and `RoundingMode` from the spec |
| 4 | `cleanLei` | Invalid identifier replaced with a default | Regulator accepts a wrong value or rejects later; data-quality break is hidden | Reject, route to an exception queue, alert; also validate LEI check digits |
| 5 | `amend` / `reports.put` | Amendment overwrites the original | Audit trail lost; cannot show what was originally reported | Append-only versions, link amendment to the original |
| 6 | `submitAll` | Unbounded retry loop, no backoff, not idempotent | Regulator outage means infinite loop; duplicates if a success response is lost | Bounded retries with backoff, idempotency key on the reference, dead-letter queue, alert |
| 7 | Tests | Happy path only, written by the same agent | Tests confirm the code, not the spec; none for holidays, bad LEI, amendment history, retries | Independent cases from the spec, boundary tests, failure-path tests |

## Secondary points (bonus)
- `HashMap` is not thread-safe; the service is shared across consumers.
- No reconciliation against source; no logging or metrics.
- `submitAll` ignores report type ordering (NEW must precede AMEND).
- Report has no version or status, so it cannot track submitted or rejected.

## Scoring
- Strong: finds 4 or more, ties each to the spec, proposes a systemic prevention.
- Adequate: finds 2 or 3.
- Weak: approves it or comments only on style.
