#!/usr/bin/env python3
"""Codex UserPromptSubmit hook for AgentOS Shelf workflow breadcrumbs."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path


TAG_RE = re.compile(
    r"\[workflow-state:([A-Za-z0-9_-]+)\]\s*\n(.*?)\n\s*\[/workflow-state:\1\]",
    re.DOTALL,
)


def find_project_root(start: Path) -> Path | None:
    current = start.resolve()
    while current != current.parent:
        if (current / ".shelf").is_dir():
            return current
        current = current.parent
    return None


def load_workflow_states(root: Path) -> dict[str, str]:
    workflow = root / ".shelf" / "workflow.md"
    if not workflow.is_file():
        return {}

    try:
        content = workflow.read_text(encoding="utf-8")
    except OSError:
        return {}

    return {match.group(1): match.group(2).strip() for match in TAG_RE.finditer(content)}


def read_active_task(root: Path) -> tuple[str | None, str, str | None]:
    script = root / ".shelf" / "scripts" / "task.py"
    if not script.is_file():
        return None, "no_task", None

    try:
        result = subprocess.run(
            [sys.executable, str(script), "current", "--source"],
            capture_output=True,
            cwd=str(root),
            encoding="utf-8",
            errors="replace",
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None, "no_task", None

    if result.returncode != 0 or not result.stdout.strip():
        return None, "no_task", None

    task_path = None
    source = None
    for line in result.stdout.splitlines():
        if line.startswith("Current task:"):
            value = line.split(":", 1)[1].strip()
            task_path = None if value == "(none)" else value
        elif line.startswith("Source:"):
            source = line.split(":", 1)[1].strip()

    if not task_path:
        return None, "no_task", source

    task_dir = Path(task_path)
    if not task_dir.is_absolute():
        task_dir = root / task_dir

    task_json = task_dir / "task.json"
    status = "unknown"
    task_id = task_dir.name
    if task_json.is_file():
        try:
            task_data = json.loads(task_json.read_text(encoding="utf-8"))
            status = str(task_data.get("status") or status)
            task_id = str(task_data.get("id") or task_id)
        except (OSError, json.JSONDecodeError):
            pass

    return task_id, status, source


def build_breadcrumb(task_id: str | None, status: str, source: str | None, states: dict[str, str]) -> str:
    body = states.get(status) or "Refer to .shelf/workflow.md for the current step."
    header = f"Status: {status}" if task_id is None else f"Task: {task_id} ({status})"
    if source:
        header = f"{header}\nSource: {source}"
    return f"<workflow-state>\n{header}\n{body}\n</workflow-state>"


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    root = find_project_root(Path(hook_input.get("cwd") or os.getcwd()))
    if root is None:
        return 0

    task_id, status, source = read_active_task(root)
    breadcrumb = build_breadcrumb(task_id, status, source, load_workflow_states(root))
    output = {
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": breadcrumb,
        }
    }
    print(json.dumps(output, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
