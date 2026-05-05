> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Contribute to Docs

> How to contribute to Trellis documentation (mindfold-ai/docs)

## Contribute with AI assistance

The easiest way to contribute is with Claude Code. We have a built-in skill that guides you through the process.

### Fork and clone

```bash theme={null}
# Fork on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/docs.git
cd docs
pnpm install
```

### Tell Claude what you want to contribute

Open Claude Code in the project and describe what you want to add:

* "I want to add a new spec template for Next.js projects"
* "I want to improve the multi-agent documentation"

### Claude uses the contribute skill automatically

Claude will read the `contribute` skill and guide you through:

* Where to put your files
* What related files need updating (docs.json, index pages)
* Bilingual requirements (EN + ZH)
* How to test locally

### Review and submit PR

Review the changes, test with `pnpm dev`, push to your fork, then open a PR to the original repo.

<Tip>
  The contribute skill knows the project structure and conventions. It handles the details so you
  can focus on content.
</Tip>

***

## Ways to contribute

### Report issues

Found a problem with the docs? Open an issue:

[https://github.com/mindfold-ai/docs/issues](https://github.com/mindfold-ai/docs/issues)

Include:

* Which page has the issue
* What's wrong or confusing
* Suggested fix (if you have one)

### Suggest improvements

Have an idea for better docs? Open a discussion:

[https://github.com/mindfold-ai/docs/discussions](https://github.com/mindfold-ai/docs/discussions)

### Contribute a Skill

Skills extend AI capabilities. To add a new skill:

1. Fork the [Trellis repo](https://github.com/mindfold-ai/Trellis)
2. Create skill directory:
   ```
   marketplace/skills/your-skill/
   └── SKILL.md
   ```
3. Open a PR to the Trellis repo
4. (Optional) Create documentation pages in docs repo (`skills-market/your-skill.mdx` + Chinese version)

See [Claude Code Skills documentation](https://code.claude.com/docs/en/skills) for SKILL.md format.

<Note>Skills are hosted in the [Trellis main repo](https://github.com/mindfold-ai/Trellis), not in docs.</Note>

### Contribute a Spec Template

Spec templates are Trellis project guidelines (not Claude features). To add one:

1. Fork the repo
2. Create `marketplace/specs/your-template/` with guideline files
3. Create documentation pages (`templates/specs-your-template.mdx` + Chinese version)
4. Update `docs.json` navigation
5. Open a PR

Good contributions are:

* Specific and actionable
* Well-documented
* Tested on real projects

### Fix typos and improve clarity

Small fixes: edit directly on GitHub and submit a PR.

Larger changes: clone locally, make changes, test with `pnpm dev`.

***

## Development setup

```bash theme={null}
# Install dependencies
pnpm install

# Start local dev server
pnpm dev

# Check markdown lint
pnpm lint:md

# Verify docs structure
pnpm verify

# Format files
pnpm format
```

***

## Bilingual requirement

All user-facing content must have both English and Chinese versions:

| English                 | Chinese                    |
| ----------------------- | -------------------------- |
| `guides/example.mdx`    | `zh/guides/example.mdx`    |
| `templates/example.mdx` | `zh/templates/example.mdx` |

Update `docs.json` navigation for both languages.

***

## Commit messages

Use conventional commits:

```
docs: add Next.js spec template
fix: correct broken link in quickstart
feat: add new skill to marketplace
```

***

## PR process

1. Create a PR with a clear description
2. Ensure CI checks pass (lint, verify)
3. Wait for review
4. Address feedback
5. Merge after approval

***

## License

Contributions are licensed under MIT. By contributing, you agree to this.

## Questions?

Open a discussion or email [taosu@mindfold.ai](mailto:taosu@mindfold.ai).
