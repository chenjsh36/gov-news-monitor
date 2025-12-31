# 政府新闻监控推送应用

一个自动化的政府新闻监控和推送工具，定时爬取中国政府网新闻并通过邮件推送新新闻。

## 功能特性

- 🔍 **自动爬取**：定时自动爬取政府网站新闻列表
- 📧 **邮件推送**：发现新新闻后自动发送邮件通知
- 🔄 **智能去重**：自动识别已推送的新闻，避免重复发送
- ⚙️ **灵活配置**：支持实时推送和批量推送两种模式
- 📊 **日志记录**：详细的运行日志，便于监控和调试
- 🛡️ **错误处理**：完善的错误处理机制，确保应用稳定运行

## 技术栈

- **Node.js** (ES Modules, 需要 Node.js 18+)
- **Node.js 内置 fetch** - HTTP 请求（使用 Node.js 18+ 内置的 fetch API）
- **cheerio** - HTML 解析
- **nodemailer** - 邮件发送
- **node-cron** - 定时任务
- **dotenv** - 环境变量管理

## 安装步骤

### 1. 克隆或下载项目

```bash
cd /path/to/your/workspace
```

### 2. 安装依赖

确保已安装 pnpm（如果未安装，运行 `npm install -g pnpm`）：

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 文件为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置信息：

```env
# 邮件服务器配置
SMTP_HOST=smtp.example.com          # SMTP 服务器地址
SMTP_PORT=587                       # SMTP 端口（587 或 465）
SMTP_USER=your_email@example.com   # 发件邮箱账号
SMTP_PASSWORD=your_password        # 发件邮箱密码（或应用专用密码）
FROM_EMAIL=your_email@example.com   # 发件人邮箱（通常与 SMTP_USER 相同）
TO_EMAIL=recipient@example.com      # 收件人邮箱

# 检查频率（分钟数）
CHECK_INTERVAL=15                   # 每15分钟检查一次

# 推送模式
PUSH_MODE=real-time                 # real-time: 实时推送 | batch: 批量推送

# 批量推送时间（仅在 PUSH_MODE=batch 时生效）
BATCH_TIME=18:00                    # 每天 18:00 发送
```

### 4. 邮件服务配置说明

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password  # 需要使用应用专用密码
```

#### QQ 邮箱
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your_email@qq.com
SMTP_PASSWORD=your_auth_code  # 需要使用授权码
```

#### 163 邮箱
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=your_email@163.com
SMTP_PASSWORD=your_auth_code  # 需要使用授权码
```

## 使用方法

### 测试功能

#### 测试爬虫功能

在配置邮件之前，可以先测试爬虫功能是否正常：

```bash
pnpm test-scraper
```

这个命令会：
- 测试能否成功爬取政府网站新闻
- 显示爬取到的新闻示例
- 验证解析逻辑是否正确

#### 集成测试（推荐）

测试完整的爬取、存储、去重流程：

```bash
pnpm test-integration
```

这个命令会：
- 测试爬取功能
- 测试存储和去重功能
- 验证整个流程是否正常
- 显示详细的测试结果和统计信息

**提示**：
- 第一次运行会识别所有新闻为新新闻
- 再次运行应该不会识别出新新闻（除非网站有新内容）
- 设置 `TEST_SAVE_NEWS=false` 可以跳过保存步骤（仅测试）

### 检查配置（推荐首次使用前执行）

在启动应用前，建议先检查配置是否正确：

```bash
pnpm check-config
```

这个命令会验证：
- `.env` 文件是否存在
- 所有必需配置项是否已填写
- 配置值格式是否正确

### 启动应用

```bash
pnpm start
```

应用启动后会自动：
1. 验证配置
2. 初始化存储和邮件服务
3. 立即执行一次新闻检查
4. 启动定时任务（按配置的频率检查）

### 开发模式（自动重启）

```bash
pnpm dev
```

### 停止应用

按 `Ctrl+C` 停止应用。应用会优雅退出，保存当前状态。

## 配置说明

### 检查频率 (CHECK_INTERVAL)

- **数字格式**：如 `15` 表示每15分钟检查一次
- **Cron 表达式**：如 `*/15 * * * *` 表示每15分钟
- **默认值**：`15`（每15分钟）

### 推送模式 (PUSH_MODE)

#### 实时模式 (real-time)
- 发现新新闻后立即发送邮件
- 适合需要及时了解新闻的用户

#### 批量模式 (batch)
- 将新新闻加入队列，按配置的时间统一发送
- 适合希望减少邮件频率的用户
- 需要配置 `BATCH_TIME`（如 `18:00`）

## 项目结构

```
news/
├── package.json          # 项目配置和依赖
├── .env.example          # 环境变量模板
├── .env                  # 实际配置（不提交到 Git）
├── .gitignore           # Git 忽略文件
├── README.md            # 项目文档
├── src/
│   ├── index.js         # 主入口文件
│   ├── scraper.js       # 新闻爬取模块
│   ├── email.js         # 邮件发送模块
│   ├── storage.js       # 数据存储模块
│   └── scheduler.js     # 定时任务模块
└── data/
    └── news.json         # 已推送新闻记录（自动生成）
