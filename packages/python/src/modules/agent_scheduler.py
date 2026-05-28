"""
AgentScheduler - Планировщик задач для Python
"""

from typing import Dict, Any, Optional, List, List
from ..client.agent_http import AgentHTTPClient


class AgentScheduler:
    """Модуль планировщика задач"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
    
    async def create_task(
        self,
        name: str,
        task_type: str,
        schedule: Optional[str] = None,
        is_active: bool = True,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Создание запланированной задачи"""
        data = {
            'name': name,
            'task_type': task_type,
            'is_active': is_active
        }
        if schedule:
            data['schedule'] = schedule
        if config:
            data['config'] = config
        
        return await self.client.post('/api/scheduler/tasks', data)
    
    async def get_tasks(self) -> List[Dict[str, Any]]:
        """Получение всех задач"""
        return await self.client.get('/api/scheduler/tasks')
    
    async def get_task(self, task_id: str) -> Dict[str, Any]:
        """Получение задачи по ID"""
        return await self.client.get(f'/api/scheduler/tasks/{task_id}')
    
    async def update_task(
        self,
        task_id: str,
        name: Optional[str] = None,
        schedule: Optional[str] = None,
        is_active: Optional[bool] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Обновление задачи"""
        data = {}
        if name is not None:
            data['name'] = name
        if schedule is not None:
            data['schedule'] = schedule
        if is_active is not None:
            data['is_active'] = is_active
        if config is not None:
            data['config'] = config
        
        return await self.client.put(f'/api/scheduler/tasks/{task_id}', data)
    
    async def delete_task(self, task_id: str) -> None:
        """Удаление задачи"""
        await self.client.delete(f'/api/scheduler/tasks/{task_id}')
    
    async def run_task(self, task_id: str) -> Dict[str, Any]:
        """Запуск задачи вручную"""
        return await self.client.post(f'/api/scheduler/tasks/{task_id}/run')
    
    async def get_task_executions(
        self,
        task_id: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Получение истории выполнения задачи"""
        params = {}
        if limit:
            params['limit'] = limit
        if offset:
            params['offset'] = offset
        
        return await self.client.get(f'/api/scheduler/tasks/{task_id}/executions', params=params)
    
    async def get_task_execution(
        self, 
        task_id: str, 
        execution_id: str
    ) -> Dict[str, Any]:
        """Получение конкретного выполнения задачи"""
        return await self.client.get(f'/api/scheduler/tasks/{task_id}/executions/{execution_id}')
    
    async def get_scheduler_stats(self) -> Dict[str, Any]:
        """Получение статистики планировщика"""
        return await self.client.get('/api/scheduler/stats')
