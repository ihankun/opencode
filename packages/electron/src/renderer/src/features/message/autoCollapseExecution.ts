import { diffLines } from 'diff'
import { isVisibleTextPart, type Message } from '../../types/message'
import { extractToolData } from './tools'

export type ExecutionCollapsePlan = {
  conclusionMessageIndex: number
  conclusionPartIndex: number
}

export type TurnChangeSummary = {
  files: number
  additions: number
  deletions: number
}

export function buildExecutionCollapsePlan(messages: Message[]): ExecutionCollapsePlan | null {
  if (messages.length === 0) return null
  if (messages.some(message => message.info.role !== 'assistant' || message.isStreaming)) return null
  if (messages.at(-1)?.info.time.completed == null) return null

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
  if (!conclusion) return null
  if (conclusion.messageIndex === 0 && conclusion.partIndex === 0) return null

  return {
    conclusionMessageIndex: conclusion.messageIndex,
    conclusionPartIndex: conclusion.partIndex,
  }
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
  const totals = Array.from(files.values()).reduce(
    (summary, diff) => ({
      additions: summary.additions + diff.additions,
      deletions: summary.deletions + diff.deletions,
    }),
    { additions: 0, deletions: 0 },
  )
  return { files: files.size, ...totals }
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
