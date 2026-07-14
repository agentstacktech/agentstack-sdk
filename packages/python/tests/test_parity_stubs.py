"""Contract: Python SDK entrypoint wires ecosystem parity stub imports."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "agentstack_sdk.py"


def test_agentstack_sdk_imports_parity_modules() -> None:
    text = ROOT.read_text(encoding="utf-8")
    for name in (
        "AgentIntegrations",
        "AgentAgentsFleet",
        "AgentSupport",
        "AgentProtocolSurface",
        "self.integrations =",
        "self.agents_fleet =",
        "self.economy =",
        "self.agentnet_admin =",
        "self.support =",
        "self.protocol =",
        "AgentAssets",
        "self.assets =",
    ):
        assert name in text, f"missing `{name}` in agentstack_sdk.py"


def test_parity_stub_modules_exist() -> None:
    base = Path(__file__).resolve().parents[1] / "src" / "modules"
    for fname in (
        "agent_integrations.py",
        "agent_agents_fleet.py",
        "agent_economy.py",
        "agentnet_admin.py",
        "agent_support.py",
        "agent_protocol_surface.py",
        "agent_assets.py",
    ):
        assert (base / fname).is_file(), fname


def test_agent_assets_has_presets_and_crud() -> None:
    text = (Path(__file__).resolve().parents[1] / "src" / "modules" / "agent_assets.py").read_text(
        encoding="utf-8"
    )
    for fragment in ("list_asset_presets", "create_asset", "/asset-presets"):
        assert fragment in text, fragment


def test_agents_fleet_has_runtime_parity_helpers() -> None:
    text = (Path(__file__).resolve().parents[1] / "src" / "modules" / "agent_agents_fleet.py").read_text(
        encoding="utf-8"
    )
    for fragment in (
        "list_templates",
        "preview_template",
        "create_from_template",
        "list_runs",
        "list_pending_approvals",
        "get_run_detail",
        "approve_run",
        "approval_artifact_hash",
        "approval_artifact_hash is required",
        "metrics",
        "gates",
        "stream_path",
    ):
        assert fragment in text, fragment
