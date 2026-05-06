#!/usr/bin/env python3
"""Claude Code SessionStart hook for AgentOS Shelf projects."""

from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys
from io import StringIO
from pathlib import Path


FIRST_REPLY_NOTICE = """<first-reply-notice>
On the first visible assistant reply in this session, begin with exactly one short Chinese sentence:
Shelf SessionStart 已注入：workflow、当前任务状态、开发者身份、git 状态、active tasks、spec 索引已加载。
Then continue directly with the user's request. This notice is one-shot: do not repeat it after the first assistant reply in the same session.
</first-reply-notice>"""


def read_file(path: Path, fallback: str = "") -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (FileNotFoundError, PermissionError, OSError):
        return fallback


def _detect_platform(hook_input: dict) -> str:
    if isinstance(hook_input.get("platform"), str):
        return str(hook_input["platform"])
    return "claude"


def _resolve_context_key(project_dir: Path, hook_input: dict) -> str | None:
    scripts_dir = project_dir / ".shelf" / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    try:
        from common.active_task import resolve_context_key  # type: ignore[import-not-found]
    except Exception:
        return None
    return resolve_context_key(hook_input, platform=_detect_platform(hook_input))


def _persist_context_key_for_bash(context_key: str | None) -> None:
    if not context_key:
        return
    env_file = os.environ.get("CLAUDE_ENV_FILE")
    if not env_file:
        return
    try:
        with open(env_file, "a", encoding="utf-8") as handle:
            handle.write(f"export SHELF_CONTEXT_ID={shlex.quote(context_key)}\n")
    except OSError:
        pass


def _resolve_active_task(shelf_dir: Path, hook_input: dict):
    scripts_dir = shelf_dir / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    from common.active_task import resolve_active_task  # type: ignore[import-not-found]

    return resolve_active_task(
        shelf_dir.parent,
        hook_input,
        platform=_detect_platform(hook_input),
    )


def _run_context_script(shelf_dir: Path, context_key: str | None = None) -> str:
    script_path = shelf_dir / "scripts" / "get_context.py"
    if not script_path.is_file():
        return "No Shelf context script found."

    try:
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        if context_key:
            env["SHELF_CONTEXT_ID"] = context_key
        result = subprocess.run(
            [sys.executable, "-W", "ignore", str(script_path)],
            capture_output=True,
            cwd=str(shelf_dir.parent),
            encoding="utf-8",
            env=env,
            errors="replace",
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "No Shelf context available."

    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip()
    return "No Shelf context available."


def _normalize_task_ref(task_ref: str) -> str:
    normalized = task_ref.strip()
    if not normalized:
        return ""
    path_obj = Path(normalized)
    if path_obj.is_absolute():
        return str(path_obj)
    normalized = normalized.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    if normalized.startswith("tasks/"):
        return f".shelf/{normalized}"
    return normalized


def _resolve_task_dir(shelf_dir: Path, task_ref: str) -> Path:
    normalized = _normalize_task_ref(task_ref)
    path_obj = Path(normalized)
    if path_obj.is_absolute():
        return path_obj
    if normalized.startswith(".shelf/"):
        return shelf_dir.parent / path_obj
    return shelf_dir / "tasks" / path_obj


def _has_curated_jsonl_entry(jsonl_path: Path) -> bool:
    try:
        lines = jsonl_path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return False
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict) and row.get("file"):
            return True
    return False


