# JustFinish

Microsoft Todo 智能排序展示层。连接你的 Microsoft Todo，利用大模型对任务进行智能排序和四象限分类，提供简洁美观的展示界面。

## 功能特性

- **三种视图**：按列表层级、全部待办（智能排序）、四象限（艾森豪威尔矩阵）
- **大模型智能排序**：结合任务名称、截止日期、优先级等综合评判重要性和紧急性
- **Delta 增量同步**：列表使用 Microsoft Graph Delta 查询，高效同步
- **完成任务**：一键标记完成，乐观更新，同步到 Microsoft Todo
- **超时提醒**：清晰显示已超时、今天到期、即将到期的任务
- **中英双语**：自动跟随浏览器语言
- **纯前端**：数据缓存在浏览器 IndexedDB 中，无需后端数据库
- **免费部署**：支持 Vercel 和 Cloudflare Pages

## 快速开始

### 1. 注册 Azure AD 应用

1. 访问 [Azure Portal](https://portal.azure.com/) > App registrations > New registration
2. 名称填 `JustFinish`，账户类型选「任何组织目录中的帐户和个人 Microsoft 帐户」
3. 重定向 URI 选「单页应用程序 (SPA)」，填 `http://localhost:5173`
4. 注册后复制 **Application (client) ID**
5. 进入 API permissions > Add a permission > Microsoft Graph > Delegated > `Tasks.ReadWrite`

### 2. 本地开发

```bash
# 克隆项目
git clone <repo-url>
cd JustFinish

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 Client ID

# 启动开发服务器
npm run dev
```

### 3. 配置大模型

在网页右上角设置中配置：
- **API 地址**：如 `https://api.openai.com/v1`
- **API 密钥**：你的 API Key
- **模型名称**：如 `gpt-4o-mini`

支持所有 OpenAI 兼容格式的 API（OpenAI、Together、Groq、Ollama 等）。

## 部署

### Vercel

```bash
npm run build
vercel deploy
```

部署后在 Azure Portal 中添加重定向 URI：`https://your-domain.vercel.app`

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```

部署后在 Azure Portal 中添加重定向 URI：`https://your-domain.pages.dev`

## 技术栈

- Vite + React + TypeScript
- TailwindCSS v4
- @azure/msal-browser（Microsoft OAuth PKCE）
- Zustand（状态管理）
- idb（IndexedDB 封装）

## 许可证

MIT
