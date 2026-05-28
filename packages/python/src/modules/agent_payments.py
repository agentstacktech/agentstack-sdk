"""
AgentPayments - Платежная система для Python
"""

from typing import Dict, Any, Optional, List, List
from ..client.agent_http import AgentHTTPClient


class AgentPayments:
    """Модуль платежной системы"""
    
    def __init__(self, client: AgentHTTPClient):
        """Инициализация модуля"""
        self.client = client
    
    async def get_payment_methods(self) -> List[Dict[str, Any]]:
        """Получение доступных методов оплаты"""
        return await self.client.get('/api/payments/config/methods')
    
    async def get_payment_method_status(
        self, 
        merchant_id: str
    ) -> List[Dict[str, Any]]:
        """Получение статуса методов оплаты для мерчанта"""
        params = {'merchant_id': merchant_id}
        return await self.client.get('/api/payments/config/methods/status', params=params)
    
    async def create_payment(
        self,
        amount: int,
        currency: str,
        description: Optional[str] = None,
        merchant_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Создание платежа"""
        data = {
            'amount': amount,
            'currency': currency
        }
        if description:
            data['description'] = description
        if merchant_id:
            data['merchant_id'] = merchant_id
        if customer_id:
            data['customer_id'] = customer_id
        if metadata:
            data['metadata'] = metadata
        
        return await self.client.post('/api/payments/create', data)
    
    async def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Получение статуса платежа"""
        return await self.client.get(f'/api/payments/{payment_id}/status')
    
    async def get_transactions(
        self,
        merchant_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Получение транзакций"""
        params = {}
        if merchant_id:
            params['merchant_id'] = merchant_id
        if limit:
            params['limit'] = limit
        if offset:
            params['offset'] = offset
        
        return await self.client.get('/api/payments/transactions', params=params)
    
    async def get_providers(self) -> List[Dict[str, Any]]:
        """Получение провайдеров платежей"""
        return await self.client.get('/api/payments/providers')
    
    async def configure_provider(
        self, 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Конфигурация провайдера платежей"""
        return await self.client.post('/api/payments/providers/configure', config)
