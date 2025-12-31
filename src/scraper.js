import * as cheerio from 'cheerio';

const TARGET_URL = 'https://www.gov.cn/yaowen/liebiao/';

/**
 * 新闻爬取模块
 * 负责从政府网站爬取新闻列表
 */
class NewsScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  /**
   * 爬取新闻列表
   * @returns {Promise<Array>} 新闻数组，每个新闻包含 {title, link, publishTime, summary}
   */
  async fetchNews() {
    try {
      console.log(`[Scraper] 开始爬取新闻: ${TARGET_URL}`);
      
      // 使用 AbortController 实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch(TARGET_URL, {
        headers: this.headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const newsList = this.parseNews(html);
      console.log(`[Scraper] 成功爬取 ${newsList.length} 条新闻`);
      
      return newsList;
    } catch (error) {
      console.error('[Scraper] 爬取失败:', error.message);
      
      // 如果是网络错误，提供更友好的错误信息
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到服务器，请检查网络连接');
      }
      
      throw error;
    }
  }

  /**
   * 解析HTML，提取新闻信息
   * @param {string} html - HTML内容
   * @returns {Array} 新闻数组
   */
  parseNews(html) {
    const $ = cheerio.load(html);
    const newsList = [];

    try {
      // 尝试多种选择器，适应网站结构变化
      // 常见的新闻列表选择器
      const selectors = [
        'ul.list li',
        '.news-list li',
        '.list li',
        'div.news-item',
        'article.news'
      ];

      let $items = null;
      for (const selector of selectors) {
        $items = $(selector);
        if ($items.length > 0) {
          console.log(`[Scraper] 使用选择器: ${selector}, 找到 ${$items.length} 个元素`);
          break;
        }
      }

      if (!$items || $items.length === 0) {
        // 如果找不到列表，尝试查找所有链接
        console.log('[Scraper] 未找到标准列表，尝试查找所有新闻链接');
        $items = $('a[href*="/yaowen"]').filter((i, el) => {
          const text = $(el).text().trim();
          return text.length > 10 && text.length < 200; // 过滤掉太短或太长的文本
        });
      }

      $items.each((index, element) => {
        try {
          const $el = $(element);
          const $link = $el.is('a') ? $el : $el.find('a').first();
          
          if ($link.length === 0) return;

          const title = $link.text().trim() || $el.text().trim();
          let link = $link.attr('href') || '';

          // 处理相对链接
          if (link && !link.startsWith('http')) {
            if (link.startsWith('/')) {
              link = `https://www.gov.cn${link}`;
            } else {
              link = `https://www.gov.cn/yaowen/${link}`;
            }
          }

          // 提取发布时间
          let publishTime = '';
          const timeSelectors = ['.time', '.date', 'time', '[datetime]'];
          for (const selector of timeSelectors) {
            const $time = $el.find(selector).first();
            if ($time.length > 0) {
              publishTime = $time.attr('datetime') || $time.text().trim();
              break;
            }
          }

          // 提取摘要
          let summary = '';
          const summarySelectors = ['.summary', '.desc', '.excerpt', 'p'];
          for (const selector of summarySelectors) {
            const $summary = $el.find(selector).first();
            if ($summary.length > 0 && $summary.text().trim()) {
              summary = $summary.text().trim().substring(0, 200); // 限制摘要长度
              break;
            }
          }

          // 验证数据有效性
          if (title && link && title.length > 5) {
            newsList.push({
              title,
              link,
              publishTime: publishTime || new Date().toISOString(),
              summary: summary || '',
              id: this.generateNewsId(title, link) // 生成唯一ID用于去重
            });
          }
        } catch (err) {
          console.warn(`[Scraper] 解析单个新闻项失败:`, err.message);
        }
      });

      // 去重（基于标题和链接）
      const uniqueNews = this.deduplicate(newsList);
      
      return uniqueNews;
    } catch (error) {
      console.error('[Scraper] 解析HTML失败:', error.message);
      throw new Error(`解析失败: ${error.message}`);
    }
  }

  /**
   * 生成新闻唯一ID
   * @param {string} title - 新闻标题
   * @param {string} link - 新闻链接
   * @returns {string} 唯一ID
   */
  generateNewsId(title, link) {
    // 使用标题和链接的组合生成唯一ID
    const combined = `${title}_${link}`;
    // 简单的hash函数
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 去重新闻列表
   * @param {Array} newsList - 新闻列表
   * @returns {Array} 去重后的新闻列表
   */
  deduplicate(newsList) {
    const seen = new Set();
    return newsList.filter(news => {
      const key = news.id || `${news.title}_${news.link}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

export default NewsScraper;

