/**
 * Protein System Examples
 * Version: 0.3.6
 * Author: Lance (Александр Васильев)
 * Date: 2025-01-13
 * Philosophy: AI Gene Interface + 8DNA Architecture + Protein Command Architecture
 * 
 * Примеры использования белковой системы в AgentStack SDK
 */

import { AgentStackSDK } from '../packages/core/src';

// ============================================================================
// INITIALIZATION
// ============================================================================

const sdk = new AgentStackSDK({
  apiBase: 'https://agentstack.tech/api',
  timeout: 30000,
  enableCaching: true,
  enableMetrics: true
});

// ============================================================================
// EXAMPLE 1: PAGE COMPOSITION - USER PROFILE
// ============================================================================

async function exampleUserProfile() {
  console.log('🧬 Example 1: User Profile Page Composition');
  
  try {
    // Композиция страницы профиля пользователя
    const composedPage = await sdk.pageComposition.composePage(
      'user_profile_3d',  // Template ID
      1,                  // Project ID
      123,                // User ID
      { theme: 'dark' },  // Custom data
      'desktop'           // Layout
    );

    console.log('✅ Profile page composed successfully');
    console.log('📊 Components loaded:', composedPage.metadata.components_loaded);
    console.log('⏱️ Composition time:', composedPage.metadata.composition_time + 'ms');
    
    // Рендеринг HTML
    const html = composedPage.rendered_components
      .map(component => component.rendered_html)
      .join('\n');
    
    console.log('🎨 Rendered HTML length:', html.length);
    
    return composedPage;
    
  } catch (error) {
    console.error('❌ Profile composition failed:', error);
  }
}

// ============================================================================
// EXAMPLE 2: GAME DATA - CHARACTER & INVENTORY
// ============================================================================

async function exampleGameData() {
  console.log('🧬 Example 2: Game Data Management');
  
  try {
    // Создание игровой сессии
    const session = await sdk.gameData.createGameSession(
      1,           // Project ID
      123,         // User ID
      'rpg_game',  // Game ID
      'char_001',  // Character ID
      'world_001'  // World ID
    );

    console.log('✅ Game session created:', session.id);

    // Получение данных персонажа
    const character = await sdk.gameData.getCharacterData(
      1,      // Project ID
      123,    // User ID
      'char_001',
      true,   // Include inventory
      true,   // Include quests
      true    // Include achievements
    );

    if (character) {
      console.log('✅ Character loaded:', character.name);
      console.log('📊 Level:', character.level, 'Class:', character.class);
      console.log('⚔️ Stats:', character.stats);
      console.log('🎒 Inventory items:', character.inventory.length);
    }

    // Получение инвентаря
    const inventory = await sdk.gameData.getCharacterInventory(
      1,      // Project ID
      123,    // User ID
      'char_001',
      true    // Include equipped items
    );

    console.log('🎒 Inventory loaded:', inventory.length, 'items');

    // Получение активных квестов
    const quests = await sdk.gameData.getActiveQuests(
      1,      // Project ID
      123,    // User ID
      'char_001'
    );

    console.log('📜 Active quests:', quests.length);

    return { session, character, inventory, quests };
    
  } catch (error) {
    console.error('❌ Game data loading failed:', error);
  }
}

// ============================================================================
// EXAMPLE 3: SHOP PAGE COMPOSITION
// ============================================================================

async function exampleShopPage() {
  console.log('🧬 Example 3: Shop Page Composition');
  
  try {
    // Композиция страницы магазина
    const shopPage = await sdk.pageComposition.composePage(
      'shop_3d',           // Template ID
      1,                   // Project ID
      123,                 // User ID
      { category: 'weapons' }, // Custom filters
      'desktop'            // Layout
    );

    console.log('✅ Shop page composed successfully');
    
    // Получение данных магазина через белковую систему
    const shopData = await sdk.protein.getShopData(
      1,      // Project ID
      123,    // User ID
      'weapons', // Category
      { min_price: 100, max_price: 1000 } // Filters
    );

    if (shopData.status === 'success') {
      console.log('🛒 Shop data loaded');
      console.log('📦 Products:', shopData.result.products?.length || 0);
      console.log('🛍️ Cart items:', shopData.result.cart?.total_items || 0);
    }

    return { shopPage, shopData };
    
  } catch (error) {
    console.error('❌ Shop page composition failed:', error);
  }
}

// ============================================================================
// EXAMPLE 4: COMPLEX DATA STRUCTURE
// ============================================================================

async function exampleComplexDataStructure() {
  console.log('🧬 Example 4: Complex Data Structure');
  
  try {
    // Получение сложной структуры данных одним запросом
    const complexData = await sdk.protein.getComplexDataStructure(
      1,      // Project ID
      123,    // User ID
      {
        profile: true,
        inventory: true,
        quests: true,
        world: true,
        stats: true,
        achievements: true
      }
    );

    if (complexData.status === 'success') {
      console.log('✅ Complex data structure loaded');
      console.log('👤 Profile data:', !!complexData.result.profile);
      console.log('🎒 Inventory data:', !!complexData.result.inventory);
      console.log('📜 Quests data:', !!complexData.result.quests);
      console.log('🌍 World data:', !!complexData.result.world);
      console.log('📊 Stats data:', !!complexData.result.stats);
      console.log('🏆 Achievements data:', !!complexData.result.achievements);
    }

    return complexData;
    
  } catch (error) {
    console.error('❌ Complex data structure loading failed:', error);
  }
}

// ============================================================================
// EXAMPLE 5: GAME SCRIPT EXECUTION
// ============================================================================

