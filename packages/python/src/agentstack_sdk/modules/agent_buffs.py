"""
AgentBuffs - Модуль для работы с баффами
"""

from typing import Dict, Any, Optional, List
from .agent_api import AgentAPI


class AgentBuffs(AgentAPI):
    """Модуль для работы с баффами"""
    
    async def get_active_buffs(
        self,
        entity_id: int,
        entity_kind: str = "user",
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получить список активных баффов"""
        params = {"category": category} if category else {}
        return await self.http_client.get(
            f"/buffs/{entity_kind}/{entity_id}/active",
            params=params
        )
    
    async def get_buff_status(
        self,
        entity_id: int,
        entity_kind: str = "user"
    ) -> Dict[str, Any]:
        """Получить статус баффов"""
        return await self.http_client.get(
            f"/buffs/{entity_kind}/{entity_id}/status"
        )
    
    async def get_buff(
        self,
        buff_id: str,
        entity_id: int,
        entity_kind: str = "user"
    ) -> Dict[str, Any]:
        """Получить информацию о конкретном баффе"""
        return await self.http_client.get(
            f"/buffs/{buff_id}",
            params={
                "entity_id": entity_id,
                "entity_kind": entity_kind
            }
        )
    
    async def get_project_active_buffs(
        self,
        project_id: int,
        include_ecosystem: bool = True,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получить активные баффы проекта"""
        params = {
            "include_ecosystem": include_ecosystem
        }
        if category:
            params["category"] = category
        return await self.http_client.get(
            f"/buffs/project/{project_id}/active",
            params=params
        )
    
    async def get_user_in_project_active_buffs(
        self,
        project_id: int,
        user_id: int,
        include_project_buffs: bool = True,
        include_ecosystem: bool = False,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получить активные баффы пользователя в проекте"""
        params = {
            "include_project_buffs": include_project_buffs,
            "include_ecosystem": include_ecosystem
        }
        if category:
            params["category"] = category
        return await self.http_client.get(
            f"/buffs/project/{project_id}/user/{user_id}/active",
            params=params
        )
    
    async def create_buff(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Создать новый бафф"""
        return await self.http_client.post("/buffs", json=data)
    
    async def apply_buff(
        self,
        buff_id: str,
        entity_id: int,
        entity_kind: str = "user"
    ) -> Dict[str, Any]:
        """Применить бафф"""
        return await self.http_client.post(
            f"/buffs/{buff_id}/apply",
            json={"entity_id": entity_id, "entity_kind": entity_kind}
        )
    
    async def extend_buff(
        self,
        buff_id: str,
        entity_id: int,
        entity_kind: str = "user",
        additional_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """Продлить бафф"""
        payload = {
            "entity_id": entity_id,
            "entity_kind": entity_kind
        }
        if additional_days:
            payload["additional_days"] = additional_days
        return await self.http_client.post(
            f"/buffs/{buff_id}/extend",
            json=payload
        )
    
    async def revert_buff(
        self,
        buff_id: str,
        entity_id: int,
        entity_kind: str = "user"
    ) -> Dict[str, Any]:
        """Откатить бафф"""
        return await self.http_client.post(
            f"/buffs/{buff_id}/revert",
            json={"entity_id": entity_id, "entity_kind": entity_kind}
        )
    
    async def cancel_buff(
        self,
        buff_id: str,
        entity_id: int,
        entity_kind: str = "user"
    ) -> Dict[str, Any]:
        """Отменить бафф до применения"""
        return await self.http_client.post(
            f"/buffs/{buff_id}/cancel",
            json={"entity_id": entity_id, "entity_kind": entity_kind}
        )
    
    async def retry_failed_buff(
        self,
        buff_id: str,
        entity_id: int,
        entity_kind: str = "user"
    ) -> Dict[str, Any]:
        """Повторить попытку применения/отката баффа после ошибки"""
        return await self.http_client.post(
            f"/buffs/{buff_id}/retry",
            json={"entity_id": entity_id, "entity_kind": entity_kind}
        )
    
    async def calculate_effective_limits(
        self,
        entity_id: int,
        entity_kind: str = "user"
    ) -> Dict[str, Any]:
        """Вычислить эффективные лимиты"""
        return await self.http_client.get(
            f"/buffs/{entity_kind}/{entity_id}/effective-limits"
        )
    
    async def get_user_in_project_effective_limits(
        self,
        project_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """Вычислить эффективные лимиты пользователя в проекте"""
        return await self.http_client.get(
            f"/buffs/project/{project_id}/user/{user_id}/effective-limits"
        )
    
    async def get_entity_data(
        self,
        entity_id: int,
        entity_kind: str = "user",
        project_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Получить структуру данных entity в плоском формате"""
        params = {
            "entity_id": entity_id,
            "entity_kind": entity_kind
        }
        if project_id:
            params["project_id"] = project_id
        return await self.http_client.get(
            "/buffs/entity-data",
            params=params
        )
