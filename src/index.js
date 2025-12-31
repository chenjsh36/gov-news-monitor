import dotenv from 'dotenv';
import NewsScheduler from './scheduler.js';

// 加载环境变量
dotenv.config();

/**
 * 主入口文件
 * 初始化应用并启动定时任务
 */

// 读取配置
const config = {
  // 邮件配置
  email: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    fromEmail: process.env.FROM_EMAIL || process.env.SMTP_USER,
    toEmail: process.env.TO_EMAIL
  },
  // 检查频率（分钟数或 cron 表达式）
  checkInterval: process.env.CHECK_INTERVAL || '15',
  // 推送模式：real-time（实时）或 batch（批量）
  pushMode: process.env.PUSH_MODE || 'real-time',
  // 批量推送时间（格式：HH:mm，如 "18:00"）
  batchTime: process.env.BATCH_TIME || '18:00'
};

/**
 * 验证配置
 */
function validateConfig() {
  const required = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'TO_EMAIL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 配置错误：缺少以下必需的环境变量：');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n请参考 .env.example 文件配置环境变量。');
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(50));
  console.log('政府新闻监控推送应用');
  console.log('='.repeat(50));
  console.log('');

  // 验证配置
  validateConfig();

  // 显示配置信息（隐藏敏感信息）
  console.log('📋 配置信息：');
  console.log(`   检查频率: ${config.checkInterval}`);
  console.log(`   推送模式: ${config.pushMode}`);
  if (config.pushMode === 'batch') {
    console.log(`   批量推送时间: ${config.batchTime}`);
  }
  console.log(`   收件人: ${config.email.toEmail}`);
  console.log(`   SMTP服务器: ${config.email.smtpHost}:${config.email.smtpPort}`);
  console.log('');

  try {
    // 创建调度器
    const scheduler = new NewsScheduler(config);

    // 初始化
    await scheduler.initialize();

    // 启动定时任务
    scheduler.start();

    console.log('✅ 应用启动成功！');
    console.log('💡 按 Ctrl+C 停止应用');
    console.log('');

    // 处理优雅退出
    process.on('SIGINT', async () => {
      console.log('\n');
      console.log('⏹️  正在停止应用...');
      
      scheduler.stop();
      
      // 如果使用批量模式且有未发送的新闻，尝试发送
      const status = scheduler.getStatus();
      if (status.batchQueueLength > 0) {
        console.log(`📧 批量队列中还有 ${status.batchQueueLength} 条新闻，尝试发送...`);
        try {
          await scheduler.sendBatchQueue();
        } catch (error) {
          console.error('❌ 发送失败:', error.message);
        }
      }

      console.log('👋 应用已停止');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n收到 SIGTERM 信号，正在停止应用...');
      scheduler.stop();
      process.exit(0);
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('❌ 未捕获的异常:', error);
      scheduler.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ 未处理的 Promise 拒绝:', reason);
      // 不退出进程，记录错误后继续运行
    });

  } catch (error) {
    console.error('❌ 应用启动失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});

