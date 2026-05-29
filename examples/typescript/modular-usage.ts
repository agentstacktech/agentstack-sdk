/**
 * AgentStack-SDK - Примеры использования модульной архитектуры
 * Демонстрация всех модулей SDK
 */

import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: 'your_api_key',
  
  // Neural Architecture конфигурация
  neural: {
    cache: {
      enabled: true,
      ttl: 300,
      maxSize: 1000
    },
    events: {
      enabled: true,
      bufferSize: 10000
    }
  },
  
  // Retry конфигурация
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential'
  },
  
  // Cache конфигурация
  cache: {
    enabled: true,
    ttl: 300
  },
  
  // Logging конфигурация
  logging: {
    level: 'info',
    enabled: true
  }
});

// ============================================================================
// AgentAuth - Аутентификация и авторизация
// ============================================================================

async function authExamples() {
  console.log('=== AgentAuth Examples ===');
  
  // Вход в систему
  const tokens = await sdk.auth.login({
    email: 'user@example.com',
    password: 'password',
    project_id: 1
  });
  console.log('Login successful:', tokens.access_token);
  
  // Получение профиля
  const profile = await sdk.auth.getProfile();
  console.log('User profile:', profile.email);
  
  // Создание API ключа
  const apiKey = await sdk.auth.createApiKey({
    name: 'My API Key',
    project_id: 1,
    scopes: ['read', 'write'],
    rate_limit_per_minute: 1000
  });
  console.log('API Key created:', apiKey.api_key);
  
  // Управление сессиями
  const sessions = await sdk.auth.getSessions();
  console.log('Active sessions:', sessions.total);
  
  // Завершение всех сессий
  await sdk.auth.terminateAllSessions('Security logout');
  console.log('All sessions terminated');
}

// ============================================================================
// Integrator APIs (project-scoped) — see docs/INTEGRATOR_SCOPE.md
// Ecosystem admin: examples/typescript/operator-admin-usage.ts
// ============================================================================

async function platformApiExamples() {
  console.log('=== Platform API (integrator) ===');

  const projects = await sdk.platform.api.getProjects();
  console.log('Projects:', projects?.length ?? 0);

  const catalog = sdk.getModuleCatalog();
  const ids = catalog.modules.map((m) => m.id);
  console.log('Catalog includes admin?', ids.includes('admin'));
}

// ============================================================================
// AgentNeural - Neural Architecture
// ============================================================================

async function neuralExamples() {
  console.log('=== AgentNeural Examples ===');
  
  // Получение статуса Neural Architecture
  const status = await sdk.neural.getStatus();
  console.log('Neural status:', status.status);
  
  // Neural Cache операции
  await sdk.neural.cache.set('user:123:profile', { name: 'John Doe' }, 300);
  const profile = await sdk.neural.cache.get('user:123:profile');
  console.log('Cached profile:', profile);
  
  // Кэширование с тегами
  await sdk.neural.cache.setWithTags('project:456', { name: 'My Project' }, ['projects', 'active']);
  const projects = await sdk.neural.cache.getByTag('projects');
  console.log('Projects by tag:', projects);
  
  // Отправка события
  await sdk.neural.emitEvent('user_login', {
    user_id: 123,
    timestamp: new Date().toISOString()
  });
  console.log('Event emitted');
  
  // Анализ паттернов
  const patterns = await sdk.neural.patterns.analyze('user_behavior', {
    user_id: 123,
    period: '30d'
  });
  console.log('Patterns found:', patterns.patterns.length);
  
  // Предсказания
  const prediction = await sdk.neural.patterns.predict('payment_success', {
    user_id: 123,
    input_data: { amount: 1000, currency: 'RUB' }
  });
  console.log('Prediction:', prediction.prediction, 'Confidence:', prediction.confidence);
  
  // Получение метрик
  const metrics = await sdk.neural.getMetrics();
  console.log('Neural metrics:', {
    cacheHitRate: metrics.cache.hit_rate,
    eventsThroughput: metrics.events.throughput,
    patternsAccuracy: metrics.patterns.accuracy
  });
}

// ============================================================================
// AgentDocs - Документация и справка
// ============================================================================

