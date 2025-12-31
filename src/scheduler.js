import cron from 'node-cron';
import NewsScraper from './scraper.js';
import NewsStorage from './storage.js';
import EmailSender from './email.js';

/**
 * 定时任务模块
 * 负责整合爬取、去重、发送流程
 */
class NewsScheduler {
  constructor(config) {
    this.config = config;
    this.scraper = new NewsScraper();
    this.storage = new NewsStorage();
    this.emailSender = new EmailSender(config.email);
    this.cronJob = null;
    this.batchQueue = []; // 批量模式下的待发送队列
    this.isRunning = false;
  }

  /**
   * 初始化调度器
   */
  async initialize() {
    try {
      console.log('[Scheduler] 初始化调度器...');
      
      // 初始化存储
      await this.storage.initialize();
      
      // 初始化邮件发送器
      await this.emailSender.initialize();
      
      console.log('[Scheduler] 初始化完成');
    } catch (error) {
      console.error('[Scheduler] 初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.cronJob) {
      console.log('[Scheduler] 定时任务已在运行');
      return;
    }

    // 解析检查频率（支持 cron 表达式或分钟数）
    const cronExpression = this.parseCronExpression(this.config.checkInterval);
    
    console.log(`[Scheduler] 启动定时任务，检查频率: ${this.config.checkInterval}`);
    console.log(`[Scheduler] Cron 表达式: ${cronExpression}`);

    // 创建定时任务
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.executeCheck();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    // 如果配置了批量推送时间，启动批量推送任务
    if (this.config.pushMode === 'batch' && this.config.batchTime) {
      this.startBatchScheduler();
    }

    // 启动后立即执行一次检查
    console.log('[Scheduler] 执行首次检查...');
    this.executeCheck();
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[Scheduler] 定时任务已停止');
    }
  }

  /**
   * 执行一次新闻检查
   */
  async executeCheck() {
    if (this.isRunning) {
      console.log('[Scheduler] 上次检查尚未完成，跳过本次检查');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      console.log(`[Scheduler] 开始检查新闻 (${startTime.toLocaleString('zh-CN')})`);

      // 1. 爬取新闻
      const currentNews = await this.scraper.fetchNews();
      
      if (currentNews.length === 0) {
        console.log('[Scheduler] 未爬取到新闻');
        return;
      }

      // 2. 获取新新闻
      const newNews = await this.storage.getNewNews(currentNews);

      if (newNews.length === 0) {
        console.log('[Scheduler] 未发现新新闻');
        return;
      }

      console.log(`[Scheduler] 发现 ${newNews.length} 条新新闻`);

      // 3. 根据推送模式处理
      if (this.config.pushMode === 'real-time') {
        // 实时模式：立即发送
        await this.sendNewsImmediately(newNews);
      } else if (this.config.pushMode === 'batch') {
        // 批量模式：加入队列
        this.addToBatchQueue(newNews);
      } else {
        // 默认实时模式
        await this.sendNewsImmediately(newNews);
      }

      // 4. 保存新新闻到存储
      await this.storage.saveNews(newNews);

      const duration = ((new Date() - startTime) / 1000).toFixed(2);
      console.log(`[Scheduler] 检查完成，耗时 ${duration} 秒`);

    } catch (error) {
      console.error('[Scheduler] 检查过程中发生错误:', error.message);
      // 错误不中断应用，记录日志后继续
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 立即发送新闻
   * @param {Array} newsList - 新闻列表
   */
  async sendNewsImmediately(newsList) {
    try {
      console.log(`[Scheduler] 实时模式：立即发送 ${newsList.length} 条新闻`);
      await this.emailSender.sendEmail(newsList);
      console.log('[Scheduler] 邮件发送成功');
    } catch (error) {
      console.error('[Scheduler] 邮件发送失败:', error.message);
      // 发送失败时，不保存到存储，下次检查时会重试
      throw error;
    }
  }

  /**
   * 添加到批量队列
   * @param {Array} newsList - 新闻列表
   */
  addToBatchQueue(newsList) {
    this.batchQueue.push(...newsList);
    console.log(`[Scheduler] 批量模式：已加入队列，当前队列长度: ${this.batchQueue.length}`);
  }

  /**
   * 启动批量推送调度器
   */
  startBatchScheduler() {
    // 解析批量推送时间（格式：HH:mm，如 "18:00"）
    const [hour, minute] = this.config.batchTime.split(':').map(Number);
    
    if (isNaN(hour) || isNaN(minute)) {
      console.warn('[Scheduler] 批量推送时间格式错误，使用默认时间 18:00');
      return;
    }

    // 创建每天定时发送的任务
    const batchCron = `${minute} ${hour} * * *`;
    console.log(`[Scheduler] 启动批量推送任务，每天 ${this.config.batchTime} 发送`);

    cron.schedule(batchCron, async () => {
      await this.sendBatchQueue();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });
  }

  /**
   * 发送批量队列中的新闻
   */
  async sendBatchQueue() {
    if (this.batchQueue.length === 0) {
      console.log('[Scheduler] 批量队列为空，跳过发送');
      return;
    }

    const newsToSend = [...this.batchQueue];
    this.batchQueue = []; // 清空队列

    try {
      console.log(`[Scheduler] 批量模式：发送 ${newsToSend.length} 条新闻`);
      await this.emailSender.sendEmail(newsToSend);
      console.log('[Scheduler] 批量邮件发送成功');
    } catch (error) {
      console.error('[Scheduler] 批量邮件发送失败:', error.message);
      // 发送失败时，将新闻重新加入队列
      this.batchQueue.unshift(...newsToSend);
    }
  }

  /**
   * 解析 cron 表达式
   * @param {string} interval - 检查间隔（如 "15" 表示15分钟，或 cron 表达式）
   * @returns {string} cron 表达式
   */
  parseCronExpression(interval) {
    // 如果是纯数字，转换为分钟间隔的 cron 表达式
    if (/^\d+$/.test(interval)) {
      const minutes = parseInt(interval, 10);
      if (minutes < 1 || minutes > 59) {
        console.warn(`[Scheduler] 检查间隔 ${minutes} 分钟不在有效范围内，使用默认值 15 分钟`);
        return '*/15 * * * *';
      }
      return `*/${minutes} * * * *`;
    }

    // 如果已经是 cron 表达式，直接返回
    if (cron.validate(interval)) {
      return interval;
    }

    // 无效的表达式，使用默认值
    console.warn(`[Scheduler] 无效的检查间隔配置 "${interval}"，使用默认值 15 分钟`);
    return '*/15 * * * *';
  }

  /**
   * 手动触发一次检查（用于测试）
   */
  async manualCheck() {
    console.log('[Scheduler] 手动触发检查');
    await this.executeCheck();
  }

  /**
   * 获取运行状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      batchQueueLength: this.batchQueue.length,
      storageStats: this.storage.getStats()
    };
  }
}

export default NewsScheduler;

