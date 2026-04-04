import type { TodoTask, LLMScore, LLMConfig } from '../types'
import { isOverdue, isToday, formatDueDate } from '../utils/dates'
import { getLang } from '../i18n'
import { LLM_PROXY_PATH } from '../utils/constants'

/** 构建任务摘要用于发送给大模型 */
function buildTaskSummary(task: TodoTask): string {
  let summary = `"${task.title}"`
  if (task.dueDateTime) {
    const dateStr = formatDueDate(task.dueDateTime)
    summary += ` (截止: ${dateStr})`
    if (isOverdue(task.dueDateTime)) summary += ' [已超时]'
    else if (isToday(task.dueDateTime)) summary += ' [今天到期]'
  }
  if (task.importance !== 'normal') {
    summary += ` [${task.importance === 'high' ? '高优先级' : '低优先级'}]`
  }
  return summary
}

/** 构建中文 Prompt */
function buildPromptZh(tasks: { id: string; summary: string }[]): string {
  const taskList = tasks
    .map((t, i) => `${i + 1}. id="${t.id}" ${t.summary}`)
    .join('\n')

  return `你是一个高效的任务优先级评估助手。请分析以下待办事项，对每个任务评估两个维度：
- urgency（紧急程度，1-10）：任务的时间敏感性。考虑截止日期、是否超时等。
- importance（重要程度，1-10）：任务的影响力和价值。根据任务标题推断其重要性。

规则：
- 已超时的任务 urgency >= 7
- 今天到期的任务 urgency >= 6
- 标记为高优先级的任务 importance >= 6
- 工作/学业相关的重要事项 > 日常杂务

任务列表：
${taskList}

请只返回 JSON 数组，不要任何其他文字：
[{"id": "任务id", "urgency": 数字, "importance": 数字}]`
}

/** 构建英文 Prompt */
function buildPromptEn(tasks: { id: string; summary: string }[]): string {
  const taskList = tasks
    .map((t, i) => `${i + 1}. id="${t.id}" ${t.summary}`)
    .join('\n')

  return `You are an efficient task priority evaluator. Analyze these tasks and rate each on two dimensions:
- urgency (1-10): Time sensitivity. Consider due dates, overdue status.
- importance (1-10): Impact and value. Infer from the task title.

Rules:
- Overdue tasks: urgency >= 7
- Due today: urgency >= 6
- Marked high priority: importance >= 6
- Work/academic tasks > routine chores

Tasks:
${taskList}

Respond with ONLY a JSON array, no other text:
[{"id": "task_id", "urgency": number, "importance": number}]`
}

/** 计算任务集合的哈希，用于判断是否需要重新排序 */
export function computeTaskHash(tasks: TodoTask[]): string {
  const sorted = [...tasks]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((t) => `${t.id}:${t.title}:${t.dueDateTime?.dateTime || ''}`)
    .join('|')
  // 简单哈希
  let hash = 0
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}

/** 调用大模型进行任务排序 */
export async function sortTasksWithLLM(
  tasks: TodoTask[],
  config: LLMConfig
): Promise<LLMScore[]> {
  if (tasks.length === 0) return []

  // 准备任务摘要
  const taskSummaries = tasks.map((t) => ({
    id: t.id,
    summary: buildTaskSummary(t),
  }))

  // 分批处理（每批最多 80 个）
  const batchSize = 80
  const allScores: LLMScore[] = []

  for (let i = 0; i < taskSummaries.length; i += batchSize) {
    const batch = taskSummaries.slice(i, i + batchSize)

    // 根据界面语言选择 Prompt
    const lang = getLang()
    const prompt = lang === 'zh' ? buildPromptZh(batch) : buildPromptEn(batch)

    // 通过内置代理发送请求
    const response = await fetch(LLM_PROXY_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: `${config.endpoint}/chat/completions`,
        apiKey: config.apiKey,
        body: {
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 4000,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`大模型请求失败 (${response.status}): ${errorText}`)
    }

    const data = await response.json()

    // 解析大模型响应
    const content = data.choices?.[0]?.message?.content || ''
    const scores = parseScores(content, batch.map((b) => b.id))
    allScores.push(...scores)
  }

  return allScores
}

/** 解析大模型返回的 JSON 评分 */
function parseScores(content: string, validIds: string[]): LLMScore[] {
  // 尝试提取 JSON 数组
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('大模型返回格式错误：未找到 JSON 数组')
  }

  const parsed = JSON.parse(jsonMatch[0])
  if (!Array.isArray(parsed)) {
    throw new Error('大模型返回格式错误：不是数组')
  }

  const idSet = new Set(validIds)
  return parsed
    .filter((item: { id?: string }) => item.id && idSet.has(item.id))
    .map((item: { id: string; urgency: number; importance: number }) => ({
      taskId: item.id,
      urgency: Math.min(10, Math.max(1, Math.round(item.urgency))),
      importance: Math.min(10, Math.max(1, Math.round(item.importance))),
    }))
}
