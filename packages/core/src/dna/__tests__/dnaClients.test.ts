"""SDK DNA clients unwrap APIResponse.data."""

from unittest.mock import MagicMock

import pytest

from dna.lineage import DnaLineageClient
from dna.mergePolicy import DnaMergePolicyClient


@pytest.mark.asyncio
async def test_lineage_client_unwraps_data():
    http = MagicMock()
    payload = {"table": "data_projects_8dna", "uuid": "u", "direction": "ancestors", "nodes": []}
    http.get = MagicMock(return_value={"data": payload})
    client = DnaLineageClient(http)
    result = await client.getAncestors("data_projects_8dna", "u", 42)
    assert result["nodes"] == []


@pytest.mark.asyncio
async def test_merge_policy_client_unwraps_data():
    http = MagicMock()
    payload = {
        "project_id": 42,
        "ecosystem_merge": {"enabled": True, "components": ["email"], "on_conflict": "ecosystem_wins"},
    }
    http.get = MagicMock(return_value={"data": payload})
    client = DnaMergePolicyClient(http)
    result = await client.get(42)
    assert result["ecosystem_merge"]["enabled"] is True
