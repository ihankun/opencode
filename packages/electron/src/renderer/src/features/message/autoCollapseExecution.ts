import { diffLines } from 'diff'
import { isVisibleTextPart, type Message } from '../../types/message'
import { extractToolData } from './tools'
import { summarizeTodoItems, type TurnTodoProgress } from './todoProgress'

export type ExecutionCollapsePlan = {
  conclusionMessageIndex: number
  conclusionPartIndex: number
}

export type TurnChangeFile = {
  filePath: string
  additions: number
  deletions: number
}

export type TurnChangeSummary = {
  files: number
  additions: number
  deletions: number
  fileDetails: TurnChangeFile[]
}

export function buildExecutionCollapsePlan(messages: Message[]): ExecutionCollapsePlan | null {
  if (messages.length === 0) return null
  if (messages.some(message => message.info.role !== 'assistant')) return null

  const parts = messages.flatMap((message, messageIndex) =>
    message.parts.map((part, partIndex) => ({ messageIndex, partIndex, part })),
  )
  const lastExecutionIndex = parts.findLastIndex(({ part }) =>
    part.type === 'reasoning' ||
    part.type === 'tool' ||
    part.type === 'subtask' ||
    part.type === 'retry' ||
    part.type === 'compaction',
  )
  if (lastExecutionIndex === -1) return null

  const conclusion = parts.slice(lastExecutionIndex + 1).find(({ part }) => isVisibleTextPart(part))
  if (conclusion) {
    if (conclusion.messageIndex === 0 && conclusion.partIndex === 0) return null
    return {
      conclusionMessageIndex: conclusion.messageIndex,
      conclusionPartIndex: conclusion.partIndex,
    }
  }

  // 没有后续文本（turn 以工具调用结尾），折叠到最后一条消息的末尾
  const lastMsgIndex = messages.length - 1
  const lastPartIndex = messages[lastMsgIndex].parts.length - 1
  if (lastMsgIndex === 0 && lastPartIndex === 0) return null
  return {
    conclusionMessageIndex: lastMsgIndex,
    conclusionPartIndex: lastPartIndex + 1,
  }
}

export function getExecutionStatusSummary(messages: Message[]): string | null {
  const parts = messages.flatMap(message => message.parts)
  if (parts.length === 0) return null

  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index]
    if (part.type === 'tool') {
      const toolName = part.tool.toLowerCase()
      if (toolName === 'bash' || toolName === 'cmd' || toolName === 'terminal' || toolName === 'shell' || toolName === 'sh' || /^(exec|run|command)/.test(toolName)) return '正在执行命令'
      if (/^(write|save)/.test(toolName)) return '正在写入文件'
      if (/^(edit|replace|patch|apply)/.test(toolName)) return '正在编辑文件'
      if (toolName === 'read' || toolName === 'cat' || /^head/.test(toolName)) return '正在读取文件'
      if (toolName === 'grep' || /^search/.test(toolName)) return '正在搜索代码'
      if (toolName === 'glob' || toolName === 'find' || toolName === 'ls') return '正在查找文件'
      if (toolName === 'todo' || toolName === 'todowrite' || /^task_plan/.test(toolName)) return '正在更新计划'
      if (/^(web_fetch|websearch|webfetch|web_search|fetch|curl|request|http|browse|network|exa)/.test(toolName)) return '正在获取网页'
      if (toolName === 'task' || /^subtask/.test(toolName)) return '正在执行子任务'
      if (toolName === 'skill') return '正在安装技能'
      if (toolName === 'question' || toolName === 'ask') return '正在等待回答'
      if (toolName === 'lsp') return '正在分析代码'
      if (/^(think|reason|plan)/.test(toolName) || toolName === 'plan_exit') return '正在思考'
      if (/^(get_goal|create_goal|update_goal|clear_goal)/.test(toolName)) return '正在管理目标'
      return '正在执行操作'
    }
    if (part.type === 'reasoning') return '正在思考'
    if (part.type === 'subtask') return '正在执行子任务'
    if (part.type === 'retry') return '正在重试'
    if (part.type === 'compaction') return '正在压缩上下文'
  }
  return null
}

export function estimateCollapsedRowHeight(messages: Message[]): number {
  if (messages.length === 0) return 0
  if (messages.some(m => m.info.role !== 'assistant')) return 0

  const plan = buildExecutionCollapsePlan(messages)
  if (!plan) return 0

  let height = 36
  const conclusionMessages = messages.slice(plan.conclusionMessageIndex)
  for (let i = 0; i < conclusionMessages.length; i++) {
    const parts = i === 0
      ? conclusionMessages[i].parts.slice(plan.conclusionPartIndex)
      : conclusionMessages[i].parts
    for (const part of parts) {
      if (part.type === 'text' && !part.synthetic && part.text.trim()) {
        const estimatedLines = part.text
          .split(/\r?\n/)
          .reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / 88)), 0)
        height += Math.min(500, estimatedLines) * 24
      }
    }
    if (i > 0) height += 8
  }
  return Math.max(56, height + 24)
}

