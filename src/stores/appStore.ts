import { create } from 'zustand'
import type { TodoList, TodoTask, LLMScore, ViewMode, SyncStatus } from '../types'
import { STORAGE_KEYS } from '../utils/constants'

interface AppState {
  // ====== 数据 ======
  lists: TodoList[]
  /** 按 listId 分组的任务 */
  tasksByList: Record<string, TodoTask[]>
  /** 大模型评分，按 taskId 索引 */
  llmScores: Record<string, LLMScore>
  /** 被隐藏的清单 id（不在 UI 显示，也不参与 LLM 排序） */
  hiddenListIds: string[]

  // ====== UI 状态 ======
  viewMode: ViewMode
  selectedListId: string | null
  syncStatus: SyncStatus
  settingsOpen: boolean
  /** 大模型排序中 */
  isSorting: boolean

  // ====== 操作 ======
  setLists: (lists: TodoList[]) => void
  removeList: (listId: string) => void
  setTasksForList: (listId: string, tasks: TodoTask[]) => void
  removeTask: (listId: string, taskId: string) => void
  setLLMScores: (scores: LLMScore[]) => void
  setHiddenListIds: (ids: string[]) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedListId: (id: string | null) => void
  setSyncStatus: (status: SyncStatus) => void
  setSettingsOpen: (open: boolean) => void
  setIsSorting: (sorting: boolean) => void
}

/** 从 localStorage 读取上次的视图模式 */
function getInitialViewMode(): ViewMode {
  const saved = localStorage.getItem(STORAGE_KEYS.viewMode)
  if (saved === 'byList' || saved === 'allTodos' || saved === 'quadrant') {
    return saved
  }
  return 'byList'
}

/** 从 localStorage 读取隐藏清单 id 列表 */
function getInitialHiddenListIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.hiddenLists)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const useAppStore = create<AppState>((set) => ({
  // 初始数据
  lists: [],
  tasksByList: {},
  llmScores: {},
  hiddenListIds: getInitialHiddenListIds(),

  // 初始 UI 状态
  viewMode: getInitialViewMode(),
  selectedListId: null,
  syncStatus: 'idle',
  settingsOpen: false,
  isSorting: false,

  // 操作
  setLists: (lists) => set({ lists }),

  removeList: (listId) =>
    set((state) => {
      const newTasksByList = { ...state.tasksByList }
      delete newTasksByList[listId]
      const nextHidden = state.hiddenListIds.includes(listId)
        ? state.hiddenListIds.filter((id) => id !== listId)
        : state.hiddenListIds
      if (nextHidden !== state.hiddenListIds) {
        localStorage.setItem(STORAGE_KEYS.hiddenLists, JSON.stringify(nextHidden))
      }
      return {
        lists: state.lists.filter((l) => l.id !== listId),
        tasksByList: newTasksByList,
        hiddenListIds: nextHidden,
      }
    }),

  setTasksForList: (listId, tasks) =>
    set((state) => ({
      tasksByList: { ...state.tasksByList, [listId]: tasks },
    })),

  removeTask: (listId, taskId) =>
    set((state) => ({
      tasksByList: {
        ...state.tasksByList,
        [listId]: (state.tasksByList[listId] || []).filter(
          (t) => t.id !== taskId
        ),
      },
    })),

  setLLMScores: (scores) =>
    set({
      llmScores: Object.fromEntries(scores.map((s) => [s.taskId, s])),
    }),

  setHiddenListIds: (ids) => {
    localStorage.setItem(STORAGE_KEYS.hiddenLists, JSON.stringify(ids))
    set({ hiddenListIds: ids })
  },

  setViewMode: (mode) => {
    localStorage.setItem(STORAGE_KEYS.viewMode, mode)
    set({ viewMode: mode })
  },

  setSelectedListId: (id) => set({ selectedListId: id }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setIsSorting: (sorting) => set({ isSorting: sorting }),
}))

/** 获取所有任务（扁平化） */
export function getAllTasks(state: Pick<AppState, 'tasksByList'>): TodoTask[] {
  return Object.values(state.tasksByList).flat()
}

/** 获取可见的清单（过滤掉被隐藏的） */
export function getVisibleLists(
  state: Pick<AppState, 'lists' | 'hiddenListIds'>
): TodoList[] {
  if (state.hiddenListIds.length === 0) return state.lists
  const hidden = new Set(state.hiddenListIds)
  return state.lists.filter((l) => !hidden.has(l.id))
}

/** 获取可见清单下的全部任务（供全部/四象限视图和 LLM 排序使用） */
export function getVisibleTasks(
  state: Pick<AppState, 'tasksByList' | 'hiddenListIds'>
): TodoTask[] {
  if (state.hiddenListIds.length === 0) {
    return Object.values(state.tasksByList).flat()
  }
  const hidden = new Set(state.hiddenListIds)
  const result: TodoTask[] = []
  for (const [listId, tasks] of Object.entries(state.tasksByList)) {
    if (hidden.has(listId)) continue
    for (const t of tasks) result.push(t)
  }
  return result
}
