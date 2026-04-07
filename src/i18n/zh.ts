export const zh = {
  // 应用标题
  appName: 'JustFinish',

  // 登录页
  loginTitle: '连接你的 Microsoft Todo',
  loginDesc: '使用大模型智能排序，让你的待办事项更清晰',
  loginButton: '使用微软账号登录',
  loginNeedClientId: '请先在设置中配置 Azure AD Client ID',

  // 视图模式
  viewByList: '按列表',
  viewAllTodos: '全部待办',
  viewQuadrant: '四象限',

  // 四象限
  quadrantDoFirst: '立即执行',
  quadrantDoFirstDesc: '紧急且重要',
  quadrantSchedule: '计划安排',
  quadrantScheduleDesc: '重要不紧急',
  quadrantDelegate: '委托他人',
  quadrantDelegateDesc: '紧急不重要',
  quadrantLater: '稍后处理',
  quadrantLaterDesc: '不紧急不重要',

  // 任务
  taskOverdue: '已超时',
  taskToday: '今天',
  taskTomorrow: '明天',
  taskComplete: '标记完成',
  taskCompleting: '完成中...',
  noTasks: '没有待办事项',

  // 设置
  settings: '设置',
  settingsLLM: '大模型配置',
  settingsLLMProvider: 'API 供应商',
  settingsLLMProviderPlaceholder: '选择供应商',
  settingsLLMCustomDirect: '自定义（直连）',
  settingsLLMBaseUrlPlaceholder: '如 http://192.168.1.100:8080/v1',
  settingsLLMDirectHint: '直连模式：请求直接从浏览器发出，不经过服务器代理，适用于内网或 IP 限制的 LLM 服务',
  settingsLLMOptional: '可选',
  settingsLLMApiKey: 'API 密钥',
  settingsLLMApiKeyPlaceholder: '输入你的 API 密钥',
  settingsLLMModel: '模型名称',
  settingsLLMModelPlaceholder: '如 gpt-4o-mini',
  settingsLLMPrompt: '自定义提示词',
  settingsLLMPromptPlaceholder: '留空使用默认提示词，用 {{TASK_LIST}} 表示任务列表插入位置',
  settingsLLMPromptReset: '恢复默认',
  settingsLLMSave: '保存配置',
  settingsLLMSaved: '配置已保存',
  settingsLLMNotConfigured: '未配置大模型，使用截止日期排序',
  settingsLLMConfigureHint: '配置大模型以获得更精准的智能排序',
  settingsClientId: 'Azure AD Client ID',
  settingsClientIdPlaceholder: '输入 Client ID',
  settingsAccount: '微软账号',
  settingsSignOut: '退出登录',
  settingsSave: '保存',
  settingsClose: '关闭',

  // 同步
  syncSyncing: '同步中...',
  syncSuccess: '同步完成',
  syncError: '同步失败',
  syncRefresh: '刷新',

  // 排序
  sortByLLM: '智能排序',
  sortByDate: '按日期排序',
  sortRefresh: '重新排序',
  sorting: '排序中...',

  // 错误
  errorNetwork: '网络错误，请重试',
  errorAuth: '认证失败，请重新登录',
  errorLLM: '大模型调用失败',
} as const
