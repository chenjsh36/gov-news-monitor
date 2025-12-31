import NewsScraper from './scraper.js';
import NewsStorage from './storage.js';
import dotenv from 'dotenv';

// 加载环境变量（可选，用于测试）
dotenv.config();

/**
 * 集成测试
 * 测试爬取 -> 存储 -> 去重的完整流程
 */

console.log('='.repeat(50));
console.log('集成测试 - 爬取、存储、去重流程');
console.log('='.repeat(50));
console.log('');

async function runIntegrationTest() {
  try {
    // 1. 初始化存储
    console.log('📦 步骤 1: 初始化存储模块...');
    const storage = new NewsStorage();
    await storage.initialize();
    const initialStats = storage.getStats();
    console.log(`   ✅ 存储初始化成功，已有 ${initialStats.totalNews} 条新闻记录\n`);

    // 2. 爬取新闻
    console.log('🕷️  步骤 2: 爬取新闻...');
    const scraper = new NewsScraper();
    const currentNews = await scraper.fetchNews();
    console.log(`   ✅ 成功爬取 ${currentNews.length} 条新闻\n`);

    if (currentNews.length === 0) {
      console.log('⚠️  未爬取到新闻，测试结束');
      return;
    }

    // 3. 获取新新闻
    console.log('🔍 步骤 3: 检查新新闻...');
    const newNews = await storage.getNewNews(currentNews);
    console.log(`   ✅ 发现 ${newNews.length} 条新新闻\n`);

    if (newNews.length > 0) {
      console.log('📋 新新闻列表：\n');
      newNews.slice(0, 5).forEach((news, index) => {
        console.log(`   ${index + 1}. ${news.title}`);
        console.log(`      链接: ${news.link}`);
        console.log(`      ID: ${news.id}\n`);
      });

      if (newNews.length > 5) {
        console.log(`   ... 还有 ${newNews.length - 5} 条新新闻\n`);
      }

      // 4. 保存新新闻（测试模式，可以选择不保存）
      const saveNews = process.env.TEST_SAVE_NEWS !== 'false';
      if (saveNews) {
        console.log('💾 步骤 4: 保存新新闻到存储...');
        await storage.saveNews(newNews);
        const finalStats = storage.getStats();
        console.log(`   ✅ 保存成功，当前共有 ${finalStats.totalNews} 条新闻记录\n`);
      } else {
        console.log('💾 步骤 4: 跳过保存（测试模式）\n');
      }

      // 5. 验证去重功能
      console.log('🔄 步骤 5: 验证去重功能...');
      const duplicateCheck = await storage.getNewNews(currentNews);
      if (duplicateCheck.length === 0) {
        console.log('   ✅ 去重功能正常，已保存的新闻不会被重复识别\n');
      } else {
        console.log(`   ⚠️  去重可能有问题，仍识别出 ${duplicateCheck.length} 条"新"新闻\n`);
      }
    } else {
      console.log('   ℹ️  没有新新闻，所有新闻都已存在\n');
    }

    // 6. 显示统计信息
    console.log('📊 步骤 6: 统计信息');
    const stats = storage.getStats();
    console.log(`   总新闻数: ${stats.totalNews}`);
    console.log(`   本次爬取: ${currentNews.length} 条`);
    console.log(`   新新闻: ${newNews.length} 条`);
    console.log(`   最后更新: ${stats.lastUpdate || '从未更新'}\n`);

    console.log('='.repeat(50));
    console.log('✅ 集成测试完成！');
    console.log('='.repeat(50));
    console.log('');
    console.log('💡 提示：');
    console.log('   - 如果这是第一次运行，所有新闻都会被识别为新新闻');
    console.log('   - 再次运行此测试，应该不会识别出新新闻（除非网站有新内容）');
    console.log('   - 设置环境变量 TEST_SAVE_NEWS=false 可以跳过保存步骤');

  } catch (error) {
    console.error('❌ 集成测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
runIntegrationTest();

