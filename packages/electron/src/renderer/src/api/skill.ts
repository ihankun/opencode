// ============================================
// Skill API
// ============================================

import { apiFetchJson, getSDKClient, unwrap } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'
import type { SkillList } from '../types/api/skill'

/**
 * 获取所有可用 Skills
 */
export async function getSkills(directory?: string): Promise<SkillList> {
  const sdk = getSDKClient()
  return unwrap(await sdk.app.skills({ directory: formatPathForApi(directory) }))
}

type LocationResponse<T> = { data: T }
export type MarketplaceSummary = { id: string; slug: string; name: string; source: string; description: string; url: string; githubStars: number; downloadCount: number; isVerified: boolean; securityScore: number | null; securityStatus: string | null; aiScore: number | null; reviewStatus: string | null }
export type MarketplaceDetail = { id: string; source: string; slug: string; hash: string; files: ReadonlyArray<{ path: string; contents: string }>; githubStars: number; downloadCount: number; isVerified: boolean; isFeatured: boolean; securityScore: number | null; securityStatus: string | null; qualityScore: number | null; aiScore: number | null; reviewStatus: string | null; license: string | null }
export type MarketplaceInstallation = { id: string; slug: string; scope: 'global' | 'project'; directory: string; manifest: { id: string; source: string; slug: string; hash: string | null; scope: 'global' | 'project'; installedAt: string; updatedAt: string; files: Readonly<Record<string, string>> }; conflict: boolean; updateAvailable: boolean }
export type MarketplaceScope = MarketplaceInstallation['scope']

function marketPath(path: string, directory?: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params)
  const formatted = formatPathForApi(directory)
  if (formatted) query.set('location[directory]', formatted)
  return `${path}?${query}`
}

export async function searchMarketplaceSkills(query: string, directory?: string) {
  return (await apiFetchJson<LocationResponse<{ data: ReadonlyArray<MarketplaceSummary>; page: number; perPage: number; total: number }>>(
    marketPath('/api/skill/marketplace/search', directory, { q: query, limit: '40', page: '1' }),
  )).data.data
}

export async function getMarketplaceDetail(id: string, directory?: string) {
  return (await apiFetchJson<LocationResponse<MarketplaceDetail>>(marketPath('/api/skill/marketplace/detail', directory, { id }))).data
}

export async function getMarketplaceInstalled(directory?: string) {
  return (await apiFetchJson<LocationResponse<ReadonlyArray<MarketplaceInstallation>>>(marketPath('/api/skill/marketplace/installed', directory))).data
}

export async function installMarketplaceSkill(id: string, scope: MarketplaceScope, directory?: string, force?: boolean) {
  return (await apiFetchJson<LocationResponse<MarketplaceInstallation>>(marketPath('/api/skill/marketplace/install', directory), {
    method: 'POST', body: JSON.stringify({ id, scope, force }),
  })).data
}

export async function removeMarketplaceSkill(id: string, scope: MarketplaceScope, directory?: string, force?: boolean) {
  await apiFetchJson<undefined>(marketPath('/api/skill/marketplace/install', directory), {
    method: 'DELETE', body: JSON.stringify({ id, scope, force }),
  })
}