export function summarizeTurnChanges(userMessage: Message, assistantMessages: Message[]): TurnChangeSummary {
  const turnCompleted =
    assistantMessages.length > 0 &&
    assistantMessages.every(message => !message.isStreaming) &&
    assistantMessages.at(-1)?.info.time.completed != null
  if (turnCompleted && userMessage.info.role === 'user' && userMessage.info.summary?.diffs) {
    const files = new Map<string, { additions: number; deletions: number }>()
    userMessage.info.summary.diffs.forEach(diff => {
      const current = files.get(diff.path) ?? { additions: 0, deletions: 0 }
      files.set(diff.path, {
        additions: current.additions + diff.additions,
        deletions: current.deletions + diff.deletions,
      })
    })
    return totalChanges(files)
  }

  const files = new Map<string, { additions: number; deletions: number }>()
  assistantMessages.flatMap(message => message.parts).forEach(part => {
    if (part.type !== 'tool' || part.state.status === 'error') return
    const data = extractToolData(part)

    if (data.files?.length) {
      data.files.forEach(file => {
        const stats =
          file.additions !== undefined || file.deletions !== undefined
            ? { additions: file.additions ?? 0, deletions: file.deletions ?? 0 }
            : file.before !== undefined && file.after !== undefined
              ? changedLines(file.before, file.after)
              : changedPatchLines(file.patch ?? file.diff)
        addFileChanges(files, file.filePath, stats)
      })
      return
    }

    const input = part.state.input
    const filePath = data.filePath ??
      (typeof input?.path === 'string'
        ? input.path
        : typeof input?.file === 'string'
          ? input.file
          : typeof input?.filepath === 'string'
            ? input.filepath
            : undefined)
    const stats = data.diffStats ??
      (typeof data.diff === 'object'
        ? changedLines(data.diff.before, data.diff.after)
        : changedPatchLines(data.diff))
    if (filePath && stats) addFileChanges(files, filePath, stats)
  })

  return totalChanges(files)
}

export function summarizeTurnTodoProgress(assistantMessages: Message[]): TurnTodoProgress | undefined {
  const todoPart = assistantMessages
    .flatMap(message => message.parts)
    .findLast(part => part.type === 'tool' && part.tool.toLocaleLowerCase().includes('todo'))
  if (!todoPart || todoPart.type !== 'tool') return

  const metadataTodos = todoPart.state.metadata?.todos
  const inputTodos = todoPart.state.input?.todos
  const todos = Array.isArray(metadataTodos) ? metadataTodos : Array.isArray(inputTodos) ? inputTodos : undefined
  if (!todos?.length) return

  return summarizeTodoItems(todos)
}

function addFileChanges(
  files: Map<string, { additions: number; deletions: number }>,
  filePath: string,
  stats: { additions: number; deletions: number } | undefined,
) {
  if (!filePath || !stats) return
  const current = files.get(filePath) ?? { additions: 0, deletions: 0 }
  files.set(filePath, {
    additions: current.additions + stats.additions,
    deletions: current.deletions + stats.deletions,
  })
}

function totalChanges(files: Map<string, { additions: number; deletions: number }>): TurnChangeSummary {
  const filtered = Array.from(files.entries()).filter(([filePath]) => Boolean(filePath))
  const totals = filtered.reduce(
    (summary, [, diff]) => ({
      additions: summary.additions + diff.additions,
      deletions: summary.deletions + diff.deletions,
    }),
    { additions: 0, deletions: 0 },
  )
  const fileDetails: TurnChangeFile[] = filtered
    .map(([filePath, stats]) => ({ filePath, ...stats }))
    .sort((a, b) => b.additions - a.additions)
  return { files: fileDetails.length, ...totals, fileDetails }
}

function changedLines(before: string, after: string) {
  return diffLines(before, after).reduce(
    (stats, change) => ({
      additions: stats.additions + (change.added ? change.count ?? 0 : 0),
      deletions: stats.deletions + (change.removed ? change.count ?? 0 : 0),
    }),
    { additions: 0, deletions: 0 },
  )
}

function changedPatchLines(patch: string | undefined) {
  if (!patch) return
  return patch.split(/\r?\n/).reduce(
    (stats, line) => ({
      additions: stats.additions + (line.startsWith('+') && !line.startsWith('+++') ? 1 : 0),
      deletions: stats.deletions + (line.startsWith('-') && !line.startsWith('---') ? 1 : 0),
    }),
    { additions: 0, deletions: 0 },
  )
}
