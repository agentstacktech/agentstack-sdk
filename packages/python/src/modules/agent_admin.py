"""
AgentAdmin - Административные функции для Python
"""

from typing import Dict, Any, Optional, List, List
from ..client.agent_http import AgentHTTPClient


class AgentAdmin:
    """Модуль административных функций"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
    
    async def get_users(
        self,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получение всех пользователей"""
        params = {}
        if page:
            params['page'] = page
        if limit:
            params['limit'] = limit
        if search:
            params['search'] = search
        if role:
            params['role'] = role
        if status:
            params['status'] = status
        
        return await self.client.get('/api/auth/admin/users', params=params)
    
    async def get_user(self, user_id: str) -> Dict[str, Any]:
        """Получение пользователя по ID"""
        return await self.client.get(f'/api/auth/admin/users/{user_id}')
    
    async def create_user(
        self,
        username: str,
        email: str,
        password: str,
        role: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone: Optional[str] = None,
        locale: Optional[str] = None
    ) -> Dict[str, Any]:
        """Создание пользователя"""
        data = {
            'username': username,
            'email': email,
            'password': password,
            'role': role
        }
        if first_name:
            data['first_name'] = first_name
        if last_name:
            data['last_name'] = last_name
        if phone:
            data['phone'] = phone
        if locale:
            data['locale'] = locale
        
        return await self.client.post('/api/auth/admin/users', data)
    
    async def update_user(
        self,
        user_id: str,
        username: Optional[str] = None,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        role: Optional[str] = None,
        phone: Optional[str] = None,
        locale: Optional[str] = None,
        is_active: Optional[bool] = None,
        two_factor_enabled: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Обновление пользователя"""
        data = {}
        if username is not None:
            data['username'] = username
        if email is not None:
            data['email'] = email
        if first_name is not None:
            data['first_name'] = first_name
        if last_name is not None:
            data['last_name'] = last_name
        if role is not None:
            data['role'] = role
        if phone is not None:
            data['phone'] = phone
        if locale is not None:
            data['locale'] = locale
        if is_active is not None:
            data['is_active'] = is_active
        if two_factor_enabled is not None:
            data['two_factor_enabled'] = two_factor_enabled
        
        return await self.client.put(f'/api/auth/admin/users/{user_id}', data)
    
    async def delete_user(self, user_id: str) -> None:
        """Удаление пользователя"""
        await self.client.delete(f'/api/auth/admin/users/{user_id}')
    
    async def suspend_user(self, user_id: str) -> Dict[str, Any]:
        """Блокировка пользователя"""
        return await self.update_user(user_id, is_active=False)
    
    async def activate_user(self, user_id: str) -> Dict[str, Any]:
        """Активация пользователя"""
        return await self.update_user(user_id, is_active=True)
    
    async def reset_user_password(self, user_id: str) -> Dict[str, Any]:
        """Сброс пароля пользователя"""
        return await self.client.post(f'/api/auth/admin/users/{user_id}/reset-password')
    
    async def toggle_user_2fa(
        self, 
        user_id: str, 
        enabled: bool
    ) -> Dict[str, Any]:
        """Переключение 2FA для пользователя"""
        return await self.update_user(user_id, two_factor_enabled=enabled)
    
    async def bulk_update_users(
        self,
        user_ids: List[str],
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Массовое обновление пользователей"""
        data = {
            'user_ids': user_ids,
            'updates': updates
        }
        return await self.client.put('/api/auth/admin/users/bulk', data)
    
    async def bulk_delete_users(self, user_ids: List[str]) -> Dict[str, Any]:
        """Массовое удаление пользователей"""
        data = {'user_ids': user_ids}
        return await self.client.delete('/api/auth/admin/users/bulk', data)
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Получение статистики системы"""
        return await self.client.get('/api/auth/admin/stats')
    
    async def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Получение метрик дашборда"""
        return await self.client.get('/api/auth/admin/dashboard')
    
    async def get_admin_sessions(
        self,
        page: Optional[int] = None,
        per_page: Optional[int] = None,
        user_id: Optional[int] = None,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Административное управление сессиями"""
        params = {}
        if page:
            params['page'] = page
        if per_page:
            params['per_page'] = per_page
        if user_id:
            params['user_id'] = user_id
        if status_filter:
            params['status_filter'] = status_filter
        
        return await self.client.get('/api/admin/sessions', params=params)
    
    async def terminate_user_session(
        self,
        session_uuid: str,
        reason: Optional[str] = None,
        notify_user: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Завершение сессии пользователя (admin)"""
        data = {}
        if reason:
            data['reason'] = reason
        if notify_user is not None:
            data['notify_user'] = notify_user
        
        return await self.client.delete(f'/api/admin/sessions/{session_uuid}', data)
    
    async def terminate_user_all_sessions(
        self,
        user_id: int,
        reason: Optional[str] = None,
        notify_user: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Завершение всех сессий пользователя (admin)"""
        data = {}
        if reason:
            data['reason'] = reason
        if notify_user is not None:
            data['notify_user'] = notify_user
        
        return await self.client.delete(f'/api/admin/sessions/user/{user_id}', data)
    
    async def get_sessions_stats(self) -> Dict[str, Any]:
        """Статистика сессий"""
        return await self.client.get('/api/admin/sessions/stats')
