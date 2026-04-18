# 变更日志

## 2026-04-18

### 优化：Delta 同步并发与单页大小

- **`Prefer: odata.maxpagesize=1000`**：`fetchListsDelta` / `fetchTasksDelta` / `fetchTasks` 每次 `graphFetch` 都附加此请求头，让服务端按自己的上限给满单页、大幅减少 `$skiptoken` 续传次数
  - 选用 `Prefer` 而非 `$top`：参考 [todoTask: delta 官方文档](https://learn.microsoft.com/zh-cn/graph/api/todotask-delta) 的"请求标头"一节，这是 OData 规范下设置单页大小的标准做法；`$top` 语义为"总量上限"对 Delta 容易产生歧义
  - Prefer 是请求头（不会随 `@odata.nextLink` / `@odata.deltaLink` 编码进 URL），循环里每个请求都要带
  - 常量 `DELTA_PAGE_SIZE` / `PREFER_HEADER` 在 `src/services/graph.ts` 顶部，调整改一处即可
- **任务同步改成滑动窗口并发（`useLists.syncLists`）**：原先"3 个一批、等整批完成再下一批"在尾部会退化成"只剩一个清单在串行拉 skiptoken、其他两条通道空着"；现在用 worker 池始终保持 3 个清单在跑，一个完成立刻补下一个，总用时按 CONCURRENCY = 3 充分摊平

### 新增：侧栏清单排序与空清单自动隐藏

- 侧边栏和「按清单分组」视图改用新选择器 `getSidebarLists`，排序规则：
  - `wellknownListName === 'defaultList'` 的清单置顶
  - 其余按未完成任务数降序（`tasksByList[id].length` 即未完成数，缓存层已过滤 `completed`）
  - 相同未完成数的清单保留原拉取顺序（依赖 `Array.sort` 的稳定性）
- 未完成数为 0 的清单（包括 defaultList 本身为空时）默认不展示，不新增开关；用户在「设置 → 清单可见性」里的手动隐藏机制保持不变
- `ByListView` 里原先的 `listsWithTasks` 过滤已被选择器内建，去掉以避免重复逻辑

### 新增：清单可见性（List Visibility）

- 设置弹窗新增「清单可见性」区块，每个清单一个复选框，另提供「全部显示 / 全部隐藏」快捷按钮；勾选即时保存至 localStorage（`justfinish_hidden_lists`）
- 被隐藏的清单**不在侧边栏和三个视图中展示**，且**不参与 LLM 智能排序**，从源头减少无效 token 消耗；任务本身仍按原逻辑同步，底层缓存完整
- Store 层新增派生选择器 `getVisibleLists` / `getVisibleTasks`，`useLLMSort.runSort` / `forceSort` 两处统一使用过滤后的任务集，`computeTaskHash` 自然适配可见集变化，无需改缓存
- 隐藏当前选中的清单时自动把 `selectedListId` 置为 null 回到「全部」，避免空屏
- 清单在 MS 侧被删除（`removeList`）时同步清理 `hiddenListIds` 中对应 id，避免僵尸残留

### 修复：同步按钮直接报错

- **问题**：Microsoft Graph Delta API 的 `deltaLink` 过期后会返回 410 `SyncStateNotFound`，原代码直接抛出导致每次点同步都弹「同步失败」
- **修复**：
  - `graphFetch` 改抛 `GraphError`（携带 HTTP 状态码）
  - `fetchListsDelta` / `fetchTasksDelta` 捕获 410 后清空累计结果、回退到基础 delta 端点自动重试一次，并在返回值中带上 `reset: boolean` 标志
  - `useLists.syncLists` 根据 `reset` 做对账清理：列表层面删除缓存中不在新全量里的 list 及其任务/deltaLink；任务层面先 `deleteTasksByList` 再 upsert，避免服务端已删除的任务在本地成为孤儿

### 修复：刷新页面偶发 `uninitialized_public_client_application`

- **问题**：React 18 StrictMode 下 `useEffect` 双挂载时并发调用 `getMsalInstance()`：第二次调用看到模块变量已被赋值直接返回实例，但此时 `initialize()` 尚未 resolve，后续 `getAllAccounts()` 就抛错
- **修复**：`auth.ts` 改为缓存**初始化 Promise** 而非实例，所有并发调用共享同一个初始化过程；失败时清掉缓存以允许下次重试

### 修复：Sidebar 无限渲染导致主页白屏

- **问题**：`useAppStore((s) => getVisibleLists(s))` 选择器每次执行都 `.filter` 产生新数组引用，触发 zustand `useSyncExternalStore` 无限重渲染
- **修复**：`Sidebar.tsx` / `ByListView.tsx` 改为分别订阅 `lists` 与 `hiddenListIds`，再用 `useMemo` 计算可见清单；依赖是引用稳定的 store 值

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
