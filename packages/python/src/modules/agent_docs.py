"""
AgentDocs - Документация и справка для Python
"""

from typing import Dict, Any, Optional, List
from ..client.agent_http import AgentHTTPClient


class AgentDocs:
    """Модуль документации и справки"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
    
    async def get_help(self, topic: str) -> Dict[str, Any]:
        """Получение справки по теме"""
        return await self.client.get(f'/api/docs/help/{topic}')
    
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """Поиск в документации"""
        params = {'query': query}
        return await self.client.get('/api/docs/search', params=params)
    
    async def get_code_examples(
        self, 
        language: Optional[str] = None, 
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Получение примеров кода"""
        params = {}
        if language:
            params['language'] = language
        if category:
            params['category'] = category
        
        return await self.client.get('/api/docs/examples', params=params)
    
    async def get_faq(self, topic: str) -> List[Dict[str, Any]]:
        """Получение FAQ по теме"""
        return await self.client.get(f'/api/docs/faq/{topic}')
