import { describe, expect, it } from 'bun:test'
import type { SavedDirectory } from '../../contexts/DirectoryContext.shared'
import { projectOptionsInSidebarOrder } from './projectOptions'

const projects: SavedDirectory[] = [
  { path: '/projects/feishu', name: 'feishu[im]', addedAt: 4 },
  { path: '/projects/openclaw', name: 'openclaw', addedAt: 3 },
  { path: '/projects/framework', name: 'k-framework', addedAt: 2 },
  { path: '/projects/openapi', name: 'openapi-workspace', addedAt: 1 },
]

describe('projectOptionsInSidebarOrder', () => {
  it('preserves the sidebar project order', () => {
    expect(projectOptionsInSidebarOrder(projects).map(project => project.name)).toEqual([
      'feishu[im]',
      'openclaw',
      'k-framework',
      'openapi-workspace',
    ])
  })

  it('does not duplicate the current project', () => {
    expect(projectOptionsInSidebarOrder(projects, '/projects/openclaw')).toEqual(projects)
  })

  it('appends an unsaved current project after sidebar projects', () => {
    expect(projectOptionsInSidebarOrder(projects, '/projects/temporary').map(project => project.name)).toEqual([
      'feishu[im]',
      'openclaw',
      'k-framework',
      'openapi-workspace',
      'temporary',
    ])
  })
})