def _get_task_status(shelf_dir: Path, hook_input: dict) -> str:
    try:
        active = _resolve_active_task(shelf_dir, hook_input)
    except Exception:
        return "Status: UNKNOWN\nNext: Run `python ./.shelf/scripts/task.py current --source`."

    if not active.task_path:
        return (
            "Status: NO ACTIVE TASK\n"
            f"Source: {active.source}\n"
            "Next-Action: If `task.py list` shows `00-bootstrap-guidelines/ (in_progress)`, "
            "treat it as the default first-run flow. On the user's first substantive message, "
            "briefly explain that Shelf will first capture this project's real conventions into "
            "`.shelf/spec/`, then begin the bootstrap by reading "
            "`.shelf/tasks/00-bootstrap-guidelines/prd.md` and scanning existing convention docs "
            "plus real code. Do NOT ask the user to invoke `shelf-continue`.\n"
            "Otherwise, after the user describes their intent, route automatically: answer directly "
            "for pure Q&A, or create a task for implementation / refactor / build work."
        )

    task_ref = active.task_path
    task_dir = _resolve_task_dir(shelf_dir, task_ref)
    if active.stale or not task_dir.is_dir():
        return (
            f"Status: STALE POINTER\nTask: {task_ref}\nSource: {active.source}\n"
            "Next: Run `python ./.shelf/scripts/task.py finish`, then choose the next task."
        )

    task_data: dict = {}
    task_json_path = task_dir / "task.json"
    if task_json_path.is_file():
        try:
            task_data = json.loads(task_json_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass

    title = task_data.get("title", task_ref)
    status = task_data.get("status", "unknown")
    if task_dir.name == "00-bootstrap-guidelines":
        return (
            f"Status: BOOTSTRAP\nTask: {title}\nSource: {active.source}\n"
            "Next-Action: Treat bootstrap as the current onboarding flow. Open with a short explanation "
            "that Shelf is doing a one-time project-convention bootstrap, then read "
            "`.shelf/tasks/00-bootstrap-guidelines/prd.md`, scan existing convention docs and real code, "
            "and fill the relevant `.shelf/spec/` files. Do NOT ask the user to invoke a Shelf skill or command."
        )

    if status == "completed":
        return (
            f"Status: COMPLETED\nTask: {title}\nSource: {active.source}\n"
            f"Next-Action: Run `shelf-update-spec` if needed, then archive `{task_dir.name}`."
        )

    has_prd = (task_dir / "prd.md").is_file()
    has_context = any(
        _has_curated_jsonl_entry(task_dir / name)
        for name in ("implement.jsonl", "check.jsonl", "spec.jsonl")
    )

    if not has_prd:
        return (
            f"Status: PLANNING\nTask: {title}\nSource: {active.source}\n"
            "Next-Action: After the user describes the task, load `shelf-brainstorm`, clarify requirements, and write `prd.md`."
        )
    if not has_context:
        return (
            f"Status: PLANNING (context not curated)\nTask: {title}\nSource: {active.source}\n"
            "Next-Action: Curate `implement.jsonl` and `check.jsonl` with `.shelf/spec/` and research files."
        )
    return (
        f"Status: READY\nTask: {title}\nSource: {active.source}\n"
        "Next-Action: Dispatch `shelf-implement` per Phase 2.1, then `shelf-check` per Phase 2.2. Do not ask the user to invoke `shelf-continue` first."
    )


def _extract_range(content: str, start_header: str, end_header: str) -> str:
    lines = content.splitlines()
    start: int | None = None
    end = len(lines)
    start_match = f"## {start_header}"
    end_match = f"## {end_header}"
    for index, line in enumerate(lines):
        stripped = line.strip()
        if start is None and stripped == start_match:
            start = index
            continue
        if start is not None and stripped == end_match:
            end = index
            break
    if start is None:
        return ""
    return "\n".join(lines[start:end]).rstrip()


_BREADCRUMB_TAG_RE = re.compile(
    r"\[workflow-state:([A-Za-z0-9_-]+)\]\s*\n.*?\n\s*\[/workflow-state:\1\]",
    re.DOTALL,
)


def _build_workflow_overview(workflow_path: Path) -> str:
    content = read_file(workflow_path)
    if not content:
        return "No workflow.md found."

    out_lines = [
        "# Development Workflow - Section Index",
        "Full guide: .shelf/workflow.md (read on demand)",
        "",
        "## Table of Contents",
    ]
    for line in content.splitlines():
        if line.startswith("## "):
            out_lines.append(line)
    out_lines += ["", "---", ""]

    phases = _extract_range(content, "Phase Index", "Customizing AgentOS Shelf (for forks)")
    if phases:
        out_lines.append(_BREADCRUMB_TAG_RE.sub("", phases).rstrip())

    return "\n".join(out_lines).rstrip()


def _build_guidelines_index(shelf_dir: Path) -> str:
    output = StringIO()
    output.write(
        "Project spec indexes are listed by path below. Read the relevant index before coding.\n\n"
    )

    guides_index = shelf_dir / "spec" / "guides" / "index.md"
    if guides_index.is_file():
        output.write("## guides (inlined cross-package thinking guides)\n")
        output.write(read_file(guides_index))
        output.write("\n\n")

    paths: list[str] = []
    spec_dir = shelf_dir / "spec"
    if spec_dir.is_dir():
        for sub in sorted(spec_dir.iterdir()):
            if not sub.is_dir() or sub.name.startswith(".") or sub.name == "guides":
                continue
            index_file = sub / "index.md"
            if index_file.is_file():
                paths.append(f".shelf/spec/{sub.name}/index.md")
            else:
                for nested in sorted(sub.iterdir()):
                    nested_index = nested / "index.md"
                    if nested.is_dir() and nested_index.is_file():
                        paths.append(f".shelf/spec/{sub.name}/{nested.name}/index.md")

    if paths:
        output.write("## Available spec indexes (read on demand)\n")
        for item in paths:
            output.write(f"- {item}\n")
        output.write("\n")

    output.write("Discover more via: `python ./.shelf/scripts/get_context.py --mode packages`\n")
    return output.getvalue().rstrip()


def main() -> int:
    try:
        hook_input = json.loads(sys.stdin.read() or "{}")
        if not isinstance(hook_input, dict):
            hook_input = {}
    except json.JSONDecodeError:
        hook_input = {}

    project_dir = Path(
        os.environ.get("CLAUDE_PROJECT_DIR") or hook_input.get("cwd") or "."
    ).resolve()
    shelf_dir = project_dir / ".shelf"
    if not shelf_dir.is_dir():
        return 0

    context_key = _resolve_context_key(project_dir, hook_input)
    _persist_context_key_for_bash(context_key)

    output = StringIO()
    output.write(
        "<session-context>\n"
        "You are starting a new session in an AgentOS Shelf-managed project.\n"
        "Read and follow the injected workflow, task status, and spec index below.\n"
        "</session-context>\n\n"
    )
    output.write(FIRST_REPLY_NOTICE)
    output.write("\n\n<current-state>\n")
    output.write(_run_context_script(shelf_dir, context_key))
    output.write("\n</current-state>\n\n<workflow>\n")
    output.write(_build_workflow_overview(shelf_dir / "workflow.md"))
    output.write("\n</workflow>\n\n<guidelines>\n")
    output.write(_build_guidelines_index(shelf_dir))
    output.write("\n</guidelines>\n\n<task-status>\n")
    output.write(_get_task_status(shelf_dir, hook_input))
    output.write(
        "\n</task-status>\n\n<ready>\n"
        "Context loaded. Do not ask the user to invoke `shelf-start`, `shelf-continue`, or `shelf-brainstorm` before you act.\n"
        "If bootstrap is present, treat it as the default first-run flow and begin it naturally.\n"
        "Otherwise, when the user describes work, route automatically using <task-status> and the workflow guide.\n"
        "</ready>"
    )

    result = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": output.getvalue(),
        }
    }
    print(json.dumps(result, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
