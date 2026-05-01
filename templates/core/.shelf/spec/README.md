# Specs

Store durable product and technical specs here. Agents should use these files as reusable context instead of relying on repeated chat explanations.

The default structure is intentionally generic:

- `backend/`: server-side architecture, persistence, error handling, logging, and quality rules.
- `frontend/`: client-side structure, type safety, components, hooks, state, and quality rules.
- `guides/`: cross-layer thinking guides that apply to any package.

For monorepos, keep shared guidance here and add package-specific guidance under
`.shelf/spec/packages/<package-id>/`. Run `agentos-cli agent spec scaffold`
after init to generate package spec folders from detected workspaces, or declare
known packages in `.shelf/config.yaml` so agents and runtime scripts can
discover the right spec layer.

Fill these files with this project's real conventions. Prefer examples from the codebase over aspirational rules.
