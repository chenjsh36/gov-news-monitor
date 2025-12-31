import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config();

/**
 * 配置检查脚本
 * 用于验证环境变量配置是否正确
 */

console.log('='.repeat(50));
console.log('配置检查工具');
console.log('='.repeat(50));
console.log('');

// 检查 .env 文件是否存在
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env 文件不存在');
  console.log('💡 请复制 .env.example 为 .env 并配置：');
  console.log('   cp .env.example .env');
  console.log('');
  process.exit(1);
}

console.log('✅ .env 文件存在');
console.log('');

// 检查必需的配置项
const required = [
  { key: 'SMTP_HOST', name: 'SMTP 服务器地址' },
  { key: 'SMTP_PORT', name: 'SMTP 端口' },
  { key: 'SMTP_USER', name: 'SMTP 用户名' },
  { key: 'SMTP_PASSWORD', name: 'SMTP 密码' },
  { key: 'TO_EMAIL', name: '收件人邮箱' }
];

const optional = [
  { key: 'FROM_EMAIL', name: '发件人邮箱', default: 'SMTP_USER' },
  { key: 'CHECK_INTERVAL', name: '检查频率', default: '15' },
  { key: 'PUSH_MODE', name: '推送模式', default: 'real-time' },
  { key: 'BATCH_TIME', name: '批量推送时间', default: '18:00' }
];

let hasError = false;

console.log('📋 必需配置项：');
required.forEach(({ key, name }) => {
  const value = process.env[key];
  if (!value) {
    console.log(`   ❌ ${key} (${name}): 未配置`);
    hasError = true;
  } else {
    // 隐藏敏感信息
    const displayValue = key === 'SMTP_PASSWORD' 
      ? '*'.repeat(Math.min(value.length, 10))
      : value;
    console.log(`   ✅ ${key} (${name}): ${displayValue}`);
  }
});

console.log('');
console.log('📋 可选配置项：');
optional.forEach(({ key, name, default: defaultValue }) => {
  const value = process.env[key] || defaultValue;
  const displayValue = key === 'BATCH_TIME' ? value : value;
  const status = process.env[key] ? '✅' : '⚪';
  console.log(`   ${status} ${key} (${name}): ${displayValue}${!process.env[key] ? ' (使用默认值)' : ''}`);
});

console.log('');

// 验证配置值
if (!hasError) {
  console.log('🔍 配置验证：');
  
  // 验证端口号
  const port = parseInt(process.env.SMTP_PORT, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.log('   ❌ SMTP_PORT 必须是有效的端口号 (1-65535)');
    hasError = true;
  } else {
    console.log('   ✅ SMTP_PORT 格式正确');
  }

  // 验证邮箱格式（简单验证）
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  ['SMTP_USER', 'TO_EMAIL', 'FROM_EMAIL'].forEach(key => {
    const value = process.env[key];
    if (value && !emailRegex.test(value)) {
      console.log(`   ⚠️  ${key} 邮箱格式可能不正确: ${value}`);
    } else if (value) {
      console.log(`   ✅ ${key} 邮箱格式正确`);
    }
  });

  // 验证推送模式
  const pushMode = process.env.PUSH_MODE || 'real-time';
  if (!['real-time', 'batch'].includes(pushMode)) {
    console.log(`   ❌ PUSH_MODE 必须是 'real-time' 或 'batch'，当前值: ${pushMode}`);
    hasError = true;
  } else {
    console.log(`   ✅ PUSH_MODE 配置正确: ${pushMode}`);
  }

  // 验证批量推送时间格式
  if (pushMode === 'batch') {
    const batchTime = process.env.BATCH_TIME || '18:00';
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(batchTime)) {
      console.log(`   ❌ BATCH_TIME 格式错误，应为 HH:mm，当前值: ${batchTime}`);
      hasError = true;
    } else {
      console.log(`   ✅ BATCH_TIME 格式正确: ${batchTime}`);
    }
  }
}

console.log('');

if (hasError) {
  console.log('❌ 配置检查失败，请修复上述问题后重试');
  console.log('');
  console.log('💡 提示：');
  console.log('   1. 检查 .env 文件中的配置');
  console.log('   2. 参考 .env.example 文件了解配置格式');
  console.log('   3. 确保所有必需配置项都已填写');
  process.exit(1);
} else {
  console.log('✅ 配置检查通过！');
  console.log('');
  console.log('🚀 可以启动应用了：');
  console.log('   pnpm start');
  console.log('');
}

