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
        "automation_map",
        "compile_workflow",
        "fleet_diagnostics",
        "reconcile_run",
        "sweep_stale_runs",
        "workflow_run_command",
        "update",
        "stop_run",
        "create",
        "fork",
        "promote",
        "kill",
        "update_spec_patch",
        "list_mine",
        "start_run_mine",
        "update_spec_patch_mine",
        "list_llm_providers",
        "list_fap_templates",
        "preview_policy",
        "preview_policy_mine",
        "preview_template_mine",
        "_policy_preview_body",
        "_template_preview_body",
        "for_project",
        "ProjectAgentsFleetScope",
        "agent_agents_types",
        "run_status_from_get_run_payload",
        "is_terminal_run_status",
    ):
        assert fragment in text, fragment

    types_text = (
        Path(__file__).resolve().parents[1] / "src" / "modules" / "agent_agents_types.py"
    ).read_text(encoding="utf-8")
    for fragment in ("approval_artifact_hash_from_detail", "AgentRunDetailDTO", "TERMINAL_RUN_STATUSES"):
        assert fragment in types_text, fragment


def test_merge_agent_spec_deep_merges_nested_dicts() -> None:
    import importlib.util
    import sys
    import types as pytypes
    from pathlib import Path

    base = Path(__file__).resolve().parents[1] / "src"
    if "modules" not in sys.modules:
        sys.modules["modules"] = pytypes.ModuleType("modules")

    types_path = base / "modules" / "agent_agents_types.py"
    types_spec = importlib.util.spec_from_file_location("modules.agent_agents_types", types_path)
    assert types_spec and types_spec.loader
    types_mod = importlib.util.module_from_spec(types_spec)
    sys.modules["modules.agent_agents_types"] = types_mod
    types_spec.loader.exec_module(types_mod)

    mod_path = base / "modules" / "agent_agents_fleet.py"
    spec = importlib.util.spec_from_file_location("modules.agent_agents_fleet", mod_path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules["modules.agent_agents_fleet"] = mod
    spec.loader.exec_module(mod)
    merge = mod._merge_agent_spec
    base = {"workflow": {"mode": "draft_design", "nodes": []}, "name": "A"}
    patch = {"workflow": {"compile_target": "logic"}}
    out = merge(base, patch)
    assert out["name"] == "A"
    assert out["workflow"]["mode"] == "draft_design"
    assert out["workflow"]["compile_target"] == "logic"
