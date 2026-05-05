> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# open-typeless

> Step-by-step guide: Building a macOS voice input app with Trellis

# open-typeless

A step-by-step tutorial showing how to use Trellis to build a macOS voice input app from scratch.

<Info>
  **Source Code**:
  [github.com/mindfold-ai/open-typeless](https://github.com/mindfold-ai/open-typeless)
</Info>

## Project Initialization

### Create Electron Project

```bash theme={null}
npx create-electron-app@latest open-typeless --template=vite-typescript

cd open-typeless

# Remove npm generated files
rm -rf node_modules package-lock.json

# Create .npmrc (required for pnpm + Electron)
cat > .npmrc << 'EOF'
node-linker=hoisted
shamefully-hoist=true
EOF

# Reinstall with pnpm
pnpm install
```

### Initialize Trellis

```bash theme={null}
trellis init
```

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/init.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=b406085b4c7cf020e0dbc3348af91db8" alt="trellis init" width="1762" height="1350" data-path="images/use-cases/open-typeless/init.png" />

### Copy Specs from Existing Project

If you have specs from a similar project, copy them over:

```bash theme={null}
cp -r /path/to/old-project/.trellis/spec ./
```

### Ask AI to Fill in Specs

**Prompt:**

> Help me select useful specs from electron-doc/ and organize them into this project's .trellis/spec/

AI will analyze and organize specs:

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step1.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=418a56632c9535716a8c986034a91daa" alt="spec selection" width="758" height="1590" data-path="images/use-cases/open-typeless/step1.png" />

## Task Planning

### Ask AI to Plan Tasks

**Prompt:**

> I want to use Volcengine ASR BigModel API to build this. Help me plan how to break down the tasks.

AI creates a batch-based task plan:

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step2-1.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=fda5287e4c3a89784f263f7c8a581410" alt="task planning" width="1088" height="5446" data-path="images/use-cases/open-typeless/step2-1.png" />

### Create Tasks

AI creates tasks organized into batches:

| Batch   | Tasks                                                                | Purpose                          |
| ------- | -------------------------------------------------------------------- | -------------------------------- |
| Batch 1 | `asr-infrastructure`                                                 | Foundation (must complete first) |
| Batch 2 | `asr-audio-recorder`, `asr-volcengine-client`, `asr-floating-window` | Can run in parallel              |
| Batch 3 | `asr-integration`                                                    | Integration (depends on Batch 2) |

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step2-2.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=1547cb4c296ec5e6d34558884fc543a5" alt="tasks created" width="1116" height="1502" data-path="images/use-cases/open-typeless/step2-2.png" />

### Complete Batch 1

After Batch 1 completes, verify and update downstream task contexts:

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step2-3.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=2d521d772d9d98b6f8f3a34a8bc08062" alt="batch 1 complete" width="1912" height="918" data-path="images/use-cases/open-typeless/step2-3.png" />

## Parallel Development

### Start Parallel Sessions

For current Trellis, create one Git worktree and one AI session for each Batch 2 task, then start the matching Trellis task inside that session.

```bash theme={null}
git worktree add ../asr-audio-recorder -b feature/asr-audio-recorder
git worktree add ../asr-volcengine-client -b feature/asr-volcengine-client
git worktree add ../asr-floating-window -b feature/asr-floating-window
```

Each session has its own active-task pointer, so starting a task in one session does not affect the others.

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step3-1.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=fc3f94fe5539f3c7697a8aea8574d80c" alt="parallel agents" width="2298" height="1646" data-path="images/use-cases/open-typeless/step3-1.png" />

## Monitor Progress

### Check Agent Status

AI monitors agent status and task progress:

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step4-1.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=0f4d4fa69013cde64466a3f29233b010" alt="agent status" width="2024" height="746" data-path="images/use-cases/open-typeless/step4-1.png" />

### Record Session

After parallel sessions complete, review and merge each branch through your normal Git process:

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step3-4.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=8f7d8dfd27f78d7a4ba5a178023cd17d" alt="parallel PRs" width="2862" height="1068" data-path="images/use-cases/open-typeless/step3-4.png" />

After merging and completing a batch, record the session:

**Prompt:** `/trellis:finish-work`

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step2-4.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=7e5274b1c3f6a2ddcbeb89d677b94526" alt="record session" width="2032" height="1556" data-path="images/use-cases/open-typeless/step2-4.png" />

## Continue Development

### Check Remaining Tasks

AI shows remaining tasks in the current project:

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step5-1.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=fe30af85a495d6aaf4eb781eaba68951" alt="task list" width="1602" height="1240" data-path="images/use-cases/open-typeless/step5-1.png" />

### Implement Next Feature

Select the next task, AI uses trellis-implement sub-agent then trellis-check sub-agent:

<img src="https://mintcdn.com/mindfold/VDegZ_ZX0LoWsgf2/images/use-cases/open-typeless/step5-2.png?fit=max&auto=format&n=VDegZ_ZX0LoWsgf2&q=85&s=b19086c3cf1eb277d2283065cc1a9871" alt="implement and check" width="1498" height="1472" data-path="images/use-cases/open-typeless/step5-2.png" />

### Configure and Test

AI helps with remaining setup (environment config, permissions):

<img src="https://mintcdn.com/mindfold/1SU2hvaJjYMKIvrH/images/use-cases/open-typeless/step5-3.png?fit=max&auto=format&n=1SU2hvaJjYMKIvrH&q=85&s=f8669d9d1a98c58ab9775bb58be34da5" alt="final setup" width="2320" height="1694" data-path="images/use-cases/open-typeless/step5-3.png" />

## Summary

Using Trellis to build open-typeless:

| Step | What                 | Trellis Feature                                     |
| ---- | -------------------- | --------------------------------------------------- |
| 1    | Initialize project   | `trellis init`, spec organization                   |
| 2    | Plan tasks           | AI task breakdown, batch planning                   |
| 3    | Parallel development | Native Git worktrees + session-scoped Trellis tasks |
| 4    | Monitor & record     | `/trellis:finish-work`                              |
| 5    | Continue iterating   | Task hooks, implement/trellis-check sub-agents      |

**Result:** Complete Electron app in 1 day, with structured specs and documented progress.
