// ============================================
// Worktree API - Git Worktree 管理
// ============================================

import { getSDKClient, unwrap } from './sdk'
import type { Worktree, WorktreeCreateInput, WorktreeRemoveInput, WorktreeResetInput } from '../types/api/worktree'
import { formatPathForApi } from '../utils/directoryUtils'
import { apiFetchJson } from './sdk'

export type WorktreeDetail = {
  name: string
  branch?: string
  directory: string
  dirty: boolean
  managed: boolean
  sizeBytes: number
  fileCount: number
  measuredCompletely: boolean
  createdAt: number
  modifiedAt: number
}

/**
 * 获取所有 worktree 列表
 */
export async function listWorktrees(directory?: string): Promise<string[]> {
  const sdk = getSDKClient()
  return unwrap(await sdk.worktree.list({ directory: formatPathForApi(directory) }))
}

export async function listWorktreeDetails(directory?: string): Promise<WorktreeDetail[]> {
  const formatted = formatPathForApi(directory)
  const query = formatted ? `?${new URLSearchParams({ directory: formatted }).toString()}` : ''
  return apiFetchJson<WorktreeDetail[]>(`/experimental/worktree/details${query}`)
}

/**
 * 创建新的 worktree
 */
export async function createWorktree(params: WorktreeCreateInput, directory?: string): Promise<Worktree> {
  const sdk = getSDKClient()
  return unwrap(await sdk.worktree.create({ directory: formatPathForApi(directory), worktreeCreateInput: params }))
}

/**
 * 删除 worktree
 */
export async function removeWorktree(params: WorktreeRemoveInput, directory?: string): Promise<boolean> {
  const sdk = getSDKClient()
  unwrap(await sdk.worktree.remove({ directory: formatPathForApi(directory), worktreeRemoveInput: params }))
  return true
}

/**
 * 重置 worktree
 */
export async function resetWorktree(params: WorktreeResetInput, directory?: string): Promise<boolean> {
  const sdk = getSDKClient()
  unwrap(await sdk.worktree.reset({ directory: formatPathForApi(directory), worktreeResetInput: params }))
  return true
}
