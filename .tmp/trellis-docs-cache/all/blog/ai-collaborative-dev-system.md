> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Building an AI Collaborative Development System in Real Projects

A few days ago, Anthropic published an article about their internal AI-assisted development approach—giving AI "long-term memory" so it can remember project specifications, past decisions, and coding style. The concept is inspiring, but their explanation was fairly theoretical without much practical implementation detail.

Our team recently tried implementing this approach in the Mosi project, extending it significantly to handle real multi-person collaboration scenarios. This article covers how we did it, what pitfalls we encountered, and what the final system feels like in practice.

## 1. Starting Point: The Gap Between Anthropic's Vision and Reality

Anthropic's core idea is: **don't start every AI conversation from scratch—let the AI see the project's "memory" from the beginning**.

This "memory" includes:

* Project tech stack and architecture specifications

* Code style conventions

* Previously discussed design decisions

* Solutions to common problems

Their approach is to organize this content into documentation within the project, then feed relevant documents to the AI during conversations. This way, the AI can work like "an experienced employee who knows the project background" rather than needing everything explained from scratch each time.

Sounds simple, but implementing this in a real multi-person collaborative project raises many practical issues:

* **What about multiple developers working simultaneously?** If everyone's progress is recorded in a single file, conflicts are inevitable.

* **What if specification documents are too long?** Our frontend spec has over 1600 lines, backend specs have hundreds more. Feeding everything to AI would blow the token limit, and most content isn't relevant to the current task anyway.

* **How do we ensure code quality?** AI-written code can't go directly to the main branch—someone needs to review and test it.

* **How do we track AI's work?** If something goes wrong, how do we trace what the AI actually did?

We designed solutions for these problems in the Mosi project.

## 2. Implementation: Four Core Design Decisions

### 1. Multi-Person Collaboration: Each Developer Gets an Independent Progress Folder

Anthropic's article barely mentions multi-person collaboration, but this is unavoidable in real projects.

Our approach: **create an independent folder for each developer (including AI) under `workflow/agent-progress/`**.

For example:

```plaintext theme={null}
workflow/
├── agent-progress/
│   ├── taosu/          # Developer taosu's progress
│   │   ├── index.md
│   │   └── progress-1.md
│   ├── developer2/     # Developer developer2's progress
│   │   ├── index.md
│   │   └── progress-1.md
```

Each folder has an `index.md` that records what this developer is currently working on, how far they've progressed, and what problems they've encountered. AI reads this file before starting work to understand context; after work, it updates this file to record new progress.

This way multiple developers can work simultaneously without interfering with each other.

### 2. Solving Information Overload: Two-Layer Index System

As mentioned, our spec documents are long (frontend 1600+ lines, backend hundreds of lines). In practice, we found that feeding complete documents to AI causes several problems:

**Why do we need a structured system?**

1. **Information overload**: When AI needs to implement a "keyboard shortcut feature," if it reads all 1600 lines of frontend specs, it gets distracted by irrelevant content—like "API calling conventions," "state management specs," etc. These are important but unhelpful for the current task, reducing AI's focus.

2. **Token economics**: In long conversations, if we read complete documents every time, token consumption accumulates rapidly. With 20 rounds of interaction, repeatedly reading documents wastes significant cost.

3. **Knowledge navigation**: Developers (and AI) need to quickly answer "I'm implementing feature X—which part of the spec should I read?" Without a clear navigation system, they can only rely on full-text search or reading chapter by chapter, which is very inefficient.

### Our Solution: Two-Layer Structure

We designed an `index.md + doc.md` two-layer knowledge system:

```plaintext theme={null}
workflow/
├── frontend-structure/
│   ├── index.md       # Index layer: quick navigation (~100 lines)
│   └── doc.md         # Detail layer: complete spec (1600+ lines)
```

**What is index.md?**

`index.md` is a **lightweight navigation table** that lists all spec chapters with explicit line number ranges. More importantly, it's organized by **development task type**, not document structure.

For example:

```markdown theme={null}
# Frontend Development Spec Index

> **Complete doc**: See `./doc.md` for detailed specifications

This index helps you quickly locate the spec chapters you need. Find the corresponding chapters and line numbers based on the type of feature you're developing.

## Related Workflow Documents

| Document                            | Use Case                      |
| ----------------------------------- | ----------------------------- |
| `../frontend-figma-workflow/doc.md` | Developing from Figma designs |

## Quick Navigation

| Development Task                         | Chapters to Read                           | Line Range |
| ---------------------------------------- | ------------------------------------------ | ---------- |
| **New feature module**                   | Directory structure spec                   | L5-36      |
| **Writing Command Palette**              | Component dev spec > Command Palette       | L876-1425  |
| **Writing Query Hook**                   | Hook dev spec > Query Hook                 | L179-265   |
| **Writing Mutation Hook**                | Hook dev spec > Mutation Hook              | L266-351   |
| **Calling backend API**                  | API calling spec                           | L382-735   |
| **Real-time communication (WebSocket)**  | API calling spec > Real-time               | L419-465   |
| **AI streaming response (SSE)**          | API calling spec > SSE                     | L466-497   |
| **AI Tool Calls handling**               | API calling spec > Tool Calls              | L498-735   |
| **State management**                     | State management spec                      | L736-873   |
| **URL state sync**                       | State management spec > URL/Context        | L738-873   |
| **Writing components**                   | Component dev spec                         | L874-1645  |
| **Accessibility and image optimization** | Component dev spec > Semantic HTML & Image | L1426-1544 |
| **Performance optimization**             | Performance optimization spec              | L1676-1762 |
| **Code quality check**                   | Code quality and formatting spec           | L2140-2317 |
| **Code review**                          | General rules + Checklist                  | L1763-2344 |

......
```

**Core advantages:**

1. **Instant Knowledge Access**: AI only needs to read \~100 lines of index.md to locate "implementing keyboard shortcuts requires reading lines 876-1425" within seconds. This is much faster than full-text search or browsing chapter by chapter.

2. **On-Demand Loading**: AI reads only relevant sections of `doc.md` based on the current task (e.g., 500 lines instead of 1600). This saves tokens while avoiding information overload.

3. **Standardized Workflow**: This two-layer structure becomes a team standard—everyone (including AI and newly joined human developers) knows "read index first, then doc." This reduces cognitive load and improves collaboration efficiency.

**Workflow:**

1. AI reads `index.md` to understand the overall spec structure

2. Based on the current task (e.g., "implement keyboard shortcut"), AI finds "Writing Command Palette → L876-1425" in the navigation table

3. AI precisely reads lines 876-1425 of `doc.md` for detailed implementation guidance

4. AI writes code following the spec, avoiding "not knowing where to start" or "missing key details"

### Fundamental Difference from Claude Skills

You might ask: Didn't Anthropic release Claude Skills? Why not just use Skills instead of building this structure ourselves?

This is because they solve different problems:

* **Claude Skills** are **ecosystem-driven general capability packages**, designed for cross-project reuse. Things like "git operations," "Python testing," "filesystem operations"—these capabilities apply to any project. Skills pursue **breadth and reusability**.

* **Our structure** is a **project-specific deep customization system** that indexes and stores Mosi project's specific architecture, tech stack, state management patterns, API calling conventions, etc. This knowledge is unique to the project and cannot be reused across projects. Our system pursues **depth and precision**.

A concrete example:

* **Skills can teach AI**: "How to write a React component" (general knowledge)

* **Our doc.md teaches AI**: "In the Mosi project, how to write components following our specific architecture (Monorepo + Turborepo), state management patterns (Zustand + URL state sync), API calling conventions (tRPC + SSE + Tool Calls)" (project-specific knowledge)

Skills are like a "general toolbox"; our structure is like "project blueprints." They're not replacements but complements—Skills provide foundational capabilities, structure provides project-specific implementation details.

We use the same organizational approach for backend specs.

### 3. Encapsulating Best Practices: Short Command System

To standardize the development process, we defined a series of "short commands," each corresponding to a specific operation.

