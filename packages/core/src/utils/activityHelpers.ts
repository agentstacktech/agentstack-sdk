/**
 * Activity Helpers - универсальная система проверки активности сущностей
 * 
 * Philosophy: Единый механизм проверки is_active для любых сущностей
 * Использует систему плоских белков (flat proteins) для эффективного доступа
 * 
 * Поддерживает:
 * - Проверку is_active в корне сущности
 * - Проверку is_active по dot notation пути (например: 'skills.passive_skill')
 * - Работу с 8DNA сущностями и плоскими белками
 */

/**
 * Получить значение из объекта по dot notation пути
 * 
 * @param obj - Объект для поиска
 * @param path - Путь в формате dot notation (например: 'data.is_active', 'skills.passive_skill.is_active')
 * @param defaultValue - Значение по умолчанию, если путь не найден
 * @returns Значение по пути или defaultValue
 * 
 * @example
 * ```typescript
 * const entity = { data: { is_active: true } };
 * getNestedValue(entity, 'data.is_active'); // true
 * ```
 */
function getNestedValue(obj: any, path: string, defaultValue: any = undefined): any {
  if (!obj || !path) return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * Преобразовать 8DNA сущность в плоский белок (flat protein)
 * 
 * Philosophy: Используем систему плоских белков для O(1) доступа
 * 
 * @param entity - 8DNA сущность с полями id, uuid, project_id, user_id, data, config
 * @returns Плоский белок с dot notation ключами
 * 
 * @example
 * ```typescript
 * const entity = {
 *   id: 1,
 *   uuid: '...',
 *   project_id: 1025,
 *   data: { name: 'Test', is_active: true },
 *   config: { settings: { enabled: true } }
 * };
 * 
 * const protein = toFlatProtein(entity);
 * // {
 * //   '_id': 1,
 * //   '_uuid': '...',
 * //   '_project_id': 1025,
 * //   'data.name': 'Test',
 * //   'data.is_active': true,
 * //   'config.settings.enabled': true
 * // }
 * ```
 */
function toFlatProtein(entity: any): Record<string, any> {
  const protein: Record<string, any> = {};
  
  // Метаданные с префиксом _
  if (entity.id !== undefined) protein['_id'] = entity.id;
  if (entity.uuid !== undefined) protein['_uuid'] = entity.uuid;
  if (entity.project_id !== undefined) protein['_project_id'] = entity.project_id;
  if (entity.user_id !== undefined) protein['_user_id'] = entity.user_id;
  if (entity.created_at !== undefined) protein['_created_at'] = entity.created_at;
  if (entity.updated_at !== undefined) protein['_updated_at'] = entity.updated_at;
  
  // Рекурсивное преобразование вложенных объектов
  const flatten = (obj: any, prefix: string = ''): void => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Date)) {
      for (const [key, value] of Object.entries(obj)) {
        const flatKey = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          flatten(value, flatKey);
        } else {
          protein[flatKey] = value;
        }
      }
    }
  };
  
  // Преобразуем data и config
  if (entity.data) flatten(entity.data, 'data');
  if (entity.config) flatten(entity.config, 'config');
  
  // Если entity уже плоский (имеет dot notation ключи), копируем их
  for (const [key, value] of Object.entries(entity)) {
    if (key.includes('.') && !key.startsWith('_')) {
      protein[key] = value;
    }
  }
  
  return protein;
}

/**
 * Проверить, активна ли сущность
 * 
 * ✅ Philosophy: Универсальная проверка is_active для любых сущностей
 * 
 * Поддерживает:
 * - Проверку в корне: `isActive(entity)` → проверяет `entity.is_active` или `entity.data.is_active`
 * - Проверку по пути: `isActive(entity, 'skills.passive_skill')` → проверяет `entity.data.skills.passive_skill.is_active`
 * 
 * @param entity - Сущность (8DNA или плоский белок)
 * @param path - Опциональный путь к области проверки (например: 'skills.passive_skill')
 * @returns true если сущность/область активна, false иначе
 * 
 * @example
 * ```typescript
 * // Проверка активности проекта
 * const project = { data: { is_active: true } };
 * isActive(project); // true
 * 
 * // Проверка активности навыка
 * const user = { data: { skills: { passive_skill: { is_active: false } } } };
 * isActive(user, 'skills.passive_skill'); // false
 * 
 * // Проверка активности в плоском белке
 * const protein = { 'data.is_active': true, 'data.skills.passive_skill.is_active': false };
 * isActive(protein); // true (проверяет data.is_active)
 * isActive(protein, 'skills.passive_skill'); // false (проверяет data.skills.passive_skill.is_active)
 * ```
 */
