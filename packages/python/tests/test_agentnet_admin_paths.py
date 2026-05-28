"""AgentNet admin module must not use tenant /agentnet/{id} paths."""

from __future__ import annotations

from pathlib import Path


def test_agent_economy_has_no_admin_prefix() -> None:
    src = (Path(__file__).resolve().parents[1] / "src" / "modules" / "agent_economy.py").read_text(
        encoding="utf-8",
    )
    assert "/admin/" not in src


def test_agentnet_admin_uses_admin_prefix_only() -> None:
    src = (Path(__file__).resolve().parents[1] / "src" / "modules" / "agentnet_admin.py").read_text(
        encoding="utf-8",
    )
    assert "/admin/agentnet" in src
    assert '"/agentnet/' not in src