async function docsExamples() {
  console.log('=== AgentDocs Examples ===');
  
  // Получение справки
  const help = await sdk.docs.getHelp('auth');
  console.log('Help topic:', help.title);
  
  // Поиск по документации
  const results = await sdk.docs.search('payment integration', {
    limit: 10,
    min_relevance: 0.7
  });
  console.log('Search results:', results.results.length);
  
  // Получение примеров кода
  const examples = await sdk.docs.getCodeExamples({
    language: 'typescript',
    category: 'payments'
  });
  console.log('Code examples:', examples.examples.length);
  
  // Получение FAQ
  const faq = await sdk.docs.getFAQ('payments');
  console.log('FAQ items:', faq.faqs.length);
  
  // Получение API справочника
  const apiRef = await sdk.docs.getAPIReference();
  console.log('API endpoints:', apiRef.endpoints.length);
  
  // Получение руководства по быстрому старту
  const quickStart = await sdk.docs.getQuickStart('typescript');
  console.log('Quick start steps:', quickStart.guide.steps.length);
}

// ============================================================================
// AgentPayments - Платежная система
// ============================================================================

async function paymentsExamples() {
  console.log('=== AgentPayments Examples ===');
  
  // Создание платежа
  const payment = await sdk.payments.createPayment({
    amount: 1000,
    currency: 'RUB',
    description: 'Test payment',
    customer_email: 'customer@example.com'
  });
  console.log('Payment created:', payment.id);
  
  // Получение статуса платежа
  const status = await sdk.payments.getPaymentStatus(payment.id);
  console.log('Payment status:', status.payment.status);
  
  // Получение методов оплаты
  const methods = await sdk.payments.getPaymentMethods();
  console.log('Payment methods:', methods.methods.length);
  
  // Получение статистики платежей
  const stats = await sdk.payments.getPaymentStats({
    period: 'month'
  });
  console.log('Payment stats:', {
    totalAmount: stats.total_amount,
    totalTransactions: stats.total_transactions,
    successRate: stats.success_rate
  });
  
  // Создание webhook для платежей
  const webhook = await sdk.payments.createPaymentWebhook({
    url: 'https://example.com/webhook',
    events: ['payment.created', 'payment.completed'],
    secret: 'webhook_secret'
  });
  console.log('Payment webhook created:', webhook.id);
}

// ============================================================================
// AgentAnalytics - Аналитика и метрики
// ============================================================================

async function analyticsExamples() {
  console.log('=== AgentAnalytics Examples ===');
  
  // Отправка события аналитики
  await sdk.analytics.trackEvent({
    event_type: 'user_login',
    user_id: 123,
    project_id: 1,
    metadata: {
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0...'
    }
  });
  console.log('Analytics event tracked');
  
  // Получение метрик дашборда
  const metrics = await sdk.analytics.getDashboardMetrics();
  console.log('Dashboard metrics:', {
    revenue: metrics.total_revenue.value,
    transactions: metrics.total_transactions.value,
    successRate: metrics.success_rate.value
  });
  
  // Получение статистики использования
  const usage = await sdk.analytics.getUsageStats({
    period: 'week'
  });
  console.log('Usage stats:', {
    totalApiCalls: usage.api_calls.total,
    activeUsers: usage.users.active,
    avgResponseTime: usage.performance.average_response_time
  });
  
  // Получение топ событий
  const topEvents = await sdk.analytics.getTopEvents({
    limit: 10,
    period: 'day'
  });
  console.log('Top events:', topEvents.events);
  
  // Создание кастомного отчета
  const report = await sdk.analytics.createCustomReport({
    name: 'User Activity Report',
    description: 'Daily user activity analysis',
    query: 'SELECT * FROM user_activity WHERE date = ?',
    parameters: { date: new Date().toISOString().split('T')[0] }
  });
  console.log('Custom report created:', report.report_id);
}

// ============================================================================
// AgentWebhooks - Webhook'и
// ============================================================================

