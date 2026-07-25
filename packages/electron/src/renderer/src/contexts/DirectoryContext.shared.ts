import { createContext } from 'react'
import type { ApiPath } from '../api'

export interface SavedDirectory {
  path: string
  name: string
  addedAt: number
  pinnedAt?: number
}

export interface DirectoryContextValue {
  currentDirectory: string | undefined
  setCurrentDirectory: (directory: string | undefined) => void
  savedDirectories: SavedDirectory[]
  addDirectory: (path: string, options?: { select?: boolean }) => void
  removeDirectory: (path: string) => void
  reorderDirectories: (draggedPaths: string[], targetPaths: string[], position?: 'before' | 'after') => void
  setDirectoriesPinned: (paths: string[], pinned: boolean) => void
  pathInfo: ApiPath | null
  sidebarExpanded: boolean
  setSidebarExpanded: (expanded: boolean) => void
  recentProjects: Record<string, number>
}

export const DirectoryContext = createContext<DirectoryContextValue | null>(null)
