"""
Пример использования AgentStack-SDK для Python
"""

import asyncio
from src.agentstack_sdk import AgentStackSDK, SDKConfig


async def main():
    """Основная функция примера"""
    print("🚀 Запуск примера AgentStack-SDK для Python...")
    
    # Создание конфигурации SDK
    config = SDKConfig(
        api_base="https://agentstack.tech/api",
        api_key="your_api_key",           # Замените на ваш API ключ
        timeout=30,
        enable_caching=True,
        enable_metrics=True,
        neural={
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
    )
    
    # Создание экземпляра SDK
    sdk = AgentStackSDK(config)
    
    try:
        # --- AgentAuth Module ---
        print("\n--- AgentAuth Module ---")
        # Пример входа (раскомментируйте, если нужно)
        # login_response = await sdk.auth.login("user@example.com", "password")
        # print(f"Login successful: {login_response}")
        
        # Получение профиля
        try:
            profile = await sdk.auth.get_profile()
            print(f"User profile: {profile}")
        except Exception as e:
            print(f"Profile error: {e}")
        
        # --- Platform API (integrator; no ecosystem admin) ---
        print("\n--- Platform API ---")
        try:
            projects = await sdk.api.get("/projects")
            print(f"Projects count: {len(projects) if isinstance(projects, list) else 'n/a'}")
        except Exception as e:
            print(f"API error: {e}")

        # --- AgentPayments Module ---
        print("\n--- AgentPayments Module ---")
        try:
            payment_methods = await sdk.payments.get_payment_methods()
            print(f"Payment methods count: {len(payment_methods)}")
            
            transactions = await sdk.payments.get_transactions(limit=5)
            print(f"Transactions count: {len(transactions)}")
        except Exception as e:
            print(f"Payments error: {e}")
        
        # --- AgentNeural Module ---
        print("\n--- AgentNeural Module ---")
        try:
            # Neural Cache
            await sdk.neural.cache.set("test_key", {"message": "Hello from Neural Cache!"}, ttl=60)
            cached_data = await sdk.neural.cache.get("test_key")
            print(f"Neural Cache data: {cached_data}")
            
            # Neural Events
            await sdk.neural.events.emit("test_event", {"data": "test_value"})
            print("Neural Event emitted")
            
            # Neural Status
            neural_status = await sdk.neural.get_status()
            print(f"Neural Status: {neural_status}")
        except Exception as e:
            print(f"Neural error: {e}")
        
        # --- AgentDocs Module ---
        print("\n--- AgentDocs Module ---")
        try:
            help_docs = await sdk.docs.get_help("auth")
            print(f"Help docs title: {help_docs.get('title', 'N/A')}")
        except Exception as e:
            print(f"Docs error: {e}")
        
        # --- AgentAnalytics Module ---
        print("\n--- AgentAnalytics Module ---")
        try:
            dashboard_metrics = await sdk.analytics.get_dashboard_metrics(period="week")
            print(f"Dashboard metrics: {dashboard_metrics}")
        except Exception as e:
            print(f"Analytics error: {e}")
        
        # --- AgentWebhooks Module ---
        print("\n--- AgentWebhooks Module ---")
        try:
            webhooks = await sdk.webhooks.get_webhooks()
            print(f"Webhooks count: {len(webhooks)}")
        except Exception as e:
            print(f"Webhooks error: {e}")
        
        # --- AgentScheduler Module ---
        print("\n--- AgentScheduler Module ---")
        try:
            tasks = await sdk.scheduler.get_tasks()
            print(f"Scheduled tasks count: {len(tasks)}")
        except Exception as e:
            print(f"Scheduler error: {e}")
        
        # --- AgentAPI Module (Generic) ---
        print("\n--- AgentAPI Module (Generic) ---")
        try:
            health_status = await sdk.api.health_check()
            print(f"API Health Status: {health_status}")
        except Exception as e:
            print(f"API error: {e}")
        
        # --- SDK Status ---
        print("\n--- SDK Status ---")
        sdk_status = await sdk.get_status()
        print(f"SDK Status: {sdk_status}")
        
        # --- SDK Metrics ---
        print("\n--- SDK Metrics ---")
        sdk_metrics = await sdk.get_metrics()
        print(f"SDK Metrics: {sdk_metrics}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    
    finally:
        # Закрытие соединений
        await sdk.http_client.close()
        print("\n✅ Пример AgentStack-SDK для Python завершен.")


if __name__ == "__main__":
    asyncio.run(main())
