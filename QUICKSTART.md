# 快速开始指南

## 5 分钟快速上手

### 1. 安装依赖（已完成）

```bash
pnpm install
```

### 2. 测试爬虫功能

验证能否正常爬取新闻：

```bash
pnpm test-scraper
```

如果看到成功爬取新闻的提示，说明爬虫功能正常。

### 3. 配置邮件服务

复制配置模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的邮件配置：

```env
# 邮件服务器配置（以 Gmail 为例）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password  # Gmail 需要使用应用专用密码
FROM_EMAIL=your_email@gmail.com
TO_EMAIL=recipient@example.com

# 其他配置使用默认值即可
CHECK_INTERVAL=15
PUSH_MODE=real-time
```

**常见邮箱配置：**

#### Gmail
- 需要开启"两步验证"
- 生成"应用专用密码"作为 SMTP_PASSWORD
- SMTP_HOST: `smtp.gmail.com`
- SMTP_PORT: `587`

#### QQ 邮箱
- 需要开启 SMTP 服务
- 使用"授权码"作为 SMTP_PASSWORD
- SMTP_HOST: `smtp.qq.com`
- SMTP_PORT: `587`

#### 163 邮箱
- 需要开启 SMTP 服务
- 使用"授权码"作为 SMTP_PASSWORD
- SMTP_HOST: `smtp.163.com`
- SMTP_PORT: `465`

### 4. 检查配置

验证配置是否正确：

```bash
pnpm check-config
```

如果看到 "✅ 配置检查通过！"，说明配置正确。

### 5. 启动应用

```bash
pnpm start
```

应用会：
1. 立即执行一次新闻检查
2. 如果发现新新闻，会立即发送邮件（实时模式）
3. 然后每 15 分钟自动检查一次

### 6. 查看运行状态

应用运行时会输出详细日志：

```
[Scheduler] 开始检查新闻
[Scraper] 成功爬取 20 条新闻
[Scheduler] 发现 2 条新新闻
[Email] 邮件发送成功
```

### 停止应用

按 `Ctrl+C` 停止应用。

## 推送模式说明

### 实时模式（默认）

- 发现新新闻立即发送邮件
- 适合需要及时了解新闻的用户

配置：
```env
PUSH_MODE=real-time
```

### 批量模式

- 累积新新闻，按设定时间统一发送
- 适合希望减少邮件频率的用户

配置：
```env
PUSH_MODE=batch
BATCH_TIME=18:00  # 每天 18:00 发送
```

## 常见问题

### Q: 邮件发送失败？

**A:** 检查以下几点：
1. SMTP 配置是否正确
2. 邮箱是否开启了 SMTP 服务
3. 密码是否正确（Gmail/QQ/163 需要使用应用专用密码或授权码）
4. 网络连接是否正常

### Q: 爬取不到新闻？

**A:** 
1. 检查网络连接
2. 运行 `pnpm test-scraper` 查看详细错误信息
3. 可能是网站结构变化，需要更新选择器

### Q: 如何修改检查频率？

**A:** 编辑 `.env` 文件中的 `CHECK_INTERVAL`：
- 数字格式：`15` 表示每 15 分钟
- Cron 表达式：`*/15 * * * *` 表示每 15 分钟

### Q: 如何查看已推送的新闻？

**A:** 查看 `data/news.json` 文件，包含所有已推送的新闻记录。

### Q: 如何重置（清空已推送记录）？

**A:** 删除 `data/news.json` 文件，应用会重新开始记录。

## 下一步

- 查看 [README.md](README.md) 了解详细功能
- 查看项目结构了解代码组织
- 根据需要调整配置和代码

## 技术支持

如遇问题，请检查：
1. Node.js 版本 >= 18
2. 所有依赖已正确安装
3. 配置文件格式正确
4. 网络连接正常

