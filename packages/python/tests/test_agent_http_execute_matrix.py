"""Executable transport matrix — POST body via data= or json= alias."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from client.agent_http import AgentHTTPClient


@pytest.mark.asyncio
async def test_post_json_alias_executes_with_body() -> None:
    client = AgentHTTPClient(MagicMock())
    with patch.object(client, "_make_request", new=AsyncMock(return_value={"ok": True})) as req:
        out = await client.post("/api/agents", json={"name": "a"})
    assert out == {"ok": True}
    req.assert_awaited_once()
    assert req.await_args.kwargs.get("data") == {"name": "a"}
