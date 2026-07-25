import { describe, expect, test } from "bun:test"
import type { SavedDirectory } from "./DirectoryContext.shared"
import { reorderDirectoryGroup, updatePinnedDirectories } from "./directoryOrdering"

const directories: SavedDirectory[] = [
  { path: "/alpha", name: "alpha", addedAt: 1 },
  { path: "/beta", name: "beta", addedAt: 2 },
  { path: "/gamma", name: "gamma", addedAt: 3 },
]

describe("directory ordering", () => {
  test("puts the latest pinned project first", () => {
    const firstPin = updatePinnedDirectories(directories, ["/alpha"], 100)
    const secondPin = updatePinnedDirectories(firstPin, ["/gamma"], 200)

    expect(secondPin.map(directory => directory.path)).toEqual(["/gamma", "/alpha", "/beta"])
    expect(secondPin.map(directory => directory.pinnedAt)).toEqual([200, 100, undefined])
  })

  test("keeps grouped project directories together when pinning", () => {
    const grouped = [
      ...directories,
      { path: "/alpha-worktree", name: "alpha-worktree", addedAt: 4 },
    ]
    const result = updatePinnedDirectories(grouped, ["/alpha", "/alpha-worktree"], 100)

    expect(result.map(directory => directory.path)).toEqual([
      "/alpha",
      "/alpha-worktree",
      "/beta",
      "/gamma",
    ])
    expect(result.slice(0, 2).every(directory => directory.pinnedAt === 100)).toBe(true)
  })

  test("moves an unpinned project to the top of the regular list", () => {
    const pinned = updatePinnedDirectories(
      updatePinnedDirectories(directories, ["/alpha"], 100),
      ["/gamma"],
      200,
    )
    const result = updatePinnedDirectories(pinned, ["/alpha"])

    expect(result.map(directory => directory.path)).toEqual(["/gamma", "/alpha", "/beta"])
    expect(result[1].pinnedAt).toBeUndefined()
  })

  test("reorders in both directions", () => {
    expect(reorderDirectoryGroup(directories, ["/gamma"], ["/alpha"], "before").map(directory => directory.path))
      .toEqual(["/gamma", "/alpha", "/beta"])
    expect(reorderDirectoryGroup(directories, ["/alpha"], ["/beta"], "after").map(directory => directory.path))
      .toEqual(["/beta", "/alpha", "/gamma"])
  })

  test("reorders all directories in a grouped project together", () => {
    const grouped = [
      directories[0],
      { path: "/alpha-worktree", name: "alpha-worktree", addedAt: 4 },
      ...directories.slice(1),
    ]
    const result = reorderDirectoryGroup(
      grouped,
      ["/alpha", "/alpha-worktree"],
      ["/gamma"],
      "after",
    )

    expect(result.map(directory => directory.path)).toEqual([
      "/beta",
      "/gamma",
      "/alpha",
      "/alpha-worktree",
    ])
  })
})
