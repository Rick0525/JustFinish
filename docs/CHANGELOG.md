# 变更日志

## v1.0.0 (2026-04-05)

### 代码审查修复（第二轮）

- 删除列表时同步清理该列表下的任务缓存，修复重启后"幽灵任务"问题
- `syncTasks` 返回失败计数，部分列表同步失败时状态正确显示为 error 而非 success
- `graphFetch` 兼容 204 No Content 及空响应体，避免 JSON 解析报错
- `computeTaskHash` 加入 `importance` 字段，优先级变化后不再命中旧 LLM 缓存

### 代码审查修复（第一轮）

- 任务完成乐观更新回滚时同步恢复 IndexedDB 缓存，避免刷新后任务丢失
- 同步成功后的 idle 定时器改用 ref 管理，新同步前清理旧定时器，修复竞态覆盖
- 闪电排序按钮改用 `forceSort`（跳过缓存），点击即触发 LLM 请求
- 修复 lint 错误：空 `interface Env {}` 改为 `type Env`，空 catch 加注释

## 2026-04-05（早期）

### 修复 MSAL v5 弹窗登录回调

- **问题**：微软登录弹窗认证成功后，弹窗卡在"正在处理登录..."，父窗口无法获取认证结果
- **根因**：MSAL v5 使用 `BroadcastChannel` API 在弹窗和父窗口间通信，弹窗回调页面需要调用 `broadcastResponseToMainFrame()` 将授权码发回父窗口
- **修复**：在 `src/main.tsx` 中检测弹窗回调 URL（含 `#code=`），调用 `@azure/msal-browser/redirect-bridge` 导出的 `broadcastResponseToMainFrame()`

### 大模型供应商统一管理 + 代理安全加固

- 新建 `src/utils/llmProviders.ts`，统一定义 14 个供应商（含智谱 AI）的 ID、名称、baseUrl、允许域名
- `LLMConfig.endpoint`（自由文本）改为 `LLMConfig.providerId`（供应商 ID），endpoint 由 `getProviderById()` 动态解析
- 设置弹窗中 API 地址输入框改为下拉选择器，选中后显示对应 base URL
- 三个代理文件（Vercel / Cloudflare / Vite dev）统一从 `llmProviders.ts` 导入 `isAllowedUrl()` 校验白名单
- 白名单校验改为精确域名匹配（移除 `.endsWith` 子域名匹配，防止 SSRF 绕过）

### 代码质量审查与修复

- `innerHTML` 改为 `textContent`，消除潜在 XSS 隐患
- 11 处 `catch {}` 静默错误全部加上 `console.error` 并附带模块标签
- LLM 响应增加 JSON 解析 try-catch 和 OpenAI 兼容响应结构校验
- 任务完成的乐观更新增加 Zustand 快照保存，API 失败时立即恢复快照再异步刷新
