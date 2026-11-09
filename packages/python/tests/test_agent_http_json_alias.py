"""AgentHTTPClient json= alias parity with data=."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from client.agent_http import AgentHTTPClient


def test_resolve_body_prefers_data() -> None:
    assert AgentHTTPClient._resolve_body({"a": 1}, {"b": 2}) == {"a": 1}


def test_resolve_body_accepts_json_alias() -> None:
    assert AgentHTTPClient._resolve_body(None, {"x": 1}) == {"x": 1}


def test_resolve_body_data_wins_over_json() -> None:
    assert AgentHTTPClient._resolve_body({"a": 1}, {"b": 2}) == {"a": 1}
