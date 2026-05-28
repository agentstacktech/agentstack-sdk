/**
 * Утилиты для работы с localStorage с поддержкой префиксов окружения
 * 
 * В dev окружении добавляется префикс 'agentstack_dev_' для изоляции данных
 * В production ключи остаются без префикса для обратной совместимости
 */

/**
 * Определить, является ли текущее окружение dev
 */
export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Проверяем переменную окружения VITE_API_BASE_URL или VITE_API_BASE
  // Vite replaces process.env.VITE_* with import.meta.env at build time; Node uses real process.env
  const envApiBase =
    (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_API_BASE);

  if (envApiBase) {
    const apiBase = String(envApiBase).toLowerCase();
    // Dev признаки: localhost, 127.0.0.1, или порты 5173/5174/5180
    if (
      apiBase.includes('localhost') ||
      apiBase.includes('127.0.0.1') ||
      apiBase.includes(':5173') ||
      apiBase.includes(':5174') ||
      apiBase.includes(':5180')
    ) {
      return true;
    }
    // Production: agentstack.tech
    if (apiBase.includes('agentstack.tech')) {
      return false;
    }
  }

  // Fallback: проверяем hostname текущей страницы
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    ) {
      return true;
    }
  }

  // По умолчанию считаем production
  return false;
}

/**
 * Получить префикс для ключей хранилища
 * Dev: 'agentstack_dev_'
 * Production: '' (без префикса)
 */
export function getStoragePrefix(): string {
  return isDevEnvironment() ? 'agentstack_dev_' : '';
}

/**
 * Получить значение из localStorage с учетом префикса окружения
 */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const prefixedKey = getStoragePrefix() + key;
    return localStorage.getItem(prefixedKey);
  } catch (error) {
    console.warn(`[StorageUtils] Failed to get item from storage: ${key}`, error);
    return null;
  }
}

/**
 * Сохранить значение в localStorage с учетом префикса окружения
 */
export function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const prefixedKey = getStoragePrefix() + key;
    localStorage.setItem(prefixedKey, value);
  } catch (error) {
    console.warn(`[StorageUtils] Failed to set item in storage: ${key}`, error);
  }
}

/**
 * Удалить значение из localStorage с учетом префикса окружения
 */
export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const prefixedKey = getStoragePrefix() + key;
    localStorage.removeItem(prefixedKey);
  } catch (error) {
    console.warn(`[StorageUtils] Failed to remove item from storage: ${key}`, error);
  }
}