Short commands are stored in the `.cursor/commands/` directory, each command as a `.md` file.

Currently common short commands include:

* `/init-agent`: Initialize AI session, having AI read the current developer's progress and relevant specs

* `/check-frontend`: Have AI check if frontend code follows specifications

* `/check-backend`: Have AI check if backend code follows specifications

* `/record-agent-flow`: Record this AI session's work content to the progress file

**What are short commands?**

Short commands are essentially **predefined prompt templates**. Each `.md` file contains a complete AI instruction.

For example, `check-frontend.md` might contain:

```markdown theme={null}
Check your own work—does the code you just wrote follow frontend development specs? First use git status to see which files were modified, then go to `.cursor/rules/frontend-structure/index.md` to find the corresponding doc details and check against `.cursor/rules/frontend-structure/doc.md`
...
```

**How it works:**

When a developer types `/check-frontend` and hits enter:

1. Cursor automatically reads the content of `.cursor/commands/check-frontend.md`

2. Injects this content as a prompt into the current conversation

3. AI performs the corresponding check operations based on this prompt

**Why use short commands?**

Because every time you ask AI to do code checking or progress recording, you need to input a detailed checklist or operational steps. If these instructions aren't detailed enough, AI output quality becomes inconsistent.

Short commands encapsulate these **best practice prompts**—developers just type `/check-frontend`, which is equivalent to sending a carefully designed complete prompt, ensuring instruction consistency and completeness.

Plus, short commands can be shared across the team, so new members can immediately benefit from accumulated team experience.

> Think of short commands as a kind of prompt SDK—using a short command is like calling a specialized SDK our team built for a specific scenario

### 4. Quality Gate: Human Developer Review Mechanism

Although AI can write code, we don't let AI commit directly. **All code requires human developer review and testing before it can be committed**.

The typical flow is:

1. AI writes code

2. Developer runs locally to check if functionality works

3. Developer reviews code for obvious issues

4. If there are problems, have AI fix them; if not, developer commits manually

This way we get AI's efficiency while ensuring code quality.

## 3. Practice: A Complete Development Flow

The design concepts above might still be abstract. Below is a real example showing the complete development flow.

**Background:**

I need to implement a keyboard shortcut feature on the frontend—pressing `Cmd+K` to open the search box. I've already created a Git branch `feat/keyboard-navigation` locally.

### Initialize AI Session

```plaintext theme={null}
Me: /init-agent
```

When I input this short command, Cursor injects the content of `init-agent.md` into the conversation. This template defines the initialization steps AI needs to perform:

**AI executes according to short command guidance:**

1. Read `workflow/agent-progress/taosu/index.md` to understand my current progress and context

2. Read `workflow/frontend-structure/index.md` to understand the overall frontend spec structure

3. If needed, read further into relevant chapters of `doc.md`

**AI's response:**

```plaintext theme={null}
Okay, I've read your progress record and frontend specs.
Current branch: feat/keyboard-navigation
Task: Implement keyboard shortcut feature (Cmd+K opens search)

I noticed the frontend spec has a "Keyboard System" chapter—I'll implement according to those specifications.

Ready. Tell me what specifically needs to be done.
```

### Describe Requirements

```plaintext theme={null}
Me: Help me implement a global keyboard shortcut—when pressing Cmd+K (Mac) or Ctrl+K (Windows),
   open the search box. The search box component already exists at components/SearchModal.tsx.
```

**What AI does:**

1. Based on the "keyboard shortcut" keyword, read the "Keyboard System" chapter in `workflow/frontend-structure/doc.md`

2. Learn that the project already has a `useKeyboardShortcut` hook ready to use

3. Write code: call this hook in the appropriate place to bind Cmd+K shortcut

**AI's response:**

```plaintext theme={null}
Okay, here's my implementation:

1. Use useKeyboardShortcut hook in the SearchModal component
2. Listen for Cmd+K / Ctrl+K, trigger search box open
3. Close search box on ESC

Code is written, file path:
- components/SearchModal.tsx (modified)

You can run locally to see the effect.
```

