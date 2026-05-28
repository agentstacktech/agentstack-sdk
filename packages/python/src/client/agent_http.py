"""
AgentHTTPClient - HTTP клиент для AgentStack-SDK
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, Any, Optional, Union
from urllib.parse import urljoin


class AgentHTTPClient:
    """HTTP клиент с поддержкой retry, кэширования и метрик"""
    
    def __init__(self, config):
        """Инициализация HTTP клиента"""
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.cache: Dict[str, Any] = {}
        self.metrics = {
            'requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'errors': 0,
            'total_latency': 0
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def _ensure_session(self):
        """Обеспечение активной сессии"""
        if self.session is None or self.session.closed:
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'AgentStack-SDK-Python/2.0.0',
                **self.config.default_headers
            }
            
            if self.config.api_key:
                headers['Authorization'] = f'Bearer {self.config.api_key}'
            
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            self.session = aiohttp.ClientSession(
                headers=headers,
                timeout=timeout
            )
    
    async def close(self):
        """Закрытие сессии"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def _make_request(
        self,
        method: str,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Выполнение HTTP запроса с retry и кэшированием"""
        await self._ensure_session()
        
        # Проверка кэша для GET запросов
        if method.upper() == 'GET' and cache_key and self.config.enable_caching:
            if cache_key in self.cache:
                cache_entry = self.cache[cache_key]
                if time.time() < cache_entry['expires_at']:
                    self.metrics['cache_hits'] += 1
                    return cache_entry['data']
                else:
                    del self.cache[cache_key]
            
            self.metrics['cache_misses'] += 1
        
        # Подготовка URL
        if not url.startswith('http'):
            url = urljoin(self.config.api_base, url)
        
        # Подготовка данных
        json_data = json.dumps(data) if data else None
        
        # Retry логика
        last_exception = None
        for attempt in range(self.config.retry['attempts']):
            try:
                start_time = time.time()
                
                async with self.session.request(
                    method=method,
                    url=url,
                    data=json_data,
                    params=params
                ) as response:
                    latency = time.time() - start_time
                    self.metrics['requests'] += 1
                    self.metrics['total_latency'] += latency
                    
                    response_data = await response.json()
                    
                    # Кэширование успешных GET запросов
                    if (method.upper() == 'GET' and 
                        response.status == 200 and 
                        cache_key and 
                        self.config.enable_caching):
                        ttl = self.config.cache.get('ttl', 300)
                        self.cache[cache_key] = {
                            'data': response_data,
                            'expires_at': time.time() + ttl
                        }
                    
                    if response.status >= 400:
                        raise HTTPError(response.status, response_data)
                    
                    return response_data
                    
            except Exception as e:
                last_exception = e
                self.metrics['errors'] += 1
                
                if attempt < self.config.retry['attempts'] - 1:
                    delay = self.config.retry['delay'] * (2 ** attempt)
                    await asyncio.sleep(delay / 1000)
                else:
                    raise last_exception
        
        raise last_exception
    
    async def get(
        self, 
        url: str, 
        params: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """GET запрос"""
        return await self._make_request('GET', url, params=params, cache_key=cache_key)
    
    async def post(
        self, 
        url: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """POST запрос"""
        return await self._make_request('POST', url, data=data, params=params)
    
    async def put(
        self, 
        url: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """PUT запрос"""
        return await self._make_request('PUT', url, data=data, params=params)
    
    async def delete(
        self, 
        url: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """DELETE запрос"""
        return await self._make_request('DELETE', url, data=data, params=params)
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Получение метрик"""
        avg_latency = (
            self.metrics['total_latency'] / self.metrics['requests']
            if self.metrics['requests'] > 0 else 0
        )
        
        cache_hit_rate = (
            self.metrics['cache_hits'] / 
            (self.metrics['cache_hits'] + self.metrics['cache_misses'])
            if (self.metrics['cache_hits'] + self.metrics['cache_misses']) > 0 else 0
        )
        
        error_rate = (
            self.metrics['errors'] / self.metrics['requests']
            if self.metrics['requests'] > 0 else 0
        )
        
        return {
            'requests': self.metrics['requests'],
            'cache_hit_rate': cache_hit_rate,
            'average_latency': avg_latency,
            'error_rate': error_rate,
            'uptime': time.time()
        }
    
    async def clear_cache(self) -> None:
        """Очистка кэша"""
        self.cache.clear()
    
    async def ping(self) -> Dict[str, Any]:
        """Проверка подключения"""
        start_time = time.time()
        try:
            await self.get('/health')
            latency = time.time() - start_time
            return {
                'status': 'ok',
                'latency': latency,
                'timestamp': time.time()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': time.time()
            }


class HTTPError(Exception):
    """HTTP ошибка"""
    
    def __init__(self, status_code: int, response_data: Dict[str, Any]):
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(f"HTTP {status_code}: {response_data}")
