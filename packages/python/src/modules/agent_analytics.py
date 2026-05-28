"""
AgentAnalytics - Аналитика и метрики для Python
"""

from typing import Dict, Any, Optional, List
from ..client.agent_http import AgentHTTPClient


class AgentAnalytics:
    """Модуль аналитики и метрик"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
    
    async def get_dashboard_metrics(
        self, 
        project_id: Optional[str] = None, 
        period: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получение метрик дашборда"""
        params = {}
        if project_id:
            params['project_id'] = project_id
        if period:
            params['period'] = period
        
        return await self.client.get('/api/analytics/dashboard', params=params)
    
    async def get_payment_stats(
        self, 
        merchant_id: Optional[str] = None, 
        period: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получение статистики платежей"""
        params = {}
        if merchant_id:
            params['merchant_id'] = merchant_id
        if period:
            params['period'] = period
        
        return await self.client.get('/api/analytics/payments/stats', params=params)
    
    async def get_api_usage(
        self, 
        project_id: Optional[str] = None, 
        period: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получение статистики использования API"""
        params = {}
        if project_id:
            params['project_id'] = project_id
        if period:
            params['period'] = period
        
        return await self.client.get('/api/analytics/usage', params=params)
    
    async def send_event(
        self, 
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Отправка аналитического события"""
        # Philosophy v0.2.11: URL Minimalism - Remove /api/ prefix!
        return await self.client.post('/analytics/events', event_data)
