export type QuotaProviderPreference = {
  id: string
  enabled: boolean
}

export type QuotaRow = {
  label: string
  kind: "percent" | "value"
  percentRemaining?: number
  value?: string
  detail?: string
  resetAt?: string
}

export type QuotaProviderResult = {
  providerId: string
  label: string
  status: "ok" | "error" | "unavailable"
  rows: QuotaRow[]
  error?: string
  fetchedAt: number
}

export type QuotaQueryInput = {
  providerIds: string[]
  localServer: boolean
}

export type OpenCodeGoQuotaConfig = {
  hasApiKey: boolean
  source: "none" | "auth-file" | "environment" | "secure-storage" | "config-file"
}

export type OpenCodeGoQuotaConfigUpdate = {
  apiKey?: string
  clearApiKey?: boolean
}

export const QUOTA_PROVIDER_ALIASES: ReadonlyArray<{
  id: string
  aliases: readonly string[]
}> = [
  { id: "anthropic", aliases: ["anthropic"] },
  { id: "openai", aliases: ["openai", "codex", "chatgpt"] },
  { id: "openrouter", aliases: ["openrouter"] },
  { id: "deepseek", aliases: ["deepseek"] },
  { id: "kimi", aliases: ["kimi-for-coding", "kimi-code", "kimi"] },
  { id: "minimax", aliases: ["minimax-coding-plan", "minimax"] },
  {
    id: "minimax-cn",
    aliases: ["minimax-china-coding-plan", "minimax-cn-coding-plan", "minimax-cn", "minimax-china"],
  },
  { id: "zai", aliases: ["zai-coding-plan", "zai", "glm"] },
  {
    id: "zhipu",
    aliases: ["zhipu-coding-plan", "zhipuai-coding-plan", "glm-coding-plan", "zhipu"],
  },
  { id: "chutes", aliases: ["chutes"] },
  { id: "synthetic", aliases: ["synthetic"] },
  { id: "nanogpt", aliases: ["nanogpt", "nano-gpt"] },
  { id: "xai", aliases: ["xai"] },
  { id: "opencode-go", aliases: ["opencode-go", "opencode-go-subscription"] },
]

export function canonicalQuotaProviderId(providerId: string) {
  const normalized = providerId.trim().toLowerCase()
  return QUOTA_PROVIDER_ALIASES.find(item => item.aliases.includes(normalized))?.id
}

export function supportsQuotaProvider(providerId: string) {
  return canonicalQuotaProviderId(providerId) !== undefined
}
