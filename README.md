# Alignment AI - GEO Platform Website

基于 Figma 设计稿创建的 Alignment AI 官网仪表板。

## 📁 项目结构

```
alignment-website/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # 登录页面
│   │   ├── layout.tsx                      # 根布局
│   │   ├── globals.css                     # 全局样式
│   │   └── dashboard/
│   │       ├── layout.tsx                  # 仪表板布局
│   │       ├── signal-intake/page.tsx      # AI Signal Intake 页面
│   │       ├── path-engine/page.tsx        # Path Decision Engine 页面
│   │       └── execution/page.tsx          # Multi-Agent Execution 页面
│   └── components/
│       ├── Sidebar.tsx                     # 左侧导航栏
│       └── Header.tsx                      # 顶部状态栏
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd alignment-website
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看网站

### 3. 构建生产版本

```bash
npm run build
```

构建产物在 `out/` 文件夹中，可直接上传到 Cloudflare Pages。

## 📄 页面说明

| 页面 | 路径 | 说明 |
|------|------|------|
| 登录页 | `/` | 用户登录界面 |
| AI Signal Intake | `/dashboard/signal-intake` | AI平台偏好分析、品牌存在监控 |
| Path Decision Engine | `/dashboard/path-engine` | 候选路径评分、最优路径选择 |
| Multi-Agent Execution | `/dashboard/execution` | 多代理管道、执行日志 |

## 🎨 技术栈

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Icons**: Lucide React

## ☁️ 部署到 Cloudflare Pages

1. 运行 `npm run build`
2. 进入 Cloudflare Dashboard → Workers & Pages
3. 选择您的 `alignmenttech` 项目
4. 上传 `out/` 文件夹
5. 部署完成！

## 📝 License

© 2026 Alignment AI. All rights reserved.
