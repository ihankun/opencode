import { getSDKClient, unwrap } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'
import type { Auth, Provider, ProviderAuthAuthorization, ProviderAuthMethod } from '@opencode-ai/sdk/v2/client'

export interface ProviderListResult {
  all: Provider[]
  connected: string[]
  default: Record<string, string>
}

export async function getProviders(directory?: string): Promise<ProviderListResult> {
  const sdk = getSDKClient()
  return unwrap(await sdk.provider.list({ directory: formatPathForApi(directory) }))
}

/** 强制服务端重新拉取 models.dev 目录，并返回更新后的供应商列表 */
export async function refreshProviders(directory?: string): Promise<ProviderListResult> {
  const sdk = getSDKClient()
  return unwrap(await sdk.provider.refresh({ directory: formatPathForApi(directory) }))
}

export async function getProviderAuthMethods(directory?: string): Promise<Record<string, ProviderAuthMethod[]>> {
  const sdk = getSDKClient()
  return unwrap(await sdk.provider.auth({ directory: formatPathForApi(directory) }))
}

export async function setProviderAuth(providerID: string, auth: Auth): Promise<boolean> {
  const sdk = getSDKClient()
  return unwrap(await sdk.auth.set({ providerID, auth }))
}

export async function removeProviderAuth(providerID: string): Promise<boolean> {
  const sdk = getSDKClient()
  return unwrap(await sdk.auth.remove({ providerID }))
}

export async function authorizeProviderOAuth(
  providerID: string,
  method: number,
  inputs?: Record<string, string>,
  directory?: string,
): Promise<ProviderAuthAuthorization> {
  const sdk = getSDKClient()
  return unwrap(
    await sdk.provider.oauth.authorize({
      providerID,
      method,
      inputs,
      directory: formatPathForApi(directory),
    }),
  )
}

export async function completeProviderOAuth(
  providerID: string,
  method: number,
  code?: string,
  directory?: string,
): Promise<boolean> {
  const sdk = getSDKClient()
  return unwrap(
    await sdk.provider.oauth.callback({
      providerID,
      method,
      code,
      directory: formatPathForApi(directory),
    }),
  )
}