async function webhooksExamples() {
  console.log('=== AgentWebhooks Examples ===');
  
  // Создание webhook'а
  const webhook = await sdk.webhooks.createWebhook({
    url: 'https://example.com/webhook',
    events: ['user.created', 'user.updated'],
    secret: 'webhook_secret',
    retry_count: 3,
    timeout: 30
  });
  console.log('Webhook created:', webhook.id);
  
  // Получение webhook'ов
  const webhooks = await sdk.webhooks.getWebhooks();
  console.log('Webhooks count:', webhooks.total);
  
  // Тестирование webhook'а
  const testResult = await sdk.webhooks.testWebhook(webhook.id, {
    event_type: 'test',
    payload: { message: 'Test webhook' }
  });
  console.log('Webhook test result:', testResult.success);
  
  // Получение статистики webhook'ов
  const stats = await sdk.webhooks.getWebhookStats();
  console.log('Webhook stats:', {
    totalWebhooks: stats.stats.total_webhooks,
    successRate: stats.stats.success_rate,
    avgResponseTime: stats.stats.average_response_time
  });
  
  // Получение логов webhook'ов
  const logs = await sdk.webhooks.getWebhookLogs();
  console.log('Webhook logs:', logs.logs.length);
}

// ============================================================================
// AgentScheduler - Планировщик задач
// ============================================================================

async function schedulerExamples() {
  console.log('=== AgentScheduler Examples ===');
  
  // Создание задачи
  const task = await sdk.scheduler.createTask({
    name: 'Daily Sync',
    description: 'Daily data synchronization',
    task_type: 'http_request',
    schedule: '0 2 * * *', // Каждый день в 2:00
    payload: {
      url: 'https://api.example.com/sync',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer token'
      }
    }
  });
  console.log('Task created:', task.id);
  
  // Получение задач
  const tasks = await sdk.scheduler.getTasks();
  console.log('Tasks count:', tasks.total);
  
  // Немедленное выполнение задачи
  const execution = await sdk.scheduler.executeTask(task.id);
  console.log('Task execution started:', execution.execution_id);
  
  // Получение выполнений задачи
  const executions = await sdk.scheduler.getTaskExecutions(task.id);
  console.log('Task executions:', executions.total);
  
  // Получение статистики задач
  const stats = await sdk.scheduler.getTaskStats();
  console.log('Scheduler stats:', {
    totalTasks: stats.total_tasks,
    successRate: stats.success_rate,
    avgExecutionTime: stats.average_execution_time
  });
  
  // Валидация cron выражения
  const validation = await sdk.scheduler.validateCronExpression('0 2 * * *');
  console.log('Cron validation:', validation.valid);
}

// ============================================================================
// AgentAPI - Основные API операции
// ============================================================================

async function apiExamples() {
  console.log('=== AgentAPI Examples ===');
  
  // Получение проектов
  const projects = await sdk.api.getProjects();
  console.log('Projects count:', projects.projects.length);
  
  // Создание проекта
  const project = await sdk.api.createProject({
    name: 'My New Project',
    description: 'Project description',
    project_type: 'custom'
  });
  console.log('Project created:', project.id);
  
  // Получение пользователей проекта
  const users = await sdk.api.getProjectUsers(project.id);
  console.log('Project users:', users.users.length);
  
  // Получение статистики проекта
  const stats = await sdk.api.getProjectStats(project.id);
  console.log('Project stats:', stats.stats);
  
  // Проверка здоровья системы
  const health = await sdk.api.healthCheck();
  console.log('System health:', health);
  
  // Получение системной информации
  const info = await sdk.api.getSystemInfo();
  console.log('System info:', {
    version: info.version,
    uptime: info.uptime,
    environment: info.environment
  });
}

// ============================================================================
// Главная функция для запуска всех примеров
// ============================================================================

async function runAllExamples() {
  try {
    console.log('🚀 AgentStack-SDK Examples');
    console.log('========================');
    
    await authExamples();
    await platformApiExamples();
    await neuralExamples();
    await docsExamples();
    await paymentsExamples();
    await analyticsExamples();
    await webhooksExamples();
    await schedulerExamples();
    await apiExamples();
    
    console.log('\n✅ All examples completed successfully!');
    
    // Получение общих метрик SDK
    const metrics = await sdk.getMetrics();
    console.log('\n📊 SDK Metrics:');
    console.log('Requests:', metrics.requests);
    console.log('Cache Hit Rate:', metrics.cacheHitRate);
    console.log('Average Latency:', metrics.averageLatency);
    console.log('Error Rate:', metrics.errorRate);
    
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Запуск примеров
if (require.main === module) {
  runAllExamples();
}

export {
  authExamples,
  platformApiExamples,
  neuralExamples,
  docsExamples,
  paymentsExamples,
  analyticsExamples,
  webhooksExamples,
  schedulerExamples,
  apiExamples,
  runAllExamples
};
