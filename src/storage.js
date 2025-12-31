import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');

/**
 * 数据存储模块
 * 负责管理已推送新闻的存储和去重
 */
class NewsStorage {
  constructor() {
    this.newsData = {
      news: [],
      lastUpdate: null
    };
    this.initialized = false;
  }

  /**
   * 初始化存储，确保数据目录和文件存在
   */
  async initialize() {
    try {
      // 确保数据目录存在
      await fs.mkdir(DATA_DIR, { recursive: true });

      // 尝试加载已有数据
      try {
        const data = await fs.readFile(NEWS_FILE, 'utf-8');
        this.newsData = JSON.parse(data);
        console.log(`[Storage] 加载了 ${this.newsData.news.length} 条已存储的新闻`);
      } catch (error) {
        // 文件不存在或格式错误，使用默认值
        console.log('[Storage] 未找到已有数据，创建新文件');
        this.newsData = {
          news: [],
          lastUpdate: null
        };
        await this.save();
      }

      this.initialized = true;
    } catch (error) {
      console.error('[Storage] 初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 加载已存储的新闻
   * @returns {Array} 已存储的新闻列表
   */
  async loadNews() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.newsData.news;
  }

  /**
   * 保存新闻到存储
   * @param {Array} newsList - 要保存的新闻列表
   */
  async saveNews(newsList) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!Array.isArray(newsList) || newsList.length === 0) {
      return;
    }

    // 合并新新闻到已有列表
    const existingIds = new Set(this.newsData.news.map(n => n.id));
    const newNews = newsList.filter(n => !existingIds.has(n.id));

    if (newNews.length > 0) {
      this.newsData.news = [...this.newsData.news, ...newNews];
      this.newsData.lastUpdate = new Date().toISOString();
      await this.save();
      console.log(`[Storage] 保存了 ${newNews.length} 条新新闻`);
    }
  }

  /**
   * 判断新闻是否为新新闻
   * @param {Object} newsItem - 新闻项 {id, title, link}
   * @returns {boolean} 是否为新新闻
   */
  async isNew(newsItem) {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = newsItem.id || this.generateId(newsItem.title, newsItem.link);
    return !this.newsData.news.some(n => n.id === id);
  }

  /**
   * 获取新新闻列表（与已存储的新闻对比）
   * @param {Array} currentNews - 当前爬取的新闻列表
   * @param {Array} storedNews - 已存储的新闻列表（可选，如果不提供则自动加载）
   * @returns {Array} 新新闻列表
   */
  async getNewNews(currentNews, storedNews = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const stored = storedNews || this.newsData.news;
    const storedIds = new Set(stored.map(n => n.id));

    const newNews = currentNews.filter(news => {
      const id = news.id || this.generateId(news.title, news.link);
      return !storedIds.has(id);
    });

    return newNews;
  }

  /**
   * 生成新闻ID（与scraper中的方法保持一致）
   * @param {string} title - 新闻标题
   * @param {string} link - 新闻链接
   * @returns {string} 唯一ID
   */
  generateId(title, link) {
    const combined = `${title}_${link}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 保存数据到文件
   */
  async save() {
    try {
      await fs.writeFile(NEWS_FILE, JSON.stringify(this.newsData, null, 2), 'utf-8');
    } catch (error) {
      console.error('[Storage] 保存数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalNews: this.newsData.news.length,
      lastUpdate: this.newsData.lastUpdate
    };
  }

  /**
   * 清理旧数据（可选功能，保留最近N条）
   * @param {number} keepCount - 保留的新闻数量
   */
  async cleanup(keepCount = 1000) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.newsData.news.length > keepCount) {
      // 保留最新的N条
      this.newsData.news = this.newsData.news.slice(-keepCount);
      await this.save();
      console.log(`[Storage] 清理完成，保留最新 ${keepCount} 条新闻`);
    }
  }
}

export default NewsStorage;

