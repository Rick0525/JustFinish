// Microsoft Graph API 基础地址
export const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'

// Microsoft Graph API 端点
export const GRAPH_ENDPOINTS = {
  /** 获取所有列表（支持 delta） */
  listsDelta: `${GRAPH_BASE_URL}/me/todo/lists/delta`,
  /** 获取所有列表 */
  lists: `${GRAPH_BASE_URL}/me/todo/lists`,
  /** 获取指定列表的任务（需要替换 {listId}） */
  tasks: (listId: string) =>
    `${GRAPH_BASE_URL}/me/todo/lists/${listId}/tasks`,
  /** 增量同步指定列表的任务（需要替换 {listId}） */
  tasksDelta: (listId: string) =>
    `${GRAPH_BASE_URL}/me/todo/lists/${listId}/tasks/delta`,
  /** 更新指定任务（需要替换 listId 和 taskId） */
  task: (listId: string, taskId: string) =>
    `${GRAPH_BASE_URL}/me/todo/lists/${listId}/tasks/${taskId}`,
} as const

// MSAL 认证配置
export const MSAL_SCOPES = ['Tasks.ReadWrite']

// 大模型代理 API 路径
export const LLM_PROXY_PATH = '/api/llm'

// localStorage 键名
export const STORAGE_KEYS = {
  llmConfig: 'justfinish_llm_config',
  viewMode: 'justfinish_view_mode',
  clientId: 'justfinish_client_id',
} as const

// IndexedDB 数据库名
export const DB_NAME = 'justfinish_db'
export const DB_VERSION = 1
