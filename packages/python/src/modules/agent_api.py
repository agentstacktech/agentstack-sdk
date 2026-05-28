"""
AgentAPI - Основные API операции для Python
"""

from typing import Dict, Any, Optional
from ..client.agent_http import AgentHTTPClient


class AgentAPI:
    """Модуль основных API операций"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
    
    async def get(
        self, 
        path: str, 
        params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """GET запрос к API"""
        return await self.client.get(path, params=params)
    
    async def post(
        self, 
        path: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """POST запрос к API"""
        return await self.client.post(path, data=data, params=params)
    
    async def put(
        self, 
        path: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """PUT запрос к API"""
        return await self.client.put(path, data=data, params=params)
    
    async def delete(
        self, 
        path: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """DELETE запрос к API"""
        return await self.client.delete(path, data=data, params=params)
    
    async def health_check(self) -> Dict[str, Any]:
        """Проверка здоровья API"""
        return await self.client.get('/health')
    
    async def get_version(self) -> Dict[str, Any]:
        """Получение версии API"""
        return await self.client.get('/version')
