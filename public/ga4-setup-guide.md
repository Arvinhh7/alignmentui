# GA4 AI Attribution 接入指南（供客户使用）

## 概述

本指南帮助 Alignment AI 客户将网站的 GA4（Google Analytics 4）与 AI 流量归因功能打通。  
完成后，你将在 Alignment 控制台看到：
- 来自 ChatGPT、Perplexity、Gemini 等 AI 平台的真实流量
- 每个 Prompt 对应的转化率和收入归因
- GEO 优化前后的效果对比

---

## 步骤 1：在 GA4 中创建自定义维度

在 GA4 后台 → **管理 → 媒体资源 → 自定义定义 → 自定义维度 → 创建**

创建以下两个 **事件级（Event-scoped）** 自定义维度：

| 维度名（Display Name） | 事件参数（Event parameter） | 范围（Scope） |
|----------------------|---------------------------|-------------|
| AI Platform          | `ai_platform`             | Event       |
| AI Referral          | `ai_referral`             | Event       |

> 注意：创建后需 24-48 小时生效，之后才能在报告中筛选这些维度。

---

## 步骤 2：在网站 GA4 中配置转化事件

GA4 后台 → **管理 → 媒体资源 → 事件 → 将以下事件标记为转化**

| 事件名              | 说明             |
|--------------------|------------------|
| `ai_session_start` | AI 平台来源会话开始 |
| `purchase`         | 购买转化          |
| `sign_up`          | 注册转化          |
| `generate_lead`    | 潜客线索           |

---

## 步骤 3：在网站上安装 Alignment 追踪脚本

在你的网站 HTML 的 `</body>` 标签前，加入以下代码：

```html
<!-- 先加载 GA4（替换为你的真实 Measurement ID） -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
  window._ga4MeasurementId = 'G-XXXXXXXXXX'; // 供 Alignment 脚本使用
</script>

<!-- Alignment AI 追踪脚本（放在 GA4 脚本之后） -->
<script src="https://alignmenttech.ai/alignment-ga4-tracker.js"></script>
```

> 将 `G-XXXXXXXXXX` 替换为你 GA4 媒体资源的真实 Measurement ID。

---

## 步骤 4：在 Alignment 控制台绑定 GA4

1. 登录 [alignmenttech.ai](https://alignmenttech.ai)
2. 进入 **GA4 Attribution** → **Connect GA4**
3. 输入你的 **GA4 Property ID**（格式：`123456789`，在 GA4 管理 → 媒体资源详情中找到）
4. 上传或配置 **Service Account JSON**（详见下方说明）

---

## 步骤 5：配置 Service Account（允许 Alignment 读取 GA4 数据）

**在 Google Cloud Console 操作：**

1. 访问：[https://console.cloud.google.com/](https://console.cloud.google.com/)
2. 新建或选择项目 → **API 和服务 → 启用 API → 启用 Google Analytics Data API**
3. **IAM 和管理 → 服务账号 → 创建服务账号**
   - 名称：`alignment-ga4-reader`
   - 不需要分配 GCP 角色
4. 在服务账号详情页 → **密钥 → 添加密钥 → JSON**，下载 JSON 文件

**在 GA4 后台操作：**

1. GA4 → **管理 → 账号访问权限管理 → 添加用户**
2. 输入服务账号邮箱（格式：`alignment-ga4-reader@your-project.iam.gserviceaccount.com`）
3. 角色选择：**查看者（Viewer）** ← 最小权限即可

**在 Alignment 控制台上传：**

将下载的 JSON 文件上传到 GA4 Attribution → Connect GA4 页面。

---

## 能看到的数据（接入后 24-48 小时开始显示）

| 指标 | 说明 |
|------|------|
| AI 平台流量 | ChatGPT / Perplexity / Gemini 等带来的会话数和用户数 |
| AI 来源转化率 | AI 流量 → 注册 / 购买的转化比例 |
| AI 来源收入 | AI 平台带来的实际收入金额 |
| Prompt ROI | 哪些 GEO 监控的 Prompt 带来了最高收入 |
| 优化前后对比 | GEO 优化动作前后的 AI 流量和转化变化 |

---

## 测试验证

接入完成后，可以这样测试：

1. 打开 ChatGPT，搜索你的品牌或相关关键词
2. 点击 ChatGPT 回答中你网站的链接
3. 访问你的网站并完成一个操作（注册/购买等）
4. 在 GA4 **实时报告** 中查看事件，确认 `ai_session_start` 和 `ai_platform = ChatGPT` 出现

---

## 常见问题

**Q: AI 平台来源在 GA4 标准报告中看不到？**  
A: GA4 默认将部分 AI 平台列为 `direct`（无 referrer）。Alignment 追踪脚本在点击发生时会捕获来源，因此需通过 Alignment 控制台而非 GA4 原生报告查看详细分类。

**Q: 是否会影响网站性能？**  
A: Alignment 追踪脚本仅 ~3KB，异步执行，不阻塞页面渲染。

**Q: 数据安全如何保障？**  
A: Service Account 仅有 GA4 只读权限（查看者角色），无法修改数据，也无法访问 Google Ads 或其他 Google 服务。
