# 34. DART GMS AI Evaluation and Improvement

Date: 2026-06-19 KST

Requirement IDs: `REF-003`, `JOB-018`, `REF-008`, `AI-004`, `AI-006`

## Goal

The DART AI feature must produce evidence that is useful for job application writing without inventing unsupported facts. AI output is preview-only: it can become a `DART` reference material only after the user reviews and saves it.

## Evaluation Targets

The evaluator grades each GMS AI analysis result before it is exposed as a completed analysis.

| Target | Pass condition | Improvement action |
| --- | --- | --- |
| Source grounding | Every evidence card has title, summary, source section, and the selected DART receipt number | Remove ungrounded cards |
| Policy safety | No stock outlook, investment advice, or hiring-probability wording | Remove risky cards or generated sentences; add caution |
| Essay usefulness | Appeal points and suggested sentences remain tied to report evidence | Keep only non-empty, non-prohibited items |
| Data shape | Lists are non-null, duplicate text is removed, relevance scores stay within 0-100 | Normalize lists, deduplicate, clamp scores, sort evidence by score |
| Failure boundary | At least one source-grounded evidence card remains | Mark analysis as `FAILED`; manual DART memo remains available |

## Techniques Applied

1. Structured JSON output
   - GMS is still called through the OpenAI-compatible `/responses` endpoint.
   - The prompt requests the fixed schema: `evidenceCards`, `appealPoints`, `suggestedSentences`, `cautions`, `missingInfo`.

2. Prompt self-check
   - The system prompt now tells the model to self-check selected receipt grounding, remove investment/hiring probability language, and avoid generic company introductions before returning JSON.
   - The user prompt adds a final quality-check step and asks the model to put uncertainty in `missingInfo`.

3. Deterministic code grader
   - `DartAnalysisQualityEvaluator` evaluates output with repeatable rules instead of trusting model self-review.
   - This is the release gate for DART AI completion.

4. Guardrail post-processing
   - Invalid receipt numbers, missing source sections, prohibited investment wording, and hiring-probability claims are filtered out.
   - The evaluator adds a caution when it adjusts the model output, so the user knows review is still needed.

5. Regression tests
   - `DartAnalysisQualityEvaluatorTest` catches ungrounded cards, prohibited wording, score clamping, and no-evidence failure.
   - `DartAnalysisServiceTest` verifies the evaluator is integrated before analysis results can be saved.

## Current Rubric

The current score is a local quality signal, not shown as a product promise.

| Criterion | Points |
| --- | ---: |
| At least one valid evidence card | 40 |
| All kept evidence has a source section | 20 |
| Appeal points remain | 20 |
| Suggested sentences remain | 10 |
| No evaluator adjustments were needed | 10 |

An analysis passes only when at least one source-grounded evidence card remains after filtering.

## Regression Run

Command:

```bash
.\mvnw.cmd "-Dtest=DartAnalysisQualityEvaluatorTest,DartAnalysisServiceTest" test
```

Result:

- `DartAnalysisQualityEvaluatorTest`: 2 passed
- `DartAnalysisServiceTest`: 5 passed
- Total targeted DART AI eval tests: 7 passed

## Remaining Review Policy

The evaluator is intentionally conservative. It does not verify whether a report claim is semantically true beyond the supplied DART text and receipt metadata. Human review remains required before using a saved DART reference in an essay.

Future improvement candidates:

- Add a durable eval fixture set with representative DART report excerpts.
- Add pass@3 tracking across `gpt-4.1`, `gpt-4.1-mini`, and `gemini-2.5-flash`.
- Add a separate human review checklist for high-impact public-company claims.
- Add latency and credit-cost logging without recording prompts that contain sensitive user data.
