import { openDB, type IDBPDatabase } from 'idb'
import { DB_NAME, DB_VERSION } from '../utils/constants'
import type { TodoList, TodoTask, LLMScore } from '../types'

/** IndexedDB 数据库 schema */
interface JustFinishDB {
  lists: { key: string; value: TodoList }
  tasks: { key: string; value: TodoTask }
  llmScores: { key: string; value: LLMScore }
  syncMeta: { key: string; value: string }
}

let dbPromise: Promise<IDBPDatabase<JustFinishDB>> | null = null

/** 获取数据库实例 */
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<JustFinishDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 创建对象存储
        if (!db.objectStoreNames.contains('lists')) {
          db.createObjectStore('lists', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('llmScores')) {
          db.createObjectStore('llmScores', { keyPath: 'taskId' })
        }
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta')
        }
      },
    })
  }
  return dbPromise
}

// ============ 列表缓存 ============

/** 获取所有缓存的列表 */
export async function getCachedLists(): Promise<TodoList[]> {
  const db = await getDB()
  return db.getAll('lists')
}

/** 保存列表到缓存 */
export async function saveLists(lists: TodoList[]) {
  const db = await getDB()
  const tx = db.transaction('lists', 'readwrite')
  for (const list of lists) {
    await tx.store.put(list)
  }
  await tx.done
}

/** 从缓存删除列表 */
export async function deleteList(listId: string) {
  const db = await getDB()
  await db.delete('lists', listId)
}

/** 删除指定列表下的所有任务缓存 */
export async function deleteTasksByList(listId: string) {
  const db = await getDB()
  const tx = db.transaction('tasks', 'readwrite')
  const allTasks = await tx.store.getAll()
  for (const task of allTasks) {
    if (task.listId === listId) {
      await tx.store.delete(task.id)
    }
  }
  await tx.done
}

/** 清空所有列表缓存 */
export async function clearLists() {
  const db = await getDB()
  await db.clear('lists')
}

// ============ 任务缓存 ============

/** 获取所有缓存的任务 */
export async function getCachedTasks(): Promise<TodoTask[]> {
  const db = await getDB()
  return db.getAll('tasks')
}

/** 获取指定列表的缓存任务 */
export async function getCachedTasksByList(listId: string): Promise<TodoTask[]> {
  const allTasks = await getCachedTasks()
  return allTasks.filter((t) => t.listId === listId)
}

/** 保存任务到缓存（替换指定列表的所有任务） */
export async function saveTasksForList(listId: string, tasks: TodoTask[]) {
  const db = await getDB()
  const tx = db.transaction('tasks', 'readwrite')

  // 先删除该列表的旧任务
  const allTasks = await tx.store.getAll()
  for (const task of allTasks) {
    if (task.listId === listId) {
      await tx.store.delete(task.id)
    }
  }

  // 写入新任务
  for (const task of tasks) {
    await tx.store.put(task)
  }
  await tx.done
}

/** 批量 upsert 任务（不替换整个列表，只写入变化的任务） */
export async function upsertTasks(tasks: TodoTask[]) {
  const db = await getDB()
  const tx = db.transaction('tasks', 'readwrite')
  for (const task of tasks) {
    await tx.store.put(task)
  }
  await tx.done
}

/** 从缓存删除单个任务 */
export async function deleteTask(taskId: string) {
  const db = await getDB()
  await db.delete('tasks', taskId)
}

// ============ 大模型评分缓存 ============

/** 获取所有缓存的大模型评分 */
export async function getCachedLLMScores(): Promise<LLMScore[]> {
  const db = await getDB()
  return db.getAll('llmScores')
}

/** 保存大模型评分 */
export async function saveLLMScores(scores: LLMScore[]) {
  const db = await getDB()
  const tx = db.transaction('llmScores', 'readwrite')
  // 先清空旧评分
  await tx.store.clear()
  for (const score of scores) {
    await tx.store.put(score)
  }
  await tx.done
}

// ============ 同步元数据 ============

/** 获取 Delta Link */
export async function getDeltaLink(): Promise<string | null> {
  const db = await getDB()
  return (await db.get('syncMeta', 'deltaLink')) ?? null
}

/** 保存 Delta Link */
export async function saveDeltaLink(link: string) {
  const db = await getDB()
  await db.put('syncMeta', link, 'deltaLink')
}

/** 获取指定列表的任务 Delta Link */
export async function getTasksDeltaLink(listId: string): Promise<string | null> {
  const db = await getDB()
  return (await db.get('syncMeta', `tasksDeltaLink_${listId}`)) ?? null
}

/** 保存指定列表的任务 Delta Link */
export async function saveTasksDeltaLink(listId: string, link: string) {
  const db = await getDB()
  await db.put('syncMeta', link, `tasksDeltaLink_${listId}`)
}

/** 删除指定列表的任务 Delta Link（列表被删除时清理） */
export async function deleteTasksDeltaLink(listId: string) {
  const db = await getDB()
  await db.delete('syncMeta', `tasksDeltaLink_${listId}`)
}

/** 获取上次同步时间 */
export async function getLastSync(): Promise<string | null> {
  const db = await getDB()
  return (await db.get('syncMeta', 'lastSync')) ?? null
}

/** 保存同步时间 */
export async function saveLastSync() {
  const db = await getDB()
  await db.put('syncMeta', new Date().toISOString(), 'lastSync')
}

/** 获取大模型评分哈希（用于判断任务集合是否变化） */
export async function getLLMHash(): Promise<string | null> {
  const db = await getDB()
  return (await db.get('syncMeta', 'llmHash')) ?? null
}

/** 保存大模型评分哈希 */
export async function saveLLMHash(hash: string) {
  const db = await getDB()
  await db.put('syncMeta', hash, 'llmHash')
}
