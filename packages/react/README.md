# AgentStack React SDK

Официальная React интеграция для AgentStack SDK. Предоставляет React хуки, компоненты и контекст для легкой интеграции с AgentStack API.

## 🚀 Быстрый старт

### Установка

```bash
npm install @agentstack/react
```

### Базовое использование

```tsx
import React from 'react';
import { SDKProvider, useAuth, useProfile, useSettings } from '@agentstack/react';

// Конфигурация SDK
const sdkConfig = {
  apiBase: 'https://agentstack.tech/api',
  apiKey: 'your-api-key',
  projectId: 1,
};

function App() {
  return (
    <SDKProvider config={sdkConfig}>
      <Dashboard />
    </SDKProvider>
  );
}

function Dashboard() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { profileData, updateProfile } = useProfile();
  const { settings, updateSettings } = useSettings();

  if (!isAuthenticated) {
    return (
      <div>
        <h1>Добро пожаловать в AgentStack</h1>
        <button onClick={() => login({
          email: 'user@example.com',
          password: 'password',
          project_id: 1,
        })}>
          Войти
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Привет, {user?.display_name || user?.email}!</h1>
      <button onClick={logout}>Выйти</button>
      
      <ProfileSection profile={profileData} onUpdate={updateProfile} />
      <SettingsSection settings={settings} onUpdate={updateSettings} />
    </div>
  );
}
```

## 🎣 React Hooks

### useAuth

Хук для аутентификации и управления пользователем.

```tsx
import { useAuth } from '@agentstack/react';

function LoginForm() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error,
    login, 
    logout, 
    updateProfile,
    changePassword,
    toggle2FA,
    refresh 
  } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await login({
        email: credentials.email,
        password: credentials.password,
        project_id: 1,
      });
    } catch (error) {
      console.error('Ошибка входа:', error.message);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Добро пожаловать, {user?.display_name}!</p>
          <button onClick={logout}>Выйти</button>
        </div>
      ) : (
        <form onSubmit={handleLogin}>
          <input type="email" name="email" required />
          <input type="password" name="password" required />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### useProfile

Хук для управления профилем пользователя.

```tsx
import { useProfile } from '@agentstack/react';

