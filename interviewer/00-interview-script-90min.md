# 90-minute interview script

One interview, three exercises. One question guides the whole thing:

> Can this person take an ambiguous regulatory requirement, turn it into a reliable technical solution, use AI intelligently, and make sure it works in production?

Don't ask every question. Use follow-ups based on the candidate's answers. Write evidence in `01-scorecard.md` as you go.

| Time | Section | Assesses |
| --- | --- | --- |
| 0:00 (30 min) | 1. Requirements and spec | Thinking, clarification, specification, AI critique |
| 0:30 (25 min) | 2. Code review | Engineering judgement, verification |
| 0:55 (25 min) | 3. System design and experience | Architecture, resilience, seniority |
| 1:20 (10 min) | 4. Candidate questions and close | Their questions, next steps |

Send the format and the three briefs in `candidate/` to the candidate in advance. Give them the exercise brief only when each section starts.

## Opening (2 min, inside section 1)

Explain the format, that you are not expecting perfection, and that they should think aloud.

## 1. Requirements and spec (30 min): `candidate/exercise-1-spec.md`

- **5 min, questions.** Answer only questions that are asked well. Score the quality of the questions. Strong candidates ask about time zones, business days and holidays, amendments and cancellations, identifier validation, and rejection handling.
- **15 min, spec by hand, no AI.** Look for testable acceptance criteria, edge cases, and a clear line between what is pinned down and what is left to the agent.
- **10 min, AI allowed.** They generate an approach and critique it. Look for: questions the generated tests, checks against the spec and source data, and spots what the spec left out.

Follow-ups: "What would you never delegate to the agent?" "How would you know the generated code matches the rule?"

## 2. Code review (25 min): `candidate/exercise-2-code-review/`

- **15 min review**, then **10 min** on the three biggest risks and fixes.
- Ask: "Would you merge this? What are the three biggest risks?"
- Don't expect every flaw. Key flaws are in `02-code-review-answer-key.md`: business-day calculation, price precision, invalid LEI handling, lost amendment history, infinite retry, missing idempotency, weak tests.
- Strong: ties each finding to the spec and proposes prevention (a spec change, a test, a rule).

Follow-up: "The spec didn't mention holidays. Whose fault is that: yours, the spec's or the agent's?"

## 3. System design and experience (25 min): `candidate/exercise-3-design.md`

- **15 min design.** Probes from `03-design-probes.md`; pick the ones the candidate hasn't covered.
- **10 min experience.** Ask two targeted questions:
  1. "Tell me about a production reporting incident. How was it found, and what changed afterward?"
  2. "Tell me about pushing back on a vague or risky requirement."

## 4. Close (10 min)

Candidate questions (note their quality), next steps. Don't give feedback on the exercises.

## After

Fill in the scorecard before talking to the panel. Share scores independently, then discuss. Debrief within 24 hours.
