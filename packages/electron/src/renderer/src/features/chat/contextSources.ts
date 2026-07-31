import type { Message } from '../../types/message'

export interface ContextSource {
  type: string
  count: number
  size: number
  percent: number
}

/** 按消息 part 体积估算各上下文来源占比 */
export function computeContextSources(messages: Message[]): ContextSource[] {
  const parts = messages.flatMap(message => message.parts)
  const totalSize = Math.max(1, parts.reduce((total, part) => total + JSON.stringify(part).length, 0))
  return Object.entries(
    parts.reduce<Record<string, { count: number; size: number }>>((result, part) => {
      const current = result[part.type] ?? { count: 0, size: 0 }
      result[part.type] = { count: current.count + 1, size: current.size + JSON.stringify(part).length }
      return result
    }, {}),
  )
    .sort((left, right) => right[1].size - left[1].size)
    .map(([type, value]) => ({ type, ...value, percent: Math.round((value.size / totalSize) * 100) }))
}
