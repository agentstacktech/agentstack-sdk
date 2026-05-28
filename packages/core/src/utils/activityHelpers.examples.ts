/**
 * Activity Helpers - Примеры использования
 * 
 * Демонстрирует универсальную систему проверки активности сущностей
 */

import { isActive, getIsActive, setIsActive, filterActive, getActiveCount, toFlatProteinEntity, getFlatValue } from './activityHelpers';

// ============================================================================
// Пример 1: Проверка активности проекта
// ============================================================================

const project = {
  id: 1,
  uuid: 'project-uuid',
  project_id: 1025,
  data: {
    name: 'My Project',
    is_active: true,
    description: 'Test project'
  }
};

// Проверка активности проекта
if (isActive(project)) {
  console.log('Проект активен');
}

// ============================================================================
// Пример 2: Проверка активности навыка пользователя
// ============================================================================

const user = {
  id: 1,
  data: {
    name: 'John Doe',
    is_active: true,
    skills: {
      passive_skill: {
        name: 'Stealth',
        is_active: false,
        level: 5
      },
      active_skill: {
        name: 'Fireball',
        is_active: true,
        level: 10
      }
    }
  }
};

// Проверка активности пользователя
if (isActive(user)) {
  console.log('Пользователь активен');
}

// Проверка активности конкретного навыка
if (isActive(user, 'skills.passive_skill')) {
  console.log('Пассивный навык активен');
} else {
  console.log('Пассивный навык неактивен');
}

if (isActive(user, 'skills.active_skill')) {
  console.log('Активный навык активен');
}

// ============================================================================
// Пример 3: Работа с плоскими белками
// ============================================================================

// Преобразование 8DNA сущности в плоский белок
const flatProtein = toFlatProteinEntity(project);
console.log(flatProtein);
// {
//   '_id': 1,
//   '_uuid': 'project-uuid',
//   '_project_id': 1025,
//   'data.name': 'My Project',
//   'data.is_active': true,
//   'data.description': 'Test project'
// }

// Проверка активности в плоском белке
if (isActive(flatProtein)) {
  console.log('Проект активен (из плоского белка)');
}

// Получение значения из плоского белка
const projectName = getFlatValue(flatProtein, 'data.name');
console.log(projectName); // 'My Project'

// ============================================================================
// Пример 4: Фильтрация активных сущностей
// ============================================================================

const projects = [
  { data: { is_active: true, name: 'Project 1' } },
  { data: { is_active: false, name: 'Project 2' } },
  { data: { is_active: true, name: 'Project 3' } }
];

// Фильтрация активных проектов
const activeProjects = filterActive(projects);
console.log(activeProjects.length); // 2

// Получение количества активных проектов
const activeCount = getActiveCount(projects);
console.log(activeCount); // 2

// ============================================================================
// Пример 5: Работа с вложенными структурами
// ============================================================================

const complexEntity = {
  data: {
    is_active: true,
    modules: {
      auth: {
        is_active: true,
        settings: { enabled: true }
      },
      billing: {
        is_active: false,
        settings: { enabled: false }
      }
    }
  }
};

// Проверка активности модуля auth
if (isActive(complexEntity, 'modules.auth')) {
  console.log('Модуль auth активен');
}

// Проверка активности модуля billing
if (isActive(complexEntity, 'modules.billing')) {
  console.log('Модуль billing активен');
} else {
  console.log('Модуль billing неактивен');
}

// ============================================================================
// Пример 6: Получение и установка is_active
// ============================================================================

// Получение значения is_active
const userIsActive = getIsActive(user);
console.log(userIsActive); // true

const skillIsActive = getIsActive(user, 'skills.passive_skill');
console.log(skillIsActive); // false

// Установка значения is_active
setIsActive(user, false, 'skills.passive_skill');
console.log(user.data.skills.passive_skill.is_active); // false

setIsActive(user, true);
console.log(user.data.is_active); // true

// ============================================================================
// Пример 7: Работа с массивом навыков
// ============================================================================

const users = [
  {
    data: {
      name: 'User 1',
      is_active: true,
      skills: { passive_skill: { is_active: true } }
    }
  },
  {
    data: {
      name: 'User 2',
      is_active: true,
      skills: { passive_skill: { is_active: false } }
    }
  },
  {
    data: {
      name: 'User 3',
      is_active: false,
      skills: { passive_skill: { is_active: true } }
    }
  }
];

// Фильтрация пользователей с активным пассивным навыком
const usersWithActiveSkill = filterActive(users, 'skills.passive_skill');
console.log(usersWithActiveSkill.length); // 2 (User 1 и User 3)

// Фильтрация активных пользователей
const activeUsers = filterActive(users);
console.log(activeUsers.length); // 2 (User 1 и User 2)

