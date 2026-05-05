> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# frontend-fullchain-optimization

> Optimize frontend performance with a Web Vitals-driven diagnosis workflow

An evidence-first skill for diagnosing and improving frontend performance with
Web Vitals. It helps AI prioritize the right bottleneck, choose targeted fixes,
and verify whether a change actually improved user experience.

Use it when you need to optimize or review:

* slow page loads
* poor LCP, FCP, INP, CLS, TTFB, or TBT
* layout shifts and unstable rendering
* slow interactions caused by main-thread work
* image, font, or code-splitting regressions

## Why This Skill?

Most frontend performance work fails because teams optimize without enough
evidence or fix symptoms before upstream bottlenecks. This skill gives AI a
repeatable workflow:

1. Collect the minimum useful evidence
2. Identify the primary bottleneck
3. Pick the matching optimization branch
4. Re-measure when possible before claiming success

It supports both tool-rich and tool-light environments:

* **MCP-assisted mode** when Lighthouse or browser performance tooling is available
* **Manual-evidence mode** when you only have reports, traces, screenshots, or metric snapshots

By default, the workflow assumes Lighthouse and Performance evidence is
collected manually. If you do not have manual measurements yet, the skill should
only provide inferred suggestions and recommend follow-up verification after the
change.

## Install

```bash theme={null}
npx skills add mindfold-ai/marketplace --skill frontend-fullchain-optimization
```

Or install all available skills:

```bash theme={null}
npx skills add mindfold-ai/marketplace
```

Options:

| Flag             | Description                            |
| ---------------- | -------------------------------------- |
| `-g`             | Install globally (`~/.claude/skills/`) |
| `-a claude-code` | Target a specific agent                |
| `-y`             | Non-interactive mode                   |

## Verify Installation

Check if the skill is available:

```
What skills do you have access to?
```

Claude should list `frontend-fullchain-optimization` in the response.

## Usage

After installation, ask AI to analyze the current performance evidence:

```
Use frontend-fullchain-optimization to diagnose why this route has poor LCP and tell me what to fix first.
```

```
Review this Lighthouse report with frontend-fullchain-optimization and propose the smallest high-impact fix.
```

```
I only have DevTools screenshots and metric snapshots. Use frontend-fullchain-optimization in manual-evidence mode.
```

## What It Covers

| Area         | Included guidance                                                                          |
| ------------ | ------------------------------------------------------------------------------------------ |
| Metrics      | LCP, FCP, INP, CLS, TTFB, and TBT thresholds and prioritization                            |
| Diagnosis    | Primary bottleneck decision tree and required evidence checklist                           |
| Optimization | Rendering, images, fonts, code splitting, layout stability, and interaction responsiveness |
| Verification | Before/after template for documenting improvements and remaining bottlenecks               |

## What's Included

| File       | Contents                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `SKILL.md` | The full performance workflow, metric playbooks, evidence checklist, and verification template |
