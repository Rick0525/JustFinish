export const en = {
  // 应用标题
  appName: 'JustFinish',

  // 登录页
  loginTitle: 'Connect Your Microsoft Todo',
  loginDesc: 'AI-powered smart sorting for clearer task management',
  loginButton: 'Sign in with Microsoft',
  loginNeedClientId: 'Please configure Azure AD Client ID in settings first',

  // 视图模式
  viewByList: 'By List',
  viewAllTodos: 'All Todos',
  viewQuadrant: 'Quadrant',

  // 四象限
  quadrantDoFirst: 'Do First',
  quadrantDoFirstDesc: 'Urgent & Important',
  quadrantSchedule: 'Schedule',
  quadrantScheduleDesc: 'Important, Not Urgent',
  quadrantDelegate: 'Delegate',
  quadrantDelegateDesc: 'Urgent, Not Important',
  quadrantLater: 'Do Later',
  quadrantLaterDesc: 'Not Urgent, Not Important',

  // 任务
  taskOverdue: 'Overdue',
  taskToday: 'Today',
  taskTomorrow: 'Tomorrow',
  taskComplete: 'Mark complete',
  taskCompleting: 'Completing...',
  noTasks: 'No tasks',

  // 设置
  settings: 'Settings',
  settingsLLM: 'LLM Configuration',
  settingsLLMEndpoint: 'API Endpoint',
  settingsLLMEndpointPlaceholder: 'e.g. https://api.openai.com/v1',
  settingsLLMApiKey: 'API Key',
  settingsLLMApiKeyPlaceholder: 'Enter your API key',
  settingsLLMModel: 'Model Name',
  settingsLLMModelPlaceholder: 'e.g. gpt-4o-mini',
  settingsLLMSave: 'Save Configuration',
  settingsLLMSaved: 'Configuration saved',
  settingsLLMNotConfigured: 'LLM not configured, sorting by due date',
  settingsLLMConfigureHint: 'Configure LLM for smarter prioritization',
  settingsClientId: 'Azure AD Client ID',
  settingsClientIdPlaceholder: 'Enter Client ID',
  settingsAccount: 'Microsoft Account',
  settingsSignOut: 'Sign Out',
  settingsSave: 'Save',
  settingsClose: 'Close',

  // 同步
  syncSyncing: 'Syncing...',
  syncSuccess: 'Synced',
  syncError: 'Sync failed',
  syncRefresh: 'Refresh',

  // 排序
  sortByLLM: 'Smart Sort',
  sortByDate: 'Sort by Date',
  sortRefresh: 'Re-sort',
  sorting: 'Sorting...',

  // 错误
  errorNetwork: 'Network error, please retry',
  errorAuth: 'Authentication failed, please sign in again',
  errorLLM: 'LLM request failed',
} as const
