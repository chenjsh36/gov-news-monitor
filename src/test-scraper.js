import NewsScraper from './scraper.js';

/**
 * 测试爬虫模块
 * 用于验证爬虫功能是否正常工作
 */

console.log('='.repeat(50));
console.log('测试爬虫模块');
console.log('='.repeat(50));
console.log('');

const scraper = new NewsScraper();

try {
  console.log('开始爬取新闻...\n');
  const newsList = await scraper.fetchNews();
  
  console.log(`✅ 成功爬取 ${newsList.length} 条新闻\n`);
  
  if (newsList.length > 0) {
    console.log('前 5 条新闻示例：\n');
    newsList.slice(0, 5).forEach((news, index) => {
      console.log(`${index + 1}. ${news.title}`);
      console.log(`   链接: ${news.link}`);
      console.log(`   时间: ${news.publishTime}`);
      console.log(`   ID: ${news.id}`);
      if (news.summary) {
        console.log(`   摘要: ${news.summary.substring(0, 50)}...`);
      }
      console.log('');
    });
    
    console.log(`\n总共爬取 ${newsList.length} 条新闻`);
    console.log('✅ 爬虫测试通过！');
  } else {
    console.log('⚠️  未爬取到新闻，可能需要检查网站结构或选择器');
  }
  
} catch (error) {
  console.error('❌ 爬取失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}

