import nodemailer from 'nodemailer';

/**
 * 邮件发送模块
 * 负责发送新闻通知邮件
 */
class EmailSender {
  constructor(config) {
    this.config = config;
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * 初始化邮件发送器
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // 验证配置
      this.validateConfig();

      // 创建邮件传输器
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword
        }
      });

      // 验证连接
      await this.transporter.verify();
      console.log('[Email] SMTP 连接验证成功');
      
      this.initialized = true;
    } catch (error) {
      console.error('[Email] 初始化失败:', error.message);
      throw new Error(`邮件配置错误: ${error.message}`);
    }
  }

  /**
   * 验证邮件配置
   */
  validateConfig() {
    const required = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'toEmail'];
    const missing = required.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new Error(`缺少必需的邮件配置: ${missing.join(', ')}`);
    }
  }

  /**
   * 发送邮件
   * @param {Array} newsList - 新闻列表
   * @param {string} subject - 邮件主题（可选）
   * @returns {Promise<Object>} 发送结果
   */
  async sendEmail(newsList, subject = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!Array.isArray(newsList) || newsList.length === 0) {
      throw new Error('新闻列表为空');
    }

    try {
      const emailSubject = subject || this.generateSubject(newsList);
      const htmlContent = this.generateHtmlContent(newsList);
      const textContent = this.generateTextContent(newsList);

      const mailOptions = {
        from: this.config.fromEmail || this.config.smtpUser,
        to: this.config.toEmail,
        subject: emailSubject,
        text: textContent,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] 邮件发送成功: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        newsCount: newsList.length
      };
    } catch (error) {
      console.error('[Email] 邮件发送失败:', error.message);
      throw new Error(`发送失败: ${error.message}`);
    }
  }

  /**
   * 生成邮件主题
   * @param {Array} newsList - 新闻列表
   * @returns {string} 邮件主题
   */
  generateSubject(newsList) {
    const count = newsList.length;
    const time = new Date().toLocaleString('zh-CN');
    return `【政府新闻推送】发现 ${count} 条新新闻 - ${time}`;
  }

  /**
   * 生成HTML格式的邮件内容
   * @param {Array} newsList - 新闻列表
   * @returns {string} HTML内容
   */
  generateHtmlContent(newsList) {
    const time = new Date().toLocaleString('zh-CN');
    
    let newsItemsHtml = '';
    newsList.forEach((news, index) => {
      const publishTime = news.publishTime 
        ? new Date(news.publishTime).toLocaleString('zh-CN')
        : '未知时间';
      
      const summary = news.summary 
        ? `<p style="color: #666; font-size: 14px; margin-top: 5px;">${this.escapeHtml(news.summary)}</p>`
        : '';

      newsItemsHtml += `
        <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">
            <a href="${this.escapeHtml(news.link)}" style="color: #1890ff; text-decoration: none;">
              ${this.escapeHtml(news.title)}
            </a>
          </h3>
          <p style="color: #999; font-size: 12px; margin: 5px 0;">发布时间: ${publishTime}</p>
          ${summary}
          <p style="margin-top: 10px;">
            <a href="${this.escapeHtml(news.link)}" style="color: #1890ff; text-decoration: none; font-size: 14px;">
              查看原文 →
            </a>
          </p>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px;">政府新闻推送</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">发现 ${newsList.length} 条新新闻</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">${time}</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
          ${newsItemsHtml}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
          <p>此邮件由政府新闻监控系统自动发送</p>
          <p>数据来源: <a href="https://www.gov.cn/yaowen/liebiao/" style="color: #1890ff;">中国政府网</a></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成纯文本格式的邮件内容
   * @param {Array} newsList - 新闻列表
   * @returns {string} 文本内容
   */
  generateTextContent(newsList) {
    const time = new Date().toLocaleString('zh-CN');
    let content = `政府新闻推送\n`;
    content += `发现 ${newsList.length} 条新新闻\n`;
    content += `更新时间: ${time}\n\n`;
    content += `${'='.repeat(50)}\n\n`;

    newsList.forEach((news, index) => {
      const publishTime = news.publishTime 
        ? new Date(news.publishTime).toLocaleString('zh-CN')
        : '未知时间';

      content += `${index + 1}. ${news.title}\n`;
      content += `   发布时间: ${publishTime}\n`;
      if (news.summary) {
        content += `   摘要: ${news.summary}\n`;
      }
      content += `   链接: ${news.link}\n\n`;
    });

    content += `${'='.repeat(50)}\n`;
    content += `数据来源: https://www.gov.cn/yaowen/liebiao/\n`;

    return content;
  }

  /**
   * HTML转义
   * @param {string} text - 原始文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

export default EmailSender;

