"""
AgentStack-SDK
Главный класс SDK с модульной архитектурой для Python
"""

import asyncio
from typing import Dict, Any, Optional
from .client.agent_http import AgentHTTPClient
from .modules.agent_auth import AgentAuth
from .modules.agent_admin import AgentAdmin
from .modules.agent_neural import AgentNeural
from .modules.agent_docs import AgentDocs
from .modules.agent_payments import AgentPayments
from .modules.agent_analytics import AgentAnalytics
from .modules.agent_webhooks import AgentWebhooks
from .modules.agent_scheduler import AgentScheduler
from .modules.agent_api import AgentAPI
from .modules.agent_buffs import AgentBuffs
from .modules.agent_integrations import AgentIntegrations
from .modules.agent_agents_fleet import AgentAgentsFleet
from .modules.agent_economy import AgentEconomy
from .modules.agentnet_admin import AgentNetAdmin
from .modules.agent_support import AgentSupport
from .modules.agent_protocol_surface import AgentProtocolSurface
from .modules.agent_assets import AgentAssets
from .modules.agent_projects_deletion import AgentProjectsDeletion


class SDKConfig:
    """Конфигурация SDK"""
    
    def __init__(
        self,
        api_base: str,
        api_key: Optional[str] = None,
        timeout: int = 30,
        retry_attempts: int = 3,
        enable_caching: bool = True,
        enable_metrics: bool = True,
        demo_mode: bool = False,
        default_headers: Optional[Dict[str, str]] = None,
        
        # Neural Architecture конфигурация
        neural: Optional[Dict[str, Any]] = None,
        
        # Retry конфигурация
        retry: Optional[Dict[str, Any]] = None,
        
        # Cache конфигурация
        cache: Optional[Dict[str, Any]] = None,
        
        # Logging конфигурация
        logging: Optional[Dict[str, Any]] = None,
    ):
        self.api_base = api_base
        self.api_key = api_key
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.enable_caching = enable_caching
        self.enable_metrics = enable_metrics
        self.demo_mode = demo_mode
        self.default_headers = default_headers or {}
        
        # Neural Architecture конфигурация
        self.neural = neural or {
            'cache': {
                'enabled': True,
                'ttl': 300,
                'max_size': 1000
            },
            'events': {
                'enabled': True,
                'buffer_size': 10000
            }
        }
        
        # Retry конфигурация
        self.retry = retry or {
            'attempts': 3,
            'delay': 1000,
            'backoff': 'exponential'
        }
        
        # Cache конфигурация
        self.cache = cache or {
            'enabled': True,
            'ttl': 300
        }
        
        # Logging конфигурация
        self.logging = logging or {
            'level': 'info',
            'enabled': True
        }


class AgentStackSDK:
    """Главный класс AgentStack-SDK"""
    
    def __init__(self, config: SDKConfig):
        """Инициализация SDK"""
        self.config = config
        
        # Создание HTTP клиента
        self.http_client = AgentHTTPClient(config)
        
        # Инициализация модулей SDK
        self.auth = AgentAuth(self.http_client)
        self.api = AgentAPI(self.http_client)
        self.admin = AgentAdmin(self.http_client)
        self.neural = AgentNeural(self.http_client)
        self.docs = AgentDocs(self.http_client)
        self.payments = AgentPayments(self.http_client)
        self.analytics = AgentAnalytics(self.http_client)
        self.webhooks = AgentWebhooks(self.http_client)
        self.scheduler = AgentScheduler(self.http_client)
        self.buffs = AgentBuffs(self.http_client)
        self.integrations = AgentIntegrations(self.http_client)
        self.agents_fleet = AgentAgentsFleet(self.http_client)
        self.economy = AgentEconomy(self.http_client)
        # Platform ops only (TS: sdk.admin). Not tenant SDK — see docs/ecosystem/PYTHON_SDK_PARITY.md
        self.agentnet_admin = AgentNetAdmin(self.http_client)
        self.support = AgentSupport(self.http_client)
        self.protocol = AgentProtocolSurface(self.http_client)
        self.assets = AgentAssets(self.http_client)
        self.projects_deletion = AgentProjectsDeletion(self.http_client)

    def get_version(self) -> str:
        """Получение версии SDK"""
        return "1.0.0"
    
    def get_config(self) -> SDKConfig:
        """Получение конфигурации SDK"""
        return self.config
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Получение метрик SDK"""
        return await self.http_client.get_metrics()
    
    async def clear_cache(self) -> None:
        """Очистка кэша"""
        await self.http_client.clear_cache()
    
    async def ping(self) -> Dict[str, Any]:
        """Проверка подключения"""
        return await self.http_client.ping()
    
    async def health_check(self) -> bool:
        """Проверка здоровья системы"""
        try:
            await self.http_client.get('/health')
            return True
        except Exception:
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Получение статуса SDK"""
        healthy = await self.health_check()
        metrics = await self.get_metrics()
        
        return {
            'healthy': healthy,
            'version': self.get_version(),
            'timestamp': asyncio.get_event_loop().time(),
            'metrics': metrics
        }


# Convenience function for creating SDK instance
def create_sdk(
    api_base: str,
    api_key: Optional[str] = None,
    **kwargs
) -> AgentStackSDK:
    """Создание экземпляра SDK с конфигурацией"""
    config = SDKConfig(api_base=api_base, api_key=api_key, **kwargs)
    return AgentStackSDK(config)
