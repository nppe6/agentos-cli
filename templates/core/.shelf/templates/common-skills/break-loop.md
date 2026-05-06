# Break Loop

Analyze a recently fixed bug deeply enough to prevent the same class of bug from recurring.

## When to Use

Use this after a bug has been fixed but before moving on, especially when:

- a bug was subtle or surprising
- more than one fix attempt was needed
- the failure exposed a missing guardrail, test, or spec
- the issue suggests a reusable lesson for future AI sessions

## Workflow

1. Summarize the bug, the fix, and the root cause in plain language.
2. Identify why the issue escaped earlier detection:
   - missing spec
   - missing test
   - misleading pattern
   - weak error handling
   - hidden cross-layer coupling
3. Determine what durable project memory should change:
   - `.shelf/spec/...`
   - a guide in `.shelf/spec/guides/...`
   - test coverage expectations
   - code review or implementation checklist guidance
4. Update the relevant spec or guide with the lesson.
5. Report the lesson and where it was captured.

## Output

- Root cause summary
- Escape analysis
- Durable prevention action
- Updated spec/guide path
