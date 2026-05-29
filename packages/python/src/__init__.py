"""
AgentStack-SDK for Python
Модульная архитектура для работы с AgentStack API
"""

from .agentstack_sdk import AgentStackSDK
from .modules.agent_auth import AgentAuth
from .modules.agent_admin import AgentAdmin
from .modules.agent_neural import AgentNeural
from .modules.agent_docs import AgentDocs
from .modules.agent_payments import AgentPayments
from .modules.agent_analytics import AgentAnalytics
from .modules.agent_webhooks import AgentWebhooks
from .modules.agent_scheduler import AgentScheduler
from .modules.agent_api import AgentAPI
from . import id_mapper

__version__ = "1.0.0"
__author__ = "AgentStack Team"
__email__ = "dev@agentstack.tech"

__all__ = [
    "AgentStackSDK",
    "AgentAuth",
    "AgentAdmin", 
    "AgentNeural",
    "AgentDocs",
    "AgentPayments",
    "AgentAnalytics",
    "AgentWebhooks",
    "AgentScheduler",
    "AgentAPI",
    "id_mapper",
]
