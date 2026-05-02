# Workspace Memory

Store lightweight project memory here, such as journal notes and reusable context from previous work.

Use `agentos-cli shelf developer init <name>` once per developer to create local
workspace memory files.

Useful commands:

- `agentos-cli shelf workspace context`: print current git and Shelf context.
- `agentos-cli shelf workspace context --json`: print machine-readable context.
- `agentos-cli shelf workspace add-session --title "<title>" --summary "<summary>"`: append a completed session to the current developer journal.

Journal files are intentionally local working memory. Keep durable product or technical rules in `.shelf/spec/`, and keep task-specific context in `.shelf/tasks/`.