export function isActive(entity: any, path?: string): boolean {
  if (!entity) return false;
  
  // Определяем, является ли entity плоским белком (имеет dot notation ключи)
  const isFlatProtein = typeof entity === 'object' && 
    Object.keys(entity).some(key => key.includes('.') && !key.startsWith('_'));
  
  if (isFlatProtein) {
    // Работа с плоским белком
    if (path) {
      // Проверяем is_active по указанному пути
      const isActiveKey = `data.${path}.is_active`;
      const value = entity[isActiveKey];
      // ✅ CRITICAL: Если явно false, возвращаем false
      if (value === false) return false;
      return value !== false && value !== undefined;
    } else {
      // Проверяем is_active в корне data
      const value = entity['data.is_active'] ?? entity['is_active'];
      // ✅ CRITICAL: Если явно false, возвращаем false
      if (value === false) return false;
      return value !== false && value !== undefined;
    }
  } else {
    // Работа с 8DNA сущностью
    if (path) {
      // Проверяем is_active по указанному пути
      const fullPath = `data.${path}.is_active`;
      const value = getNestedValue(entity, fullPath);
      return value !== false && value !== undefined;
    } else {
      // Проверяем is_active в корне или в data
      const rootIsActive = entity.is_active;
      const dataIsActive = getNestedValue(entity, 'data.is_active');
      
      // ✅ CRITICAL: Приоритет: data.is_active > is_active
      // ✅ Если явно указано false, возвращаем false (не default true!)
      if (dataIsActive !== undefined) {
        // Если data.is_active явно false, возвращаем false
        if (dataIsActive === false) return false;
        // Если data.is_active true или другое truthy значение, возвращаем true
        return dataIsActive !== false;
      }
      if (rootIsActive !== undefined) {
        // Если is_active явно false, возвращаем false
        if (rootIsActive === false) return false;
        // Если is_active true или другое truthy значение, возвращаем true
        return rootIsActive !== false;
      }
      
      // ✅ CRITICAL: По умолчанию считаем активным только если явно не указано иное
      // Но если status === 'inactive', считаем неактивным
      if (entity.status === 'inactive') {
        return false;
      }
      
      // По умолчанию считаем активным (backward compatibility)
      return true;
    }
  }
}

/**
 * Получить значение is_active по пути
 * 
 * @param entity - Сущность
 * @param path - Путь к области (например: 'skills.passive_skill')
 * @returns Значение is_active или undefined
 * 
 * @example
 * ```typescript
 * const entity = { data: { skills: { passive_skill: { is_active: false } } } };
 * getIsActive(entity, 'skills.passive_skill'); // false
 * ```
 */
export function getIsActive(entity: any, path?: string): boolean | undefined {
  if (!entity) return undefined;
  
  const isFlatProtein = typeof entity === 'object' && 
    Object.keys(entity).some(key => key.includes('.') && !key.startsWith('_'));
  
  if (isFlatProtein) {
    if (path) {
      return entity[`data.${path}.is_active`] ?? entity[`${path}.is_active`];
    } else {
      return entity['data.is_active'] ?? entity['is_active'];
    }
  } else {
    if (path) {
      return getNestedValue(entity, `data.${path}.is_active`);
    } else {
      return getNestedValue(entity, 'data.is_active') ?? entity.is_active;
    }
  }
}

/**
 * Установить значение is_active по пути
 * 
 * @param entity - Сущность (будет изменена)
 * @param value - Новое значение is_active
 * @param path - Путь к области (например: 'skills.passive_skill')
 * @returns Измененная сущность
 * 
 * @example
 * ```typescript
 * const entity = { data: { skills: {} } };
 * setIsActive(entity, false, 'skills.passive_skill');
 * // entity.data.skills.passive_skill.is_active === false
 * ```
 */
export function setIsActive(entity: any, value: boolean, path?: string): any {
  if (!entity) return entity;
  
  const isFlatProtein = typeof entity === 'object' && 
    Object.keys(entity).some(key => key.includes('.') && !key.startsWith('_'));
  
  if (isFlatProtein) {
    if (path) {
      entity[`data.${path}.is_active`] = value;
    } else {
      entity['data.is_active'] = value;
      entity['is_active'] = value;
    }
  } else {
    if (path) {
      const pathParts = path.split('.');
      const isActivePath = ['data', ...pathParts, 'is_active'];
      
      let current = entity;
      for (let i = 0; i < isActivePath.length - 1; i++) {
        const key = isActivePath[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
      current[isActivePath[isActivePath.length - 1]] = value;
    } else {
      if (!entity.data) entity.data = {};
      entity.data.is_active = value;
      entity.is_active = value;
    }
  }
  
  return entity;
}

/**
 * Фильтровать активные сущности
 * 
 * @param entities - Массив сущностей
 * @param path - Опциональный путь к области проверки
 * @returns Массив только активных сущностей
 * 
 * @example
 * ```typescript
 * const projects = [
 *   { data: { is_active: true } },
 *   { data: { is_active: false } }
 * ];
 * filterActive(projects); // [{ data: { is_active: true } }]
 * ```
 */
export function filterActive<T = any>(entities: T[], path?: string): T[] {
  return entities.filter(entity => isActive(entity, path));
}

/**
 * Получить количество активных сущностей
 * 
 * @param entities - Массив сущностей
 * @param path - Опциональный путь к области проверки
 * @returns Количество активных сущностей
 * 
 * @example
 * ```typescript
 * const users = [
 *   { data: { is_active: true } },
 *   { data: { is_active: false } },
 *   { data: { is_active: true } }
 * ];
 * getActiveCount(users); // 2
 * ```
 */
export function getActiveCount<T = any>(entities: T[], path?: string): number {
  return filterActive(entities, path).length;
}

/**
 * Преобразовать сущность в плоский белок
 * 
 * @param entity - 8DNA сущность
 * @returns Плоский белок
 */
export function toFlatProteinEntity(entity: any): Record<string, any> {
  return toFlatProtein(entity);
}

/**
 * Получить значение из плоского белка по пути
 * 
 * @param protein - Плоский белок
 * @param path - Путь в формате dot notation
 * @param defaultValue - Значение по умолчанию
 * @returns Значение по пути
 * 
 * @example
 * ```typescript
 * const protein = { 'data.skills.passive_skill.is_active': false };
 * getFlatValue(protein, 'data.skills.passive_skill.is_active'); // false
 * ```
 */
export function getFlatValue(protein: Record<string, any>, path: string, defaultValue: any = undefined): any {
  return protein[path] ?? defaultValue;
}

// Экспорт внутренних функций для расширенного использования
export { getNestedValue };

