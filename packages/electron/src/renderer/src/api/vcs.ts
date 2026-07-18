// ============================================
// VCS API - 版本控制信息
// ============================================

import { getSDKClient, unwrap } from './sdk'
import type { FileDiff } from './types'
import type { VcsDiffMode, VcsInfo } from '../types/api/vcs'
import { formatPathForApi } from '../utils/directoryUtils'
import { normalizeFileDiffs } from '../types/api/file'

/**
 * 获取 VCS 信息
 */
export async function getVcsInfo(directory?: string): Promise<VcsInfo | null> {
  try {
    const sdk = getSDKClient()
    return unwrap(await sdk.vcs.get({ directory: formatPathForApi(directory) }))
  } catch {
    // VCS 不可用时返回 null
    return null
  }
}

export interface VcsBranch {
  name: string
  current: boolean
}

export async function listVcsBranches(directory?: string): Promise<VcsBranch[]> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.branch.list({ directory: formatPathForApi(directory) }))
}

export async function switchVcsBranch(branch: string, directory?: string): Promise<string> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.branch.switch({ branch, directory: formatPathForApi(directory) })).branch
}

/**
 * 获取 Git 或分支维度的 diff
 */
export async function getVcsDiff(mode: VcsDiffMode, directory?: string): Promise<FileDiff[]> {
  const sdk = getSDKClient()
  return normalizeFileDiffs(unwrap(await sdk.vcs.diff({ mode, directory: formatPathForApi(directory) })))
}

export async function stageVcsFiles(files: string[], directory?: string): Promise<string> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.stage({ files, directory: formatPathForApi(directory) })).output
}

export async function unstageVcsFiles(files: string[], directory?: string): Promise<string> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.unstage({ files, directory: formatPathForApi(directory) })).output
}

export async function discardVcsFiles(files: string[], directory?: string): Promise<string> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.discard({ files, directory: formatPathForApi(directory) })).output
}

export async function commitVcsChanges(message: string, directory?: string): Promise<string> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.commit({ message, directory: formatPathForApi(directory) })).output
}

export async function pushVcsBranch(directory?: string): Promise<string> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.push({ directory: formatPathForApi(directory) })).output
}
