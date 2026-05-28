"""
AgentWebhooks - Webhook'и для Python
"""

from typing import Dict, Any, Optional, List, List
from ..client.agent_http import AgentHTTPClient


class AgentWebhooks:
    """Модуль webhook'ов"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
    
    async def create_webhook(
        self,
        url: str,
        events: List[str],
        secret: Optional[str] = None,
        is_active: bool = True
    ) -> Dict[str, Any]:
        """Создание webhook'а"""
        data = {
            'url': url,
            'events': events,
            'is_active': is_active
        }
        if secret:
            data['secret'] = secret
        
        return await self.client.post('/api/webhooks/webhooks', data)
    
    async def get_webhooks(self) -> List[Dict[str, Any]]:
        """Получение всех webhook'ов"""
        return await self.client.get('/api/webhooks/webhooks')
    
    async def get_webhook(self, webhook_id: str) -> Dict[str, Any]:
        """Получение webhook'а по ID"""
        return await self.client.get(f'/api/webhooks/webhooks/{webhook_id}')
    
    async def update_webhook(
        self,
        webhook_id: str,
        url: Optional[str] = None,
        events: Optional[List[str]] = None,
        secret: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Обновление webhook'а"""
        data = {}
        if url is not None:
            data['url'] = url
        if events is not None:
            data['events'] = events
        if secret is not None:
            data['secret'] = secret
        if is_active is not None:
            data['is_active'] = is_active
        
        return await self.client.put(f'/api/webhooks/webhooks/{webhook_id}', data)
    
    async def delete_webhook(self, webhook_id: str) -> None:
        """Удаление webhook'а"""
        await self.client.delete(f'/api/webhooks/webhooks/{webhook_id}')
    
    async def get_webhook_logs(
        self,
        webhook_id: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> Dict[str, Any]:
        """Получение логов webhook'а"""
        params = {}
        if limit:
            params['limit'] = limit
        if offset:
            params['offset'] = offset
        
        return await self.client.get(f'/api/webhooks/webhooks/{webhook_id}/logs', params=params)
    
    async def test_webhook(self, webhook_id: str) -> Dict[str, Any]:
        """Тестирование webhook'а"""
        return await self.client.post(f'/api/webhooks/webhooks/{webhook_id}/test')
