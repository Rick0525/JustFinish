# 架构文档

## 项目概述

JustFinish 是一个 Microsoft Todo 智能排序展示层。连接用户的 Microsoft Todo，利用大模型对任务进行智能排序和四象限分类。纯静态 SPA，无后端数据库，所有数据缓存在浏览器中。

## 技术栈

- **Vite + React + TypeScript** — 构建与前端框架
- **TailwindCSS v4** — 样式（通过 Vite 插件）
- **@azure/msal-browser v5** — Microsoft OAuth PKCE 认证
- **Zustand** — 轻量状态管理
- **idb** — IndexedDB 封装，浏览器端数据缓存
- **i18n** — 自实现，中英双语，跟随浏览器语言

## 目录结构

```
src/
├── main.tsx                    # 入口，处理 MSAL 弹窗回调
├── App.tsx                     # 根组件，认证门控
├── components/                 # UI 组件
│   ├── Layout.tsx              # 主布局（侧边栏 + 内容区）
│   ├── Sidebar.tsx             # 视图切换 + 列表导航
│   ├── ByListView.tsx          # 按列表分组视图
│   ├── AllTodosView.tsx        # 全部待办（智能排序）
│   ├── QuadrantView.tsx        # 四象限视图
│   ├── TaskItem.tsx            # 任务行
│   ├── TaskList.tsx            # 任务列表渲染
│   ├── DueBadge.tsx            # 截止日期标识
│   ├── SettingsModal.tsx       # 设置弹窗（供应商选择式）
│   ├── LoginScreen.tsx         # 登录页
│   └── SyncIndicator.tsx       # 同步状态指示器
├── services/                   # 外部服务交互
│   ├── auth.ts                 # MSAL 认证
│   ├── graph.ts                # Microsoft Graph API
│   ├── llm.ts                  # 大模型 API 客户端
│   └── cache.ts                # IndexedDB 缓存
├── hooks/                      # React Hooks
│   ├── useLists.ts             # 列表 Delta 同步
│   ├── useTasks.ts             # 任务获取与完成
│   ├── useLLMSort.ts           # 大模型排序
│   └── useSettings.ts          # 配置管理
├── stores/
│   └── appStore.ts             # Zustand 全局状态
├── types/
│   └── index.ts                # 类型定义
├── i18n/                       # 国际化
│   ├── index.ts                # useT() hook
│   ├── zh.ts                   # 中文
│   └── en.ts                   # 英文
└── utils/
    ├── constants.ts            # 常量
    ├── dates.ts                # 日期工具
    ├── quadrant.ts             # 四象限分类
    └── llmProviders.ts         # 大模型供应商定义与白名单
```

## 关键设计决策

### MSAL v5 弹窗认证

MSAL v5 使用 `BroadcastChannel` API 进行弹窗与父窗口的通信（非旧版的 URL 轮询）。弹窗回调页面必须调用 `broadcastResponseToMainFrame()`（从 `@azure/msal-browser/redirect-bridge` 导出）来完成认证流程。

### 大模型供应商白名单

所有供应商定义集中在 `src/utils/llmProviders.ts`，前端设置界面和三个代理函数（Vercel / Cloudflare / Vite dev）共用同一数据源。代理仅允许精确域名匹配（无子域名通配），防止 SSRF。

### 数据流

```
启动 → 从 IndexedDB 读缓存 → 填充 Zustand → 立即渲染
    → 后台 Delta 同步列表 → 获取任务 → 更新缓存 + 状态
    → 任务变化 + 已配置大模型 → 调用 LLM 排序（仅可见清单）→ 缓存分数 → 重新渲染
```

### 清单可见性

- 用户在设置弹窗中勾选要隐藏的清单，隐藏 id 列表存在 localStorage（`justfinish_hidden_lists`）并镜像到 Zustand 的 `hiddenListIds`
- Store 暴露派生选择器 `getVisibleLists` / `getVisibleTasks`，侧边栏、三个视图、LLM 排序统一使用
- 隐藏策略：UI 不展示 + 排除出 LLM 输入；任务本身仍正常 Delta 同步，localStorage 设置不跨设备

### Delta 同步的 410 自恢复

- Graph Delta API 在 `deltaLink` 过期时返回 410 `SyncStateNotFound`，需要从基础端点重新发起一次「全量 delta」
- `graphFetch` 抛出带 HTTP 状态的 `GraphError`；`fetchListsDelta` / `fetchTasksDelta` 内部捕获 410 后自动回退端点重试并在结果里标记 `reset: true`
- 调用方 `useLists.syncLists` 见到 `reset` 时做对账清理：列表层面删除缓存中不在新全量里的 list 和其任务/deltaLink；任务层面先清空该 list 的本地任务再 upsert，防止服务端已删除的任务在本地成孤儿

### MSAL 并发初始化

- `auth.getMsalInstance()` 缓存的是初始化 Promise 而非实例，避免 React StrictMode 双挂载下第二次调用在 `initialize()` 未完成时就拿到实例

### 部署架构

- **Vercel**: `api/llm.ts` — Serverless Function 代理
- **Cloudflare Pages**: `functions/api/llm.ts` — Pages Function 代理
- **本地开发**: `vite.config.ts` — Vite dev server 中间件代理