function ProfileEditor() {
  const {
    profileData,
    isLoading,
    error,
    updateProfile,
    setUsername,
    setDisplayName,
    setBio,
    setAvatar,
    refresh
  } = useProfile();

  const handleUpdateProfile = async (data) => {
    try {
      await updateProfile({
        display_name: data.displayName,
        bio: data.bio,
        social_links: {
          github: data.github,
          twitter: data.twitter,
        }
      });
    } catch (error) {
      console.error('Ошибка обновления профиля:', error.message);
    }
  };

  return (
    <div>
      <h2>Редактирование профиля</h2>
      <form onSubmit={handleUpdateProfile}>
        <input 
          defaultValue={profileData?.display_name || ''}
          placeholder="Отображаемое имя"
        />
        <textarea 
          defaultValue={profileData?.bio || ''}
          placeholder="О себе"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### useSettings

Хук для управления настройками пользователя.

```tsx
import { useSettings } from '@agentstack/react';

function SettingsPanel() {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    setTheme,
    setNotification,
    refresh
  } = useSettings();

  const handleThemeChange = async (theme) => {
    try {
      await setTheme(theme);
    } catch (error) {
      console.error('Ошибка изменения темы:', error.message);
    }
  };

  return (
    <div>
      <h2>Настройки</h2>
      
      <div>
        <label>Тема:</label>
        <select 
          value={settings?.theme || 'system'}
          onChange={(e) => handleThemeChange(e.target.value)}
        >
          <option value="light">Светлая</option>
          <option value="dark">Темная</option>
          <option value="system">Системная</option>
        </select>
      </div>

      <div>
        <label>Уведомления:</label>
        {settings?.notifications && Object.entries(settings.notifications).map(([type, enabled]) => (
          <label key={type}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setNotification(type, e.target.checked)}
            />
            {type}
          </label>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### usePayments

Хук для работы с платежами.

```tsx
import { usePayments } from '@agentstack/react';

function PaymentHistory() {
  const {
    payments,
    isLoading,
    error,
    createPayment,
    getPayments,
    refresh
  } = usePayments();

  const handleCreatePayment = async (paymentData) => {
    try {
      const payment = await createPayment({
        amount: paymentData.amount,
        currency: 'USD',
        description: paymentData.description,
        project_id: 1,
      });
      console.log('Платеж создан:', payment.id);
    } catch (error) {
      console.error('Ошибка создания платежа:', error.message);
    }
  };

  return (
    <div>
      <h2>История платежей</h2>
      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <ul>
          {payments?.map(payment => (
            <li key={payment.id}>
              {payment.description}: ${payment.amount / 100} {payment.currency}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### useAnalytics

Хук для работы с аналитикой.

```tsx
import { useAnalytics } from '@agentstack/react';

function AnalyticsDashboard() {
  const {
    metrics,
    isLoading,
    error,
    trackEvent,
    getDashboardMetrics,
    refresh
  } = useAnalytics();

  const handleTrackEvent = async (eventType, properties) => {
    try {
      await trackEvent({
        event_type: eventType,
        properties,
        project_id: 1,
      });
    } catch (error) {
      console.error('Ошибка отслеживания события:', error.message);
    }
  };

  return (
    <div>
      <h2>Аналитика</h2>
      {isLoading ? (
        <p>Загрузка метрик...</p>
      ) : (
        <div>
          <p>Всего событий: {metrics?.total_events}</p>
          <p>Уникальных пользователей: {metrics?.unique_users}</p>
          <p>Общий доход: ${metrics?.total_revenue}</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### useProjects

Хук для управления проектами.

```tsx
import { useProjects } from '@agentstack/react';

function ProjectManager() {
  const {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refresh
  } = useProjects();

  const handleCreateProject = async (projectData) => {
    try {
      const project = await createProject({
        name: projectData.name,
        description: projectData.description,
      });
      console.log('Проект создан:', project.id);
    } catch (error) {
      console.error('Ошибка создания проекта:', error.message);
    }
  };

  return (
    <div>
      <h2>Управление проектами</h2>
      {isLoading ? (
        <p>Загрузка проектов...</p>
      ) : (
        <ul>
          {projects?.map(project => (
            <li key={project.id}>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## 🧩 Компоненты

### SDKProvider

Контекстный провайдер для инициализации SDK.

```tsx
import { SDKProvider } from '@agentstack/react';

function App() {
  const sdkConfig = {
    apiBase: 'https://agentstack.tech/api',
    apiKey: 'your-api-key',
    projectId: 1,
    timeout: 10000,
    retryAttempts: 3,
  };

  return (
    <SDKProvider config={sdkConfig}>
      <YourApp />
    </SDKProvider>
  );
}
```

### ProfileComponent

Готовый компонент для отображения и редактирования профиля.

```tsx
import { ProfileComponent } from '@agentstack/react';

function ProfilePage() {
  return (
    <div>
      <h1>Профиль пользователя</h1>
      <ProfileComponent />
    </div>
  );
}
```

### ProjectsComponent

Готовый компонент для управления проектами.

```tsx
import { ProjectsComponent } from '@agentstack/react';

function ProjectsPage() {
  return (
    <div>
      <h1>Проекты</h1>
      <ProjectsComponent />
    </div>
  );
}
```

## 🔧 Конфигурация

### SDKConfig

```tsx
interface SDKConfig {
  apiBase: string;           // Базовый URL API
  apiKey?: string;           // API ключ
  projectId?: number;        // ID проекта
  timeout?: number;          // Таймаут запросов (мс)
  retryAttempts?: number;    // Количество попыток повтора
  retryDelay?: number;       // Задержка между попытками (мс)
  enableCaching?: boolean;   // Включить кэширование
  enableMetrics?: boolean;   // Включить сбор метрик
}
```

### Кастомная конфигурация

```tsx
import { SDKProvider } from '@agentstack/react';

function App() {
  const customConfig = {
    apiBase: 'https://agentstack.tech/api',
    apiKey: 'your-api-key',
    projectId: 1,
    timeout: 15000,
    retryAttempts: 5,
    retryDelay: 2000,
    enableCaching: true,
    enableMetrics: true,
    defaultHeaders: {
      'X-Custom-Header': 'custom-value',
    },
    neural: {
      cache: {
        enabled: true,
        ttl: 300000, // 5 минут
        maxSize: 1000,
      },
      events: {
        enabled: true,
        bufferSize: 100,
      },
    },
  };

  return (
    <SDKProvider config={customConfig}>
      <YourApp />
    </SDKProvider>
  );
}
```

## 🎨 Стилизация

Все компоненты используют CSS классы для стилизации:

```css
/* Основные классы */
.agentstack-profile { }
.agentstack-settings { }
.agentstack-payments { }
.agentstack-analytics { }
.agentstack-projects { }

/* Состояния */
.agentstack-loading { }
.agentstack-error { }
.agentstack-success { }

/* Элементы форм */
.agentstack-input { }
.agentstack-button { }
.agentstack-select { }
.agentstack-textarea { }
```

## 🔄 Управление состоянием

React SDK автоматически управляет состоянием через React Query:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function CustomComponent() {
  const queryClient = useQueryClient();
  
  // Инвалидация кэша после мутации
  const { mutate: updateProfile } = useMutation({
    mutationFn: updateProfileData,
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
    },
  });

  return (
    <button onClick={() => updateProfile({ display_name: 'New Name' })}>
      Обновить профиль
    </button>
  );
}
```

## 🚨 Обработка ошибок

```tsx
import { useAuth } from '@agentstack/react';

function LoginForm() {
  const { login, error, isLoading } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
    } catch (error) {
      // Ошибка уже обработана в хуке
      console.log('Ошибка входа:', error.message);
    }
  };

  return (
    <div>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      {/* Форма входа */}
    </div>
  );
}
```

## 📱 SSR поддержка

```tsx
import { SSRProvider, useSSRAuth } from '@agentstack/react';

function App() {
  return (
    <SSRProvider config={sdkConfig}>
      <YourApp />
    </SSRProvider>
  );
}

function SSRComponent() {
  const { user, isAuthenticated, isHydrated } = useSSRAuth();

  if (!isHydrated) {
    return <div>Загрузка...</div>;
  }

  return (
    <div>
      {isAuthenticated ? `Привет, ${user?.display_name}!` : 'Войдите в систему'}
    </div>
  );
}
```

## 🧪 Тестирование

```tsx
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SDKProvider } from '@agentstack/react';
import { useAuth } from '@agentstack/react';

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <SDKProvider config={testConfig}>
        {children}
      </SDKProvider>
    </QueryClientProvider>
  );
}

test('useAuth hook', () => {
  const { result } = renderHook(() => useAuth(), {
    wrapper: createTestWrapper(),
  });

  expect(result.current.isAuthenticated).toBe(false);
  expect(result.current.user).toBeNull();
});
```

## 📚 Дополнительные ресурсы

- [AgentStack Core SDK](../core/README.md)
- [API Документация](../../docs/api/)
- [Примеры использования](../../examples/)
- [Changelog](./CHANGELOG.md)

## 🤝 Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте [FAQ](../../docs/FAQ_DETAILED.md)
2. Создайте [Issue](https://github.com/agentstacktech/agentstack-sdk/issues)
3. Обратитесь в [Telegram](https://t.me/agentstack)

## 📄 Лицензия

MIT License - см. [LICENSE](../../LICENSE) для деталей.