```

## 邮件格式

邮件采用 HTML 格式，包含：
- 新闻标题（可点击链接）
- 发布时间
- 新闻摘要（如有）
- 查看原文链接

邮件样式美观，支持移动端查看。

## 常见问题

### 1. 邮件发送失败

**可能原因：**
- SMTP 配置错误（服务器地址、端口、账号密码）
- 邮箱未开启 SMTP 服务
- 使用了错误的密码（需要使用应用专用密码或授权码）

**解决方法：**
- 检查 `.env` 文件中的配置是否正确
- 确认邮箱已开启 SMTP 服务
- 对于 Gmail/QQ/163 等邮箱，使用应用专用密码或授权码

### 2. 爬取不到新闻

**可能原因：**
- 网络连接问题
- 网站结构发生变化
- 网站有反爬虫机制

**解决方法：**
- 检查网络连接
- 查看控制台日志了解详细错误信息
- 如果网站结构变化，可能需要更新 `scraper.js` 中的选择器

### 3. 应用无法启动

**可能原因：**
- 缺少必需的环境变量
- Node.js 版本不兼容
- 依赖未安装

**解决方法：**
- 检查 `.env` 文件是否配置完整
- 确认 Node.js 版本 >= 16
- 运行 `pnpm install` 安装依赖

### 4. 重复收到相同新闻

**可能原因：**
- `data/news.json` 文件损坏或丢失
- 新闻 ID 生成逻辑变化

**解决方法：**
- 删除 `data/news.json` 文件（会重新开始记录）
- 检查存储模块的 ID 生成逻辑

## 日志说明

应用运行时会输出详细的日志信息：

- `[Scraper]` - 新闻爬取相关日志
- `[Storage]` - 数据存储相关日志
- `[Email]` - 邮件发送相关日志
- `[Scheduler]` - 定时任务相关日志

## 数据存储

已推送的新闻存储在 `data/news.json` 文件中，用于去重判断。该文件会自动创建和管理。

## 注意事项

1. **遵守网站规则**：请遵守目标网站的 robots.txt 和使用条款
2. **请求频率**：默认每15分钟检查一次，避免过于频繁的请求
3. **数据安全**：`.env` 文件包含敏感信息，不要提交到代码仓库
4. **网络环境**：确保运行环境能够访问目标网站和 SMTP 服务器

## 后续扩展

- [ ] 支持多种推送方式（微信、Telegram 等）
- [ ] 支持数据库存储（SQLite/PostgreSQL）
- [ ] Web 管理界面
- [ ] 新闻关键词过滤
- [ ] 多用户支持
- [ ] 新闻摘要自动提取

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本
- 支持自动爬取和邮件推送
- 支持实时和批量两种推送模式
- 完善的错误处理和日志记录

