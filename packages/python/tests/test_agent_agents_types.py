"""Tests for agent_agents_types helpers (SDK-PY-03)."""

from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_types():
    mod_path = Path(__file__).resolve().parents[1] / "src" / "modules" / "agent_agents_types.py"
    spec = importlib.util.spec_from_file_location("agent_agents_types_isolated", mod_path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_run_status_prefers_run_detail() -> None:
    mod = _load_types()
    payload = {
        "run": {"agent_run_spec": {"status": "running"}},
        "run_detail": {"status": "waiting_for_approval"},
    }
    assert mod.run_status_from_get_run_payload(payload) == "waiting_for_approval"


def test_is_terminal_run_status() -> None:
    mod = _load_types()
    assert mod.is_terminal_run_status("completed") is True
    assert mod.is_terminal_run_status("running") is False


def test_approval_artifact_hash_from_detail_nested() -> None:
    mod = _load_types()
    detail = {"approval_review": {"approval_artifact_hash": "abc123"}}
    assert mod.approval_artifact_hash_from_detail(detail) == "abc123"
