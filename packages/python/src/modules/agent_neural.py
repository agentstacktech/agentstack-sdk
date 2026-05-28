"""
AgentNeural - Neural Architecture интеграция для Python
"""

from typing import Dict, Any, Optional, List
from ..client.agent_http import AgentHTTPClient


class AgentNeural:
    """Модуль Neural Architecture интеграции"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
        self.cache = NeuralCache(client)
        self.events = NeuralEvents(client)
        self.patterns = NeuralPatterns(client)
    
    async def get_status(self) -> Dict[str, Any]:
        """Получение статуса Neural Architecture"""
        return await self.client.get('/neural/status')
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Получение метрик Neural Architecture"""
        return await self.client.get('/neural/metrics')


class NeuralCache:
    """Neural Cache функциональность"""
    
    def __init__(self, client: AgentHTTPClient):
        self.client = client
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None,
        tags: Optional[List[str]] = None,
        cache_name: str = 'default'
    ) -> bool:
        """Установка значения в кэш с опциональными тегами"""
        data = {
            'key': key, 
            'value': value,
            'cache_name': cache_name
        }
        if ttl:
            data['ttl'] = ttl
        if tags:
            data['tags'] = tags
        response = await self.client.post('/neural/cache/set', data)
        return response.get('success', False)
    
    async def get(self, key: str, cache_name: str = 'default') -> Any:
        """Получение значения из кэша"""
        response = await self.client.get(
            f'/neural/cache/{key}',
            params={'cache_name': cache_name}
        )
        return response.get('value')
    
    async def set_with_tags(
        self, 
        key: str, 
        value: Any, 
        tags: List[str], 
        ttl: Optional[int] = None,
        cache_name: str = 'default'
    ) -> bool:
        """Установка значения с тегами (алиас для set с тегами)"""
        return await self.set(key, value, ttl, tags, cache_name)
    
    async def delete(self, key: str, cache_name: str = 'default') -> bool:
        """Удаление значения из кэша"""
        response = await self.client.delete(
            f'/neural/cache/{key}',
            params={'cache_name': cache_name}
        )
        return response.get('success', False)
    
    async def invalidate_by_tag(self, tag: str, cache_name: str = 'default') -> int:
        """Инвалидация кэша по тегу"""
        response = await self.client.post('/neural/cache/invalidate/tag', {
            'tag': tag,
            'cache_name': cache_name
        })
        return response.get('invalidated_count', 0)
    
    async def invalidate_by_pattern(self, pattern: str, cache_name: str = 'default') -> int:
        """Инвалидация кэша по паттерну"""
        response = await self.client.post('/neural/cache/invalidate/pattern', {
            'pattern': pattern,
            'cache_name': cache_name
        })
        return response.get('invalidated_count', 0)
    
    async def get_stats(self, cache_name: Optional[str] = None) -> Dict[str, Any]:
        """Получение статистики кэша"""
        params = {'cache_name': cache_name} if cache_name else None
        return await self.client.get('/neural/cache/stats', params=params)


class NeuralEvents:
    """Neural Events функциональность"""
    
    def __init__(self, client: AgentHTTPClient):
        self.client = client
    
    async def emit(
        self, 
        event_type: str, 
        data: Dict[str, Any]
    ) -> None:
        """Отправка события"""
        payload = {'event_type': event_type, 'data': data}
        await self.client.post('/neural/events/emit', payload)
    
    async def get_events(
        self,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        event_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получение событий"""
        params = {}
        if limit:
            params['limit'] = limit
        if offset:
            params['offset'] = offset
        if event_type:
            params['event_type'] = event_type
        
        return await self.client.get('/neural/events', params=params)


class NeuralPatterns:
    """Neural Patterns функциональность"""
    
    def __init__(self, client: AgentHTTPClient):
        self.client = client
    
    async def analyze(
        self, 
        context: str, 
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Анализ паттернов"""
        return await self.client.post(f'/neural/patterns/analyze/{context}', params)
    
    async def predict(
        self, 
        prediction_type: str, 
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Предсказание"""
        return await self.client.post(f'/neural/patterns/predict/{prediction_type}', params)