### Local Testing

I run the project locally, press `Cmd+K`, search box opens successfully. Feature works.

### Code Self-Check

```plaintext theme={null}
Me: /check-frontend
```

When I input this short command, Cursor automatically injects the content of `check-frontend.md` (a detailed code check list) into the conversation.

**AI executes check according to short command template:**

Following check items defined in the template, reviews the code just written:

* Check if component naming follows conventions

* Check if React hooks dependency arrays are complete

* Check if type definitions are strict

* Check for potential performance issues\
  ...

**AI's response:**

```plaintext theme={null}
Checked and found two minor issues:

1. useKeyboardShortcut dependency array was missing a state
2. Type definitions could be stricter

Already fixed for you—should be fine after running again.
```

I retest and confirm no issues.

### Commit Code

```bash theme={null}
git add .
git commit -m "feat: add Cmd+K keyboard shortcut for search"
git push origin feat/keyboard-navigation
```

### Record Flow

```plaintext theme={null}
Me: /record-agent-flow
```

Cursor injects the content of `record-agent-flow.md` into the conversation—this template guides AI on how to record the workflow.

**AI executes according to template guidance:**

1. Summarize this session's work content (requirements, implementation approach, problems encountered, solutions, etc.)

2. Format and append this information to `workflow/agent-progress/taosu/index.md`

**AI's response:**

```plaintext theme={null}
Recorded this session's workflow to your progress file.

Main content:
- Implemented global keyboard shortcut Cmd+K for search
- Used useKeyboardShortcut hook
- Fixed dependency array and type definition issues
- Committed to branch feat/keyboard-navigation
```

This way, next time I continue working with AI, it can quickly understand what I've been doing recently by reading this progress file.

## 4. Pitfalls and Solutions

### Problem 1: Learning Curve for Short Commands

New team members need to learn which short commands exist and what each does.

We provide an `/onboard-developer` short command to guide newcomers. New members just run this command, and AI follows the preset guidance flow to introduce the entire workflow system, common short commands, and how to start the first task.

### Problem 2: AI "Forgets" Specs in Long Conversations

Even if AI reads all specs via `/init-agent` at session start, as conversation turns increase and context lengthens, AI may gradually "forget" the initially read development spec details. This causes AI to drift from spec requirements when writing code.

Our solution: **use short commands at key points to force AI to re-consult specs**.

For example, the `/check-frontend` short command template explicitly requires AI to:

1. First use `git status` to see which code was just modified

2. Based on the change type (e.g., "added a new Hook"), find the corresponding chapter in `index.md`

3. Re-read the relevant part of `doc.md` (e.g., "Hook dev spec L179-265")

4. Check code against specs item by item

This way, even if context is already very long, AI will **mandatorily** re-learn the specs when checking code, ensuring code quality doesn't decline due to "forgetting."

This is also why we encapsulate these operations as short commands—not just for convenience, but to **enforce quality assurance processes at key workflow points**.

## 5. Summary and Future Plans

Anthropic's "AI long-term memory" concept is valuable, but truly implementing it in real multi-person collaborative projects requires solving many engineering problems.

Our practice in the Mosi project did these core things:

* **Multi-person collaboration support**: Each developer has an independent progress folder

* **Spec index system**: index.md + doc.md structure lets AI efficiently find specs

* **Short command system**: Encapsulates common operations, improves development efficiency

* **Human in the loop**: AI writes code, humans review and commit, ensuring quality

This system is still being continuously improved, but we can already feel noticeable improvements in development efficiency.

Improvements we might make next:

* **Automate more processes**: e.g., let AI automatically create branches, automatically write commit messages

* **Smarter spec indexing**: Currently AI manually judges which chapters to read; in the future, AI could automatically match relevant chapters based on task descriptions

* **Team knowledge base**: Organize design decisions discussed by the team and pitfalls encountered into documentation, so AI can learn from this experience

If you're also trying AI-assisted development, I hope this article gives you some inspiration. Welcome to discuss.

***

## Resources

* Anthropic's original article: [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
