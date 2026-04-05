# 变更日志

## 2026-04-05

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
