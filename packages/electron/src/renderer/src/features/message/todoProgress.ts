export type TurnTodoProgress = {
  current: number
  total: number
  items: Array<{
    content: string
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  }>
}

export function summarizeTodoItems(todos: unknown[]): TurnTodoProgress {
  const items = todos.map<TurnTodoProgress['items'][number]>(todo => {
    if (!todo || typeof todo !== 'object') return { content: '', status: 'pending' as const }
    const status = 'status' in todo && (
      todo.status === 'in_progress' ||
      todo.status === 'completed' ||
      todo.status === 'cancelled'
    ) ? todo.status : 'pending'
    return {
      content: 'content' in todo && typeof todo.content === 'string' ? todo.content : '',
      status,
    }
  })
  const inProgressIndex = items.findIndex(item => item.status === 'in_progress')
  const pendingIndex = items.findIndex(item => item.status === 'pending')
  const currentIndex = inProgressIndex >= 0 ? inProgressIndex : pendingIndex >= 0 ? pendingIndex : items.length - 1
  return { current: currentIndex + 1, total: items.length, items }
}
