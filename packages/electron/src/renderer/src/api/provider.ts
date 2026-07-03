import { getSDKClient, unwrap } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'
import type { Auth, Provider, ProviderAuthMethod } from '@opencode-ai/sdk/v2/client'

export interface ProviderListResult {
  all: Provider[]
  connected: string[]
  default: Record<string, string>
}

export async function getProviders(directory?: string): Promise<ProviderListResult> {
  const sdk = getSDKClient()
  return unwrap(await sdk.provider.list({ directory: formatPathForApi(directory) }))
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
