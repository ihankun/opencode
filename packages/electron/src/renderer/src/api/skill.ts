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
export type MarketplaceProvider = 'official' | 'netease'
export type MarketplaceSort = 'recommended' | 'aiScore' | 'downloads' | 'stars' | 'rating' | 'recent'
export type MarketplaceSummary = { id: string; provider: MarketplaceProvider; slug: string; name: string; source: string; description: string; url: string; version: string | null; category: string | null; tags: ReadonlyArray<string>; icon: string | null; githubStars: number; downloadCount: number; isVerified: boolean; securityScore: number | null; securityStatus: string | null; aiScore: number | null; reviewStatus: string | null }
export type MarketplacePage = { data: ReadonlyArray<MarketplaceSummary>; page: number; perPage: number; total: number; categories: ReadonlyArray<string> }
export type MarketplaceDetail = { id: string; provider: MarketplaceProvider; source: string; slug: string; version: string | null; category: string | null; tags: ReadonlyArray<string>; icon: string | null; hash: string; files: ReadonlyArray<{ path: string; contents: string }>; githubStars: number; downloadCount: number; isVerified: boolean; isFeatured: boolean; securityScore: number | null; securityStatus: string | null; qualityScore: number | null; aiScore: number | null; reviewStatus: string | null; license: string | null }
export type MarketplaceInstallation = { id: string; provider: MarketplaceProvider; slug: string; scope: 'global' | 'project'; directory: string; manifest: { id: string; provider: MarketplaceProvider; source: string; slug: string; version: string | null; hash: string | null; scope: 'global' | 'project'; installedAt: string; updatedAt: string; files: Readonly<Record<string, string>> }; conflict: boolean; updateAvailable: boolean }
export type MarketplaceScope = MarketplaceInstallation['scope']

function marketPath(path: string, directory?: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params)
  const formatted = formatPathForApi(directory)
  if (formatted) query.set('location[directory]', formatted)
  return `${path}?${query}`
}

export async function searchMarketplaceSkills(input: { query: string; provider: MarketplaceProvider; sort: MarketplaceSort; category?: string; page?: number }, directory?: string) {
  return (await apiFetchJson<LocationResponse<MarketplacePage>>(
    marketPath('/api/skill/marketplace/search', directory, {
      q: input.query,
      provider: input.provider,
      sort: input.sort,
      limit: '24',
      page: String(input.page ?? 1),
      ...(input.category ? { category: input.category } : {}),
    }),
  )).data
}

export async function getMarketplaceDetail(id: string, provider: MarketplaceProvider, directory?: string) {
  return (await apiFetchJson<LocationResponse<MarketplaceDetail>>(marketPath('/api/skill/marketplace/detail', directory, { id, provider }))).data
}

export async function getMarketplaceInstalled(directory?: string) {
  return (await apiFetchJson<LocationResponse<ReadonlyArray<MarketplaceInstallation>>>(marketPath('/api/skill/marketplace/installed', directory))).data
}

export async function installMarketplaceSkill(id: string, provider: MarketplaceProvider, scope: MarketplaceScope, directory?: string, force?: boolean) {
  return (await apiFetchJson<LocationResponse<MarketplaceInstallation>>(marketPath('/api/skill/marketplace/install', directory), {
    method: 'POST', body: JSON.stringify({ id, provider, scope, force }),
  })).data
}

export async function removeMarketplaceSkill(id: string, provider: MarketplaceProvider, scope: MarketplaceScope, directory?: string, force?: boolean) {
  await apiFetchJson<undefined>(marketPath('/api/skill/marketplace/install', directory), {
    method: 'DELETE', body: JSON.stringify({ id, provider, scope, force }),
  })
}
