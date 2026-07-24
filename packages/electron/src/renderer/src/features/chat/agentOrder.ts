const fixedAgentOrder = new Map([
  ['build', 0],
  ['plan', 1],
  ['goal', 2],
])

const agentNameCollator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
})

type SelectableAgent = {
  name: string
  mode?: string
  hidden?: boolean
}

export function selectableAgentsInDisplayOrder<T extends SelectableAgent>(agents: readonly T[]): T[] {
  return agents
    .filter(agent => agent.mode !== 'subagent' && !agent.hidden)
    .toSorted((left, right) => {
      const leftOrder = fixedAgentOrder.get(left.name.toLowerCase())
      const rightOrder = fixedAgentOrder.get(right.name.toLowerCase())

      if (leftOrder !== undefined || rightOrder !== undefined) {
        return (leftOrder ?? fixedAgentOrder.size) - (rightOrder ?? fixedAgentOrder.size)
      }

      return agentNameCollator.compare(left.name, right.name)
    })
}
