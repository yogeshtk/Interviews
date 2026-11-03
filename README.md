# Senior Engineer Interview: Regulatory Reporting Tech

One 90-minute structured interview. Stack: Java, MongoDB, Solace/JMS, S3, Docker/Kubernetes. Development uses Spec Kit (spec-driven AI development).

The question it answers: can this person take an ambiguous regulatory requirement, turn it into a reliable technical solution, use AI intelligently, and make sure it works in production?

## Layout

| Path | Who sees it |
| --- | --- |
| `candidate/` | Candidate: three short exercise briefs and the Java code |
| `interviewer/00-interview-script-90min.md` | Interviewer script with timings and follow-ups |
| `interviewer/01-scorecard.md` | One-page scorecard |
| `interviewer/02-code-review-answer-key.md` | Answer key for the seeded flaws |
| `interviewer/03-design-probes.md` | Six design probes |
| `interviewer/supporting/` | Detailed notes and question bank, as backup |

## Plan

| Time | Section | Candidate brief |
| --- | --- | --- |
| 30 min | Requirements and spec | `candidate/exercise-1-spec.md` |
| 25 min | Code review | `candidate/exercise-2-code-review/` |
| 25 min | System design and experience | `candidate/exercise-3-design.md` |
| 10 min | Candidate questions and close | |

## Before the interview

- Send the candidate the format in advance. Don't share `interviewer/`.
- Check the Java exercise compiles: `cd candidate/exercise-2-code-review && javac -d /tmp/o *.java && java -cp /tmp/o TradeReportServiceTest`
- Print `interviewer/01-scorecard.md`.

## Priorities for this role

1. Specification thinking.
2. Verification mindset: spotting when AI-generated code and tests are wrong.
3. Production engineering: data integrity and meeting regulatory deadlines despite failures.
