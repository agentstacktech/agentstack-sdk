"""
AgentAuth - Аутентификация и авторизация для Python
"""

from typing import Dict, Any, Optional, List, List
from ..client.agent_http import AgentHTTPClient


class AgentAuth:
    """Модуль аутентификации и авторизации"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
    
    async def login(
        self,
        email: str,
        password: str,
        project_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Вход в систему"""
        data = {
            'email': email,
            'password': password
        }
        if project_id:
            data['project_id'] = project_id
        
        return await self.client.post('/api/auth/login', data)
    
    async def refresh(self, refresh_token: str) -> Dict[str, Any]:
        """Обновление токена"""
        data = {'refresh_token': refresh_token}
        return await self.client.post('/api/auth/refresh', data)
    
    async def logout(self) -> None:
        """Выход из системы"""
        await self.client.post('/api/auth/logout')
    
    async def get_profile(
        self,
        include_ecosystem: bool = False,
        include_full_ecosystem: bool = False
    ) -> Dict[str, Any]:
        """Получение профиля пользователя"""
        params = {}
        if include_ecosystem:
            params["include_ecosystem"] = "true"
        if include_full_ecosystem:
            params["include_full_ecosystem"] = "true"
        return await self.client.get('/api/auth/profile', params=params)
    
    async def create_api_key(
        self,
        name: str,
        project_id: int,
        scopes: List[str],
        rate_limit_per_minute: Optional[int] = None,
        rate_limit_per_hour: Optional[int] = None,
        expires_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """Создание API ключа"""
        data = {
            'name': name,
            'project_id': project_id,
            'scopes': scopes
        }
        if rate_limit_per_minute:
            data['rate_limit_per_minute'] = rate_limit_per_minute
        if rate_limit_per_hour:
            data['rate_limit_per_hour'] = rate_limit_per_hour
        if expires_at:
            data['expires_at'] = expires_at
        
        return await self.client.post('/api/auth/api-keys', data)
    
    async def get_api_keys(self) -> Dict[str, Any]:
        """Получение списка API ключей"""
        return await self.client.get('/api/auth/api-keys')
    
    async def delete_api_key(self, key_id: str) -> None:
        """Удаление API ключа"""
        await self.client.delete(f'/api/auth/api-keys/{key_id}')
    
    async def get_sessions(self) -> Dict[str, Any]:
        """Получение сессий пользователя"""
        return await self.client.get('/api/sessions')
    
    async def terminate_session(
        self, 
        session_uuid: str, 
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Завершение сессии"""
        data = {}
        if reason:
            data['reason'] = reason
        
        return await self.client.delete(f'/api/sessions/{session_uuid}', data)
    
    async def terminate_all_sessions(
        self, 
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Завершение всех сессий"""
        data = {}
        if reason:
            data['reason'] = reason
        
        return await self.client.delete('/api/sessions/all', data)
