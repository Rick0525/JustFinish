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

export const useAppStore = create<AppState>((set) => ({
  // 初始数据
  lists: [],
  tasksByList: {},
  llmScores: {},

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
      return {
        lists: state.lists.filter((l) => l.id !== listId),
        tasksByList: newTasksByList,
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
export function getAllTasks(state: AppState): TodoTask[] {
  return Object.values(state.tasksByList).flat()
}