async function exampleGameScriptExecution() {
  console.log('🧬 Example 5: Game Script Execution');
  
  try {
    // Выполнение игрового скрипта
    const scriptResult = await sdk.gameData.executeGameScript(
      1,      // Project ID
      123,    // User ID
      'combat_script_001', // Script ID
      {
        target: 'goblin',
        skill: 'fireball',
        character_id: 'char_001'
      }
    );

    if (scriptResult) {
      console.log('✅ Game script executed successfully');
      console.log('📜 Script ID:', scriptResult.script_id);
      console.log('⏱️ Execution time:', scriptResult.execution_time);
      console.log('📊 Result:', scriptResult.result);
    }

    return scriptResult;
    
  } catch (error) {
    console.error('❌ Game script execution failed:', error);
  }
}

// ============================================================================
// EXAMPLE 6: BATCH REQUESTS
// ============================================================================

async function exampleBatchRequests() {
  console.log('🧬 Example 6: Batch Protein Requests');
  
  try {
    // Пакетное выполнение белковых запросов
    const batchCommands = [
      {
        type: 'get_character_data' as const,
        name: 'Load Character',
        payload: { character_id: 'char_001' }
      },
      {
        type: 'get_inventory_data' as const,
        name: 'Load Inventory',
        payload: { character_id: 'char_001' }
      },
      {
        type: 'get_quest_data' as const,
        name: 'Load Quests',
        payload: { character_id: 'char_001' }
      }
    ];

    const batchResults = await sdk.protein.executeBatchRequests(
      1,      // Project ID
      123,    // User ID
      batchCommands
    );

    console.log('✅ Batch requests executed successfully');
    console.log('📊 Results count:', batchResults.length);
    
    batchResults.forEach((result, index) => {
      console.log(`📦 Command ${index + 1}:`, result.status);
    });

    return batchResults;
    
  } catch (error) {
    console.error('❌ Batch requests failed:', error);
  }
}

// ============================================================================
// EXAMPLE 7: EVENT HANDLING
// ============================================================================

function setupEventHandlers() {
  console.log('🧬 Example 7: Event Handling Setup');
  
  // Обработка событий белковой системы
  sdk.on('protein:request:start', (data) => {
    console.log('🚀 Protein request started:', data.request.command_type);
  });

  sdk.on('protein:request:success', (data) => {
    console.log('✅ Protein request successful:', data.request.command_type);
  });

  sdk.on('protein:cache:hit', (data) => {
    console.log('💾 Protein cache hit:', data.cacheKey);
  });

  sdk.on('composition:start', (data) => {
    console.log('🎨 Page composition started:', data.templateId);
  });

  sdk.on('composition:success', (data) => {
    console.log('✅ Page composition successful:', data.compositionTime + 'ms');
  });

  sdk.on('session:created', (data) => {
    console.log('🎮 Game session created:', data.session.id);
  });

  sdk.on('character:loaded', (data) => {
    console.log('👤 Character loaded:', data.characterData.name);
  });

  sdk.on('quest:completed', (data) => {
    console.log('🏆 Quest completed:', data.questId);
    console.log('🎁 Rewards:', data.rewards.length);
  });
}

// ============================================================================
// EXAMPLE 8: CACHE MANAGEMENT
// ============================================================================

async function exampleCacheManagement() {
  console.log('🧬 Example 8: Cache Management');
  
  try {
    // Получение статистики кэша
    const proteinCacheStats = sdk.protein.getCacheStats();
    console.log('💾 Protein cache stats:', proteinCacheStats);

    const processingStats = sdk.proteinProcessor.getProcessingStats();
    console.log('⚙️ Processing stats:', processingStats);

    const systemStats = sdk.pageComposition.getSystemStats();
    console.log('🏗️ Page composition stats:', systemStats);

    const gameStats = sdk.gameData.getSystemStats();
    console.log('🎮 Game data stats:', gameStats);

    // Очистка кэшей
    sdk.protein.clearProteinCache();
    sdk.proteinProcessor.clearProcessingCache();
    sdk.pageComposition.clearCompositionCache();
    sdk.gameData.clearGameCache();

    console.log('🧹 All caches cleared');

    return {
      proteinCacheStats,
      processingStats,
      systemStats,
      gameStats
    };
    
  } catch (error) {
    console.error('❌ Cache management failed:', error);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runAllExamples() {
  console.log('🧬 AgentStack Protein System Examples');
  console.log('=====================================');
  
  // Настройка обработчиков событий
  setupEventHandlers();
  
  try {
    // Запуск всех примеров
    await exampleUserProfile();
    console.log('\n');
    
    await exampleGameData();
    console.log('\n');
    
    await exampleShopPage();
    console.log('\n');
    
    await exampleComplexDataStructure();
    console.log('\n');
    
    await exampleGameScriptExecution();
    console.log('\n');
    
    await exampleBatchRequests();
    console.log('\n');
    
    await exampleCacheManagement();
    console.log('\n');
    
    console.log('🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Examples execution failed:', error);
  } finally {
    // Очистка ресурсов
    sdk.destroy();
  }
}

// Экспорт для использования в других модулях
export {
  exampleUserProfile,
  exampleGameData,
  exampleShopPage,
  exampleComplexDataStructure,
  exampleGameScriptExecution,
  exampleBatchRequests,
  exampleCacheManagement,
  setupEventHandlers,
  runAllExamples
};

// Запуск примеров, если файл выполняется напрямую
if (require.main === module) {
  runAllExamples();
}
