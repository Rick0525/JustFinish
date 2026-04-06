// Microsoft Graph API 类型定义

/** Todo 任务列表 */
export interface TodoList {
  id: string
  displayName: string
  isOwner?: boolean
  isShared?: boolean
  wellknownListName?: string
}

/** Todo 任务的日期时间 */
export interface DateTimeTimeZone {
  dateTime: string
  timeZone: string
}

/** Todo 任务 */
export interface TodoTask {
  id: string
  title: string
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred'
  importance: 'low' | 'normal' | 'high'
  body?: {
    content: string
    contentType: 'text' | 'html'
  }
  dueDateTime?: DateTimeTimeZone
  completedDateTime?: DateTimeTimeZone
  createdDateTime?: string
  lastModifiedDateTime?: string
  isReminderOn?: boolean
  categories?: string[]
  /** 所属列表 ID（本地附加字段） */
  listId: string
}

/** 大模型评分结果 */
export interface LLMScore {
  taskId: string
  /** 紧急程度 1-10 */
  urgency: number
  /** 重要程度 1-10 */
  importance: number
}

/** 大模型配置 */
export interface LLMConfig {
  /** 供应商 ID（对应 LLM_PROVIDERS 中的 id） */
  providerId: string
  /** API 密钥 */
  apiKey: string
  /** 模型名称（如 gpt-4o-mini） */
  model: string
  /** 自定义提示词（为空时使用默认提示词） */
  customPrompt?: string
}

/** 四象限类型 */
export type Quadrant = 'doFirst' | 'schedule' | 'delegate' | 'later'

/** 视图模式 */
export type ViewMode = 'byList' | 'allTodos' | 'quadrant'

/** 同步状态 */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success'
