/**
 * AgentStack-SDK React Examples
 * Административная панель с использованием модульной архитектуры
 */

import React, { useState, useEffect } from 'react';
import { AgentStackSDK } from '@agentstack/sdk';

// Инициализация SDK
const sdk = new AgentStackSDK({
  apiBase: process.env.REACT_APP_AGENTSTACK_API_BASE || 'https://api.agentstack.com',
  apiKey: process.env.REACT_APP_AGENTSTACK_API_KEY || 'your_api_key',
  
  neural: {
    cache: { enabled: true, ttl: 300 },
    events: { enabled: true, bufferSize: 10000 }
  },
  
  retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
  cache: { enabled: true, ttl: 300 },
  logging: { level: 'info', enabled: true }
});

// ============================================================================
// Типы данных
// ============================================================================

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'suspended' | 'pending';
  last_login?: string;
  created_at: string;
}

interface SystemStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  active_projects: number;
  total_revenue: number;
  success_rate: number;
}

interface DashboardMetrics {
  total_revenue: { value: number; change_percentage: number };
  total_transactions: { value: number; change_percentage: number };
  success_rate: { value: number; change_percentage: number };
  active_customers: { value: number; change_percentage: number };
}

// ============================================================================
// Компонент статистики
// ============================================================================

const StatsCard: React.FC<{ title: string; value: number; change?: number; icon: string }> = ({
  title,
  value,
  change,
  icon
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
          <span className="text-white text-sm font-medium">{icon}</span>
        </div>
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
        {change !== undefined && (
          <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{change}% от прошлого периода
          </p>
        )}
      </div>
    </div>
  </div>
);

// ============================================================================
// Компонент списка пользователей
// ============================================================================

const UsersList: React.FC<{
  users: User[];
  onUserAction: (userId: string, action: 'suspend' | 'activate' | 'delete') => void;
  loading: boolean;
}> = ({ users, onUserAction, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {users.map((user) => (
          <li key={user.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="text-xs text-gray-400">
                    Роль: {user.role} | Статус: {user.status}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                {user.status === 'active' ? (
                  <button
                    onClick={() => onUserAction(user.id, 'suspend')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Заблокировать
                  </button>
                ) : (
                  <button
                    onClick={() => onUserAction(user.id, 'activate')}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Активировать
                  </button>
                )}
                <button
                  onClick={() => onUserAction(user.id, 'delete')}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  Удалить
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// Компонент поиска и фильтров
// ============================================================================

const SearchFilters: React.FC<{
  onSearch: (query: string) => void;
  onFilterChange: (filters: { role?: string; status?: string }) => void;
}> = ({ onSearch, onFilterChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleRoleChange = (role: string) => {
    setRoleFilter(role);
    onFilterChange({ role: role || undefined, status: statusFilter || undefined });
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    onFilterChange({ role: roleFilter || undefined, status: status || undefined });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Поиск пользователей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все роли</option>
            <option value="admin">Администратор</option>
            <option value="member">Участник</option>
            <option value="guest">Гость</option>
          </select>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="suspended">Заблокированные</option>
            <option value="pending">Ожидающие</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Поиск
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// Главный компонент административной панели
// ============================================================================

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Параллельная загрузка всех данных
      const [usersData, statsData, metricsData] = await Promise.all([
        sdk.admin.getUsers({ limit: 50 }),
        sdk.admin.getSystemStats(),
        sdk.admin.getDashboardMetrics()
      ]);

      setUsers(usersData.users);
      setStats(statsData);
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSearch = async (query: string) => {
    try {
      setLoading(true);
      const usersData = await sdk.admin.getUsers({ search: query, limit: 50 });
      setUsers(usersData.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (filters: { role?: string; status?: string }) => {
    try {
      setLoading(true);
      const usersData = await sdk.admin.getUsers({ 
        ...filters, 
        limit: 50 
      });
      setUsers(usersData.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка фильтрации');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'delete') => {
    try {
      switch (action) {
        case 'suspend':
          await sdk.admin.suspendUser(userId);
          break;
        case 'activate':
          await sdk.admin.activateUser(userId);
          break;
        case 'delete':
          await sdk.admin.deleteUser(userId);
          break;
      }
      
      // Обновляем список пользователей
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка выполнения действия');
    }
  };

  const handleRefreshData = () => {
    loadDashboardData();
  };

  if (loading && !stats && !metrics) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Административная панель AgentStack
            </h1>
            <button
              onClick={handleRefreshData}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Обновить данные
            </button>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Всего пользователей"
              value={stats.total_users}
              icon="👥"
            />
            <StatsCard
              title="Активных пользователей"
              value={stats.active_users}
              icon="✅"
            />
            <StatsCard
              title="Проектов"
              value={stats.total_projects}
              icon="📁"
            />
            <StatsCard
              title="Успешность (%)"
              value={Math.round(stats.success_rate)}
              icon="📊"
            />
          </div>
        )}

        {/* Метрики дашборда */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Доход"
              value={metrics.total_revenue.value}
              change={metrics.total_revenue.change_percentage}
              icon="💰"
            />
            <StatsCard
              title="Транзакции"
              value={metrics.total_transactions.value}
              change={metrics.total_transactions.change_percentage}
              icon="💳"
            />
            <StatsCard
              title="Успешность (%)"
              value={metrics.success_rate.value}
              change={metrics.success_rate.change_percentage}
              icon="📈"
            />
            <StatsCard
              title="Активные клиенты"
              value={metrics.active_customers.value}
              change={metrics.active_customers.change_percentage}
              icon="👤"
            />
          </div>
        )}

        {/* Поиск и фильтры */}
        <SearchFilters
          onSearch={handleUserSearch}
          onFilterChange={handleFilterChange}
        />

        {/* Список пользователей */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Управление пользователями
            </h2>
          </div>
          <UsersList
            users={users}
            onUserAction={handleUserAction}
            loading={loading}
          />
        </div>

        {/* Информация о SDK */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Информация о AgentStack-SDK
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Версия SDK</p>
              <p className="font-medium">{sdk.getVersion()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">API Base</p>
              <p className="font-medium">{sdk.getConfig().apiBase}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Neural Cache</p>
              <p className="font-medium">
                {sdk.getConfig().neural?.cache?.enabled ? 'Включен' : 'Отключен'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
