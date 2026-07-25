import { isSameDirectory } from '../utils'
import type { SavedDirectory } from './DirectoryContext.shared'

export function reorderDirectoryGroup(
  directories: SavedDirectory[],
  draggedPaths: string[],
  targetPaths: string[],
  position: 'before' | 'after',
) {
  const matches = (directory: SavedDirectory, paths: string[]) =>
    paths.some(path => isSameDirectory(directory.path, path))
  const dragged = directories.filter(directory => matches(directory, draggedPaths))
  if (dragged.length === 0 || directories.every(directory => !matches(directory, targetPaths))) {
    return directories
  }

  const remaining = directories.filter(directory => !matches(directory, draggedPaths))
  const targetIndexes = remaining
    .map((directory, index) => matches(directory, targetPaths) ? index : -1)
    .filter(index => index !== -1)
  if (targetIndexes.length === 0) return directories

  const insertionIndex = position === 'after'
    ? Math.max(...targetIndexes) + 1
    : Math.min(...targetIndexes)
  return [
    ...remaining.slice(0, insertionIndex),
    ...dragged,
    ...remaining.slice(insertionIndex),
  ]
}

export function updatePinnedDirectories(
  directories: SavedDirectory[],
  paths: string[],
  pinnedAt?: number,
) {
  const selected = directories.filter(directory =>
    paths.some(path => isSameDirectory(path, directory.path)),
  )
  if (selected.length === 0) return directories

  const remaining = directories.filter(directory =>
    !paths.some(path => isSameDirectory(path, directory.path)),
  )
  if (pinnedAt !== undefined) {
    return [
      ...selected.map(directory => ({ ...directory, pinnedAt })),
      ...remaining,
    ]
  }

  const pinned = remaining.filter(directory => directory.pinnedAt !== undefined)
  const unpinned = remaining.filter(directory => directory.pinnedAt === undefined)
  return [
    ...pinned,
    ...selected.map(directory => ({ ...directory, pinnedAt: undefined })),
    ...unpinned,
  ]
}
