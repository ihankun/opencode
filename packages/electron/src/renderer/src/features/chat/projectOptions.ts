import type { SavedDirectory } from '../../contexts/DirectoryContext.shared'
import { getDirectoryName, isSameDirectory } from '../../utils'

export function projectOptionsInSidebarOrder(
  savedDirectories: readonly SavedDirectory[],
  currentDirectory?: string,
): SavedDirectory[] {
  const directories = [...savedDirectories]
  if (!currentDirectory || directories.some(directory => isSameDirectory(directory.path, currentDirectory))) {
    return directories
  }

  return [
    ...directories,
    {
      path: currentDirectory,
      name: getDirectoryName(currentDirectory) || currentDirectory,
      addedAt: Date.now(),
    },
  ]
}
