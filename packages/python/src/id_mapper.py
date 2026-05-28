"""
Thin wrapper to access shared.id_mapper from Python SDK (in-process only).
"""

from __future__ import annotations

try:
    from shared.id_mapper import id_mapper
except ImportError as import_err:  # pragma: no cover - environment guard
    id_mapper = None
    _import_err = import_err
else:
    _import_err = None


def _ensure_available() -> None:
    if id_mapper is None:
        raise RuntimeError(
            "id_mapper is not available. This wrapper requires running inside "
            "the AgentStack core environment with 'shared' package on sys.path."
        ) from _import_err


def get_project_db_id(logical_project_id: int) -> int:
    _ensure_available()
    return id_mapper.get_project_db_id(logical_project_id)


def get_user_db_id(logical_user_id: int) -> int:
    _ensure_available()
    return id_mapper.get_user_db_id(logical_user_id)


async def set_project(logical_project_id: int, db_id: int) -> None:
    _ensure_available()
    await id_mapper.set_project(logical_project_id, db_id)


async def set_user(logical_user_id: int, db_id: int) -> None:
    _ensure_available()
    await id_mapper.set_user(logical_user_id, db_id)


async def delete_project(logical_project_id: int) -> None:
    _ensure_available()
    await id_mapper.delete_project(logical_project_id)


async def delete_user(logical_user_id: int) -> None:
    _ensure_available()
    await id_mapper.delete_user(logical_user_id)


async def reload_all() -> None:
    _ensure_available()
    await id_mapper.reload_all()


async def reset() -> None:
    _ensure_available()
    await id_mapper.reset()


def stats():
    _ensure_available()
    return id_mapper.stats()

