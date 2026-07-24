import { describe, expect, it } from 'bun:test'
import { selectableAgentsInDisplayOrder } from './agentOrder'

describe('selectableAgentsInDisplayOrder', () => {
  it('keeps build, plan, and goal first in the required order', () => {
    const agents = [
      { name: 'orchestrator', mode: 'primary' },
      { name: 'goal', mode: 'primary' },
      { name: 'build', mode: 'primary' },
      { name: 'plan', mode: 'primary' },
    ]

    expect(selectableAgentsInDisplayOrder(agents).map(agent => agent.name)).toEqual([
      'build',
      'plan',
      'goal',
      'orchestrator',
    ])
  })

  it('sorts remaining agents alphabetically by name', () => {
    const agents = [
      { name: 'zeta', mode: 'primary' },
      { name: 'Alpha', mode: 'primary' },
      { name: 'agent-10', mode: 'primary' },
      { name: 'agent-2', mode: 'primary' },
      { name: 'build', mode: 'primary' },
    ]

    expect(selectableAgentsInDisplayOrder(agents).map(agent => agent.name)).toEqual([
      'build',
      'agent-2',
      'agent-10',
      'Alpha',
      'zeta',
    ])
  })

  it('excludes hidden agents and subagents without mutating the source list', () => {
    const agents = [
      { name: 'orchestrator', mode: 'primary' },
      { name: 'explorer', mode: 'subagent' },
      { name: 'private', mode: 'primary', hidden: true },
      { name: 'build', mode: 'primary' },
    ]

    expect(selectableAgentsInDisplayOrder(agents).map(agent => agent.name)).toEqual(['build', 'orchestrator'])
    expect(agents.map(agent => agent.name)).toEqual(['orchestrator', 'explorer', 'private', 'build'])
  })
})
