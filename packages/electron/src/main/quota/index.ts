/**
 * Native quota adapters adapted from slkiser/opencode-quota.
 * Upstream: https://github.com/slkiser/opencode-quota
 * License: MIT, see LICENSE.opencode-quota in this directory.
 *
 * The Electron integration intentionally keeps only credential resolution,
 * provider requests, and response normalization. CLI/TUI/plugin installation
 * code is not included.
 */
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import {
  canonicalQuotaProviderId,
  type OpenCodeGoQuotaConfig,
  type OpenCodeGoQuotaConfigUpdate,
  type QuotaProviderResult,
  type QuotaRow,
  type QuotaQueryInput,
} from "../../shared/quota.ts"

type AuthData = Record<string, unknown>

type JsonResult =
  | { ok: true; body: unknown }
  | { ok: false; error: string }

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  kimi: "Kimi Code",
  minimax: "MiniMax Coding Plan",
  "minimax-cn": "MiniMax Coding Plan (CN)",
  zai: "Z.ai",
  zhipu: "智谱 Coding Plan",
  chutes: "Chutes AI",
  synthetic: "Synthetic",
  nanogpt: "NanoGPT",
  xai: "xAI SuperGrok",
  "opencode-go": "OpenCode Go",
}

const AUTH_KEYS: Record<string, readonly string[]> = {
  anthropic: ["anthropic"],
  openai: ["openai", "codex", "chatgpt", "opencode"],
  openrouter: ["openrouter"],
  deepseek: ["deepseek"],
  kimi: ["kimi-for-coding", "kimi-code", "kimi"],
  minimax: ["minimax-coding-plan", "minimax"],
  "minimax-cn": ["minimax-china-coding-plan", "minimax-cn-coding-plan", "minimax-cn", "minimax-china"],
  zai: ["zai-coding-plan", "zai", "glm"],
  zhipu: ["zhipu-coding-plan", "zhipuai-coding-plan", "glm-coding-plan", "zhipu"],
  chutes: ["chutes"],
  synthetic: ["synthetic"],
  nanogpt: ["nanogpt", "nano-gpt"],
  xai: ["xai"],
  "opencode-go": ["opencode-go", "opencode-go-subscription"],
}

export async function queryProviderQuotas(userDataPath: string, input: QuotaQueryInput) {
  const providerIds = [...new Set(input.providerIds.filter(id => typeof id === "string" && id.trim()).slice(0, 30))]
  if (!input.localServer) {
    return providerIds.map(providerId => result(providerId, "unavailable", [], "远程 Runner 的凭据不在本机，暂时无法查询"))
  }

  const auth = await readAuth(join(userDataPath, "data", "opencode", "auth.json"))
  return Promise.all(providerIds.map(providerId => queryProvider(providerId, auth, userDataPath)))
}

async function queryProvider(providerId: string, auth: AuthData, userDataPath: string): Promise<QuotaProviderResult> {
  const canonical = canonicalQuotaProviderId(providerId)
  if (!canonical) return result(providerId, "unavailable", [], "当前供应商不支持余量显示")

  const entry = authEntry(auth, AUTH_KEYS[canonical] ?? [providerId])
  try {
    switch (canonical) {
      case "anthropic":
        return await queryAnthropic(providerId, entry)
      case "openai":
        return await queryOpenAI(providerId, entry)
      case "openrouter":
        return await queryOpenRouter(providerId, apiKey(entry))
      case "deepseek":
        return await queryDeepSeek(providerId, apiKey(entry))
      case "kimi":
        return await queryKimi(providerId, apiKey(entry))
      case "minimax":
        return await queryMiniMax(providerId, apiKey(entry), false)
      case "minimax-cn":
        return await queryMiniMax(providerId, apiKey(entry), true)
      case "zai":
        return await queryGlmCodingPlan(providerId, apiKey(entry), false)
      case "zhipu":
        return await queryGlmCodingPlan(providerId, apiKey(entry), true)
      case "chutes":
        return await queryChutes(providerId, apiKey(entry))
      case "synthetic":
        return await querySynthetic(providerId, apiKey(entry))
      case "nanogpt":
        return await queryNanoGpt(providerId, apiKey(entry))
      case "xai":
        return await queryXai(providerId, oauthToken(entry))
      case "opencode-go":
        return await queryOpenCodeGo(providerId, userDataPath)
      default:
        return result(providerId, "unavailable", [], "当前供应商不支持余量显示")
    }
  } catch (error) {
    return result(providerId, "error", [], safeError(error))
  }
}

async function readAuth(path: string): Promise<AuthData> {
  return readFile(path, "utf8")
    .then(content => {
      const parsed: unknown = JSON.parse(content)
      return record(parsed) ?? {}
    })
    .catch(() => ({}))
}

function authEntry(auth: AuthData, keys: readonly string[]) {
  return keys.map(key => record(auth[key])).find(Boolean)
}

function apiKey(entry: Record<string, unknown> | undefined) {
  if (!entry || entry.type !== "api") return
  return text(entry.key)
}

function oauthToken(entry: Record<string, unknown> | undefined) {
  if (!entry || entry.type !== "oauth") return
  return text(entry.access)
}

function result(
  providerId: string,
  status: QuotaProviderResult["status"],
  rows: QuotaRow[],
  error?: string,
  label?: string,
): QuotaProviderResult {
  const canonical = canonicalQuotaProviderId(providerId)
  return {
    providerId,
    label: label ?? (canonical ? PROVIDER_LABELS[canonical] : undefined) ?? providerId,
    status,
    rows,
    ...(error ? { error } : {}),
    fetchedAt: Date.now(),
  }
}

async function requestJson(
  url: string,
  init: RequestInit,
  token?: string,
): Promise<JsonResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7_000)
  try {
    const response = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
    })
    if (response.status >= 300 && response.status < 400) return { ok: false, error: "供应商接口重定向已被拒绝" }
    if (!response.ok) return { ok: false, error: `供应商接口返回 HTTP ${response.status}` }
    return { ok: true, body: await response.json() as unknown }
  } catch (error) {
    const message = safeError(error)
    return {
      ok: false,
      error: token ? message.split(token).join("[redacted]") : message,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function queryDeepSeek(providerId: string, key?: string) {
  if (!key) return missingCredential(providerId)
  const response = await requestJson("https://api.deepseek.com/user/balance", {
    headers: bearerHeaders(key),
  }, key)
  if (!response.ok) return failed(providerId, response.error)
  const body = record(response.body)
  const balances = Array.isArray(body?.balance_infos) ? body.balance_infos : []
  const rows = balances.flatMap(value => {
    const item = record(value)
    const amount = text(item?.total_balance)
    const currency = text(item?.currency)?.toUpperCase()
    if (!amount || !currency) return []
    const symbol = currency === "CNY" ? "¥" : currency === "USD" ? "$" : `${currency} `
    return [{
      label: "余额",
      kind: "value" as const,
      value: `${symbol}${amount}`,
      detail: body?.is_available === false ? "账户当前不可用" : undefined,
    }]
  })
  if (!rows.length) return failed(providerId, "供应商没有返回可显示的余额")
  return result(providerId, "ok", rows)
}

async function queryOpenRouter(providerId: string, key?: string) {
  if (!key) return missingCredential(providerId)
  const response = await requestJson("https://openrouter.ai/api/v1/key", {
    headers: bearerHeaders(key),
  }, key)
  if (!response.ok) return failed(providerId, response.error)
  const data = record(record(response.body)?.data)
  const usage = finite(data?.usage)
  const limit = finite(data?.limit)
  const remaining = finite(data?.limit_remaining)
  if (usage === undefined) return failed(providerId, "供应商没有返回可显示的用量")
  if (limit !== undefined && limit > 0) {
    return result(providerId, "ok", [{
      label: "预算",
      kind: "percent",
      percentRemaining: clamp(((remaining ?? limit - usage) / limit) * 100),
      detail: `$${usage.toFixed(2)} / $${limit.toFixed(2)}`,
    }])
  }
  return result(providerId, "ok", [{ label: "已用金额", kind: "value", value: `$${usage.toFixed(2)}` }])
}

async function queryOpenAI(providerId: string, entry: Record<string, unknown> | undefined) {
  const token = oauthToken(entry)
  if (!token) return failed(providerId, "OpenAI 余量仅支持 ChatGPT/Codex OAuth 登录，不支持普通 API Key")
  const expires = finite(entry?.expires)
  if (expires !== undefined && expires <= Date.now()) return failed(providerId, "OpenAI 登录凭据已过期")

  const headers = bearerHeaders(token)
  const accountId = jwtAccountId(token) ?? text(entry?.accountId)
  if (accountId) headers["ChatGPT-Account-Id"] = accountId
  const response = await requestJson("https://chatgpt.com/backend-api/wham/usage", { headers }, token)
  if (!response.ok) return failed(providerId, response.error)
  const body = record(response.body)
  const rateLimit = record(body?.rate_limit)
  const windows = [
    parseOpenAIWindow(rateLimit?.primary_window),
    parseOpenAIWindow(rateLimit?.secondary_window),
  ].filter((value): value is { seconds: number; row: QuotaRow } => Boolean(value))
  const rows = windows.map(value => ({
    ...value.row,
    label: windowLabel(value.seconds),
  }))
  const monthly = parsePercentWindow(record(record(body?.spend_control)?.individual_limit), "remaining_percent")
  if (monthly) rows.push({ ...monthly, label: "1月" })
  const codeReview = parsePercentWindow(record(record(body?.code_review_rate_limit)?.primary_window), "used_percent")
  if (codeReview) rows.push({ ...codeReview, label: "代码审查" })
  const credits = record(body?.credits)
  if (credits?.has_credits === true && credits.unlimited !== true && credits.balance !== null) {
    const balance = text(credits.balance)
    if (balance) rows.push({ label: "余额", kind: "value", value: balance })
  }
  if (!rows.length) return failed(providerId, "供应商没有返回可显示的余量")
  const plan = text(body?.plan_type)
  const label = plan ? `OpenAI (${plan})` : "OpenAI"
  return result(providerId, "ok", rows, undefined, label)
}

function parseOpenAIWindow(value: unknown) {
  const item = record(value)
  const seconds = finite(item?.limit_window_seconds)
  const row = parsePercentWindow(item, "used_percent")
  return seconds !== undefined && row ? { seconds, row } : undefined
}

function windowLabel(seconds: number) {
  if (seconds === 18_000) return "5小时"
  if (seconds === 604_800) return "1周"
  if (seconds >= 2_500_000 && seconds <= 2_700_000) return "1月"
  if (seconds % 86_400 === 0) return `${seconds / 86_400}天`
  if (seconds % 3_600 === 0) return `${seconds / 3_600}小时`
  return "余量"
}

async function queryAnthropic(providerId: string, entry: Record<string, unknown> | undefined) {
  const authToken = oauthToken(entry)
  const token = authToken ?? await readClaudeToken()
  if (!token) return failed(providerId, "未找到 Claude OAuth 凭据")
  const response = await requestJson("https://api.anthropic.com/api/oauth/usage", {
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
  }, token)
  if (!response.ok) return failed(providerId, response.error)
  const body = findUsageRoot(response.body)
  const fiveHour = parseAnthropicWindow(body?.five_hour ?? body?.fiveHour)
  const sevenDay = parseAnthropicWindow(body?.seven_day ?? body?.sevenDay)
  const rows = [
    ...(fiveHour ? [{ ...fiveHour, label: "5小时" }] : []),
    ...(sevenDay ? [{ ...sevenDay, label: "1周" }] : []),
  ]
  return rows.length ? result(providerId, "ok", rows) : failed(providerId, "供应商没有返回可显示的余量")
}

async function readClaudeToken() {
  return readFile(join(homedir(), ".claude", ".credentials.json"), "utf8")
    .then(content => {
      const root = record(JSON.parse(content) as unknown)
      return [record(root?.claudeAiOauth), record(root?.oauth), root]
        .flatMap(item => item ? [text(item.accessToken), text(item.access_token), text(item.token)] : [])
        .find(Boolean)
    })
    .catch(() => undefined)
}

function findUsageRoot(value: unknown) {
  const root = record(value)
  if (!root) return
  return [root, record(root.quota), record(root.usage), record(root.rate_limits), record(root.oauth_usage)]
    .find(item => item && (item.five_hour !== undefined || item.fiveHour !== undefined))
}

function parseAnthropicWindow(value: unknown): QuotaRow | undefined {
  const item = record(value)
  if (!item) return
  const used = [
    item.utilization,
    item.used_percentage,
    item.usedPercentage,
    item.used_percent,
    item.percent_used,
  ].map(finite).find(value => value !== undefined)
  if (used === undefined) return
  return {
    label: "",
    kind: "percent",
    percentRemaining: clamp(100 - used),
    resetAt: iso(item.resets_at ?? item.resetsAt ?? item.reset_at ?? item.resetAt),
  }
}

async function queryKimi(providerId: string, key?: string) {
  if (!key) return missingCredential(providerId)
  const response = await requestJson("https://api.kimi.com/coding/v1/usages", {
    headers: bearerHeaders(key),
  }, key)
  if (!response.ok) return failed(providerId, response.error)
  const root = record(response.body)
  const body = record(root?.data) ?? root
  const rows: QuotaRow[] = []
  const usage = record(body?.usage)
  const usageRow = parseCountWindow(usage, "1周")
  if (usageRow) rows.push(usageRow)
  const limits = Array.isArray(body?.limits) ? body.limits : []
  limits.forEach((value, index) => {
    const item = record(value)
    const detail = record(item?.detail) ?? item
    const window = record(item?.window)
    const label = text(item?.name) ?? text(detail?.name) ?? durationLabel(window ?? item) ?? `余量 ${index + 1}`
    const row = parseCountWindow(detail, label)
    const resetSource = detail ?? item
    if (row) rows.push({ ...row, resetAt: row.resetAt ?? (resetSource ? resetTime(resetSource) : undefined) })
  })
  return rows.length ? result(providerId, "ok", rows) : failed(providerId, "供应商没有返回可显示的余量")
}

function parseCountWindow(value: Record<string, unknown> | undefined, label: string): QuotaRow | undefined {
  if (!value) return
  const limit = finite(value.limit)
  const used = finite(value.used) ?? (limit !== undefined && finite(value.remaining) !== undefined
    ? limit - (finite(value.remaining) ?? 0)
    : undefined)
  if (limit === undefined || limit <= 0 || used === undefined) return
  return {
    label,
    kind: "percent",
    percentRemaining: clamp(((limit - used) / limit) * 100),
    detail: `${formatNumber(used)} / ${formatNumber(limit)}`,
    resetAt: resetTime(value),
  }
}

function durationLabel(value: Record<string, unknown> | undefined) {
  const duration = finite(value?.duration)
  const unit = text(value?.timeUnit)?.toUpperCase()
  if (!duration || !unit) return
  if (unit.includes("MINUTE") && duration % 60 === 0) return `${duration / 60}小时`
  if (unit.includes("HOUR")) return `${duration}小时`
  if (unit.includes("DAY")) return duration === 7 ? "1周" : `${duration}天`
  return
}

async function queryGlmCodingPlan(providerId: string, key: string | undefined, zhipu: boolean) {
  if (!key) return missingCredential(providerId)
  const url = zhipu
    ? "https://bigmodel.cn/api/monitor/usage/quota/limit"
    : "https://api.z.ai/api/monitor/usage/quota/limit"
  const response = await requestJson(url, {
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
    },
  }, key)
  if (!response.ok) return failed(providerId, response.error)
  const body = record(response.body)
  const limits = zhipu ? record(body?.data)?.limits : (record(body?.data)?.limits ?? body?.limits)
  if (!Array.isArray(limits)) return failed(providerId, "供应商没有返回可显示的余量")
  const rows = limits.flatMap(value => {
    const item = record(value)
    const percentage = finite(item?.percentage)
    const type = text(item?.type)
    const unit = finite(item?.unit)
    if (percentage === undefined || !type) return []
    const label = type === "TIME_LIMIT" ? "MCP" : unit === 3 ? "5小时" : unit === 6 ? "1周" : "余量"
    return [{
      label,
      kind: "percent" as const,
      percentRemaining: clamp(100 - percentage),
      resetAt: epochIso(item?.nextResetTime),
    }]
  })
  return rows.length ? result(providerId, "ok", rows) : failed(providerId, "供应商没有返回可显示的余量")
}

async function queryMiniMax(providerId: string, key: string | undefined, china: boolean) {
  if (!key) return missingCredential(providerId)
  const url = china
    ? "https://api.minimaxi.com/v1/token_plan/remains"
    : "https://api.minimax.io/v1/api/openplatform/coding_plan/remains"
  const response = await requestJson(url, { headers: bearerHeaders(key) }, key)
  if (!response.ok) return failed(providerId, response.error)
  const body = record(response.body)
  const status = finite(record(body?.base_resp)?.status_code)
  if (status !== undefined && status !== 0) return failed(providerId, "供应商接口返回业务错误")
  const models = Array.isArray(body?.model_remains) ? body.model_remains.map(record).filter(Boolean) : []
  const model = models.find(item => text(item?.model_name)?.toLowerCase() === "minimax-m*")
    ?? models.find(item => text(item?.model_name)?.toLowerCase().startsWith("minimax-m"))
    ?? models[0]
  if (!model) return failed(providerId, "供应商没有返回可显示的余量")
  const rows = [
    miniMaxWindow(model, "5小时", "current_interval_total_count", "current_interval_usage_count", "current_interval_remaining_percent", "remains_time", china),
    miniMaxWindow(model, "1周", "current_weekly_total_count", "current_weekly_usage_count", "current_weekly_remaining_percent", "weekly_remains_time", china),
  ].filter((value): value is QuotaRow => Boolean(value))
  return rows.length ? result(providerId, "ok", rows) : failed(providerId, "供应商没有返回可显示的余量")
}

function miniMaxWindow(
  model: Record<string, unknown>,
  label: string,
  totalKey: string,
  countKey: string,
  percentKey: string,
  resetKey: string,
  countIsUsed: boolean,
): QuotaRow | undefined {
  const total = finite(model[totalKey])
  const count = finite(model[countKey])
  const reported = finite(model[percentKey])
  const remaining = total !== undefined && count !== undefined ? (countIsUsed ? total - count : count) : undefined
  const percent = total !== undefined && total > 0 && remaining !== undefined ? (remaining / total) * 100 : reported
  if (percent === undefined) return
  const resetOffset = finite(model[resetKey])
  return {
    label,
    kind: "percent",
    percentRemaining: clamp(percent),
    detail: total !== undefined && count !== undefined
      ? `${formatNumber(countIsUsed ? count : total - count)} / ${formatNumber(total)}`
      : undefined,
    resetAt: resetOffset !== undefined ? new Date(Date.now() + Math.max(0, resetOffset)).toISOString() : undefined,
  }
}

async function queryChutes(providerId: string, key?: string) {
  if (!key) return missingCredential(providerId)
  const response = await requestJson("https://api.chutes.ai/users/me/quota_usage/me", {
    headers: bearerHeaders(key),
  }, key)
  if (!response.ok) return failed(providerId, response.error)
  const body = record(response.body)
  const quota = finite(body?.quota)
  const used = finite(body?.used)
  if (quota === undefined || quota <= 0 || used === undefined) return failed(providerId, "供应商没有返回可显示的余量")
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return result(providerId, "ok", [{
    label: "每日",
    kind: "percent",
    percentRemaining: clamp(((quota - used) / quota) * 100),
    detail: `${formatNumber(used)} / ${formatNumber(quota)}`,
    resetAt: tomorrow.toISOString(),
  }])
}

async function querySynthetic(providerId: string, key?: string) {
  if (!key) return missingCredential(providerId)
  const response = await requestJson("https://api.synthetic.new/v2/quotas", {
    headers: bearerHeaders(key),
  }, key)
  if (!response.ok) return failed(providerId, response.error)
  const body = record(response.body)
  const fiveHour = record(body?.rollingFiveHourLimit)
  const weekly = record(body?.weeklyTokenLimit)
  const rows: QuotaRow[] = []
  const fiveMax = finite(fiveHour?.max)
  const fiveRemaining = finite(fiveHour?.remaining)
  if (fiveMax !== undefined && fiveMax > 0 && fiveRemaining !== undefined) {
    rows.push({
      label: "5小时",
      kind: "percent",
      percentRemaining: clamp((fiveRemaining / fiveMax) * 100),
      detail: `${formatNumber(fiveMax - fiveRemaining)} / ${formatNumber(fiveMax)}`,
      resetAt: iso(fiveHour?.nextTickAt),
    })
  }
  const weeklyMax = currencyNumber(weekly?.maxCredits)
  const weeklyRemaining = currencyNumber(weekly?.remainingCredits)
  if (weeklyMax !== undefined && weeklyMax > 0 && weeklyRemaining !== undefined) {
    rows.push({
      label: "1周",
      kind: "percent",
      percentRemaining: clamp((weeklyRemaining / weeklyMax) * 100),
      detail: `$${(weeklyMax - weeklyRemaining).toFixed(2)} / $${weeklyMax.toFixed(2)}`,
      resetAt: iso(weekly?.nextRegenAt),
    })
  }
  return rows.length ? result(providerId, "ok", rows) : failed(providerId, "供应商没有返回可显示的余量")
}

async function queryNanoGpt(providerId: string, key?: string) {
  if (!key) return missingCredential(providerId)
  const headers = { "x-api-key": key }
  const [usage, balance] = await Promise.all([
    requestJson("https://nano-gpt.com/api/subscription/v1/usage", { headers }, key),
    requestJson("https://nano-gpt.com/api/check-balance", { method: "POST", headers }, key),
  ])
  const rows: QuotaRow[] = []
  if (usage.ok) {
    const body = record(usage.body)
    const limits = record(body?.limits)
    const daily = nanoWindow(record(body?.daily), finite(limits?.daily), "每日")
    const monthly = nanoWindow(record(body?.monthly), finite(limits?.monthly), "1月", iso(record(body?.period)?.currentPeriodEnd))
    if (daily) rows.push(daily)
    if (monthly) rows.push(monthly)
  }
  if (balance.ok) {
    const body = record(balance.body)
    const usd = text(body?.usd_balance)
    const nano = text(body?.nano_balance)
    if (usd) rows.push({ label: "余额", kind: "value", value: `$${usd}` })
    else if (nano) rows.push({ label: "余额", kind: "value", value: `${nano} NANO` })
  }
  if (rows.length) return result(providerId, "ok", rows)
  return failed(providerId, !usage.ok ? usage.error : !balance.ok ? balance.error : "供应商没有返回可显示的余量")
}

function nanoWindow(
  value: Record<string, unknown> | undefined,
  limit: number | undefined,
  label: string,
  fallbackReset?: string,
): QuotaRow | undefined {
  if (!value) return
  const used = finite(value.used)
  const remaining = finite(value.remaining)
  const derivedLimit = limit ?? (used !== undefined && remaining !== undefined ? used + remaining : undefined)
  if (derivedLimit === undefined || derivedLimit <= 0) return
  const left = remaining ?? Math.max(0, derivedLimit - (used ?? 0))
  return {
    label,
    kind: "percent",
    percentRemaining: clamp((left / derivedLimit) * 100),
    detail: `${formatNumber(used ?? derivedLimit - left)} / ${formatNumber(derivedLimit)}`,
    resetAt: epochIso(value.resetAt) ?? fallbackReset,
  }
}

async function queryXai(providerId: string, token?: string) {
  if (!token) return failed(providerId, "xAI 余量需要 OAuth 登录")
  const response = await requestJson("https://cli-chat-proxy.grok.com/v1/billing?format=credits", {
    headers: {
      ...bearerHeaders(token),
      "x-grok-client-surface": "grok-build",
      "x-grok-client-version": "1.0.0",
    },
  }, token)
  if (!response.ok) return failed(providerId, response.error)
  const config = record(record(response.body)?.config)
  const percentUsed = finite(config?.creditUsagePercent) ?? 0
  const period = record(config?.currentPeriod)
  const type = text(period?.type)?.toUpperCase()
  const label = type?.includes("WEEK") ? "1周" : type?.includes("MONTH") ? "1月" : type?.includes("DAY") ? "每日" : "当前周期"
  return result(providerId, "ok", [{
    label,
    kind: "percent",
    percentRemaining: clamp(100 - percentUsed),
    resetAt: iso(period?.end ?? config?.billingPeriodEnd),
  }])
}

type OpenCodeGoConfigResolution =
  | {
      state: "configured"
      workspaceId: string
      authCookie: string
      source: OpenCodeGoQuotaConfig["source"]
    }
  | {
      state: "incomplete"
      workspaceId: string
      authCookie?: string
      hasAuthCookie: boolean
      source: OpenCodeGoQuotaConfig["source"]
      missing: "workspaceId" | "authCookie"
    }
  | { state: "none" }

const OPENCODE_GO_CREDENTIAL_ID = "quota.opencode-go"
const SCRAPED_NUMBER_PATTERN = String.raw`(-?\d+(?:\.\d+)?)`
const OPENCODE_GO_SSR_PATTERNS = {
  rolling: [
    new RegExp(String.raw`rollingUsage:\$R\[\d+\]=\{[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
    new RegExp(String.raw`rollingUsage:\$R\[\d+\]=\{[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
  ],
  weekly: [
    new RegExp(String.raw`weeklyUsage:\$R\[\d+\]=\{[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
    new RegExp(String.raw`weeklyUsage:\$R\[\d+\]=\{[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
  ],
  monthly: [
    new RegExp(String.raw`monthlyUsage:\$R\[\d+\]=\{[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
    new RegExp(String.raw`monthlyUsage:\$R\[\d+\]=\{[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
  ],
} as const

export async function getOpenCodeGoQuotaConfig(userDataPath: string): Promise<OpenCodeGoQuotaConfig> {
  const config = await resolveOpenCodeGoConfig(userDataPath)
  if (config.state === "configured") {
    return {
      workspaceId: config.workspaceId,
      hasAuthCookie: true,
      source: config.source,
    }
  }
  if (config.state === "incomplete") {
    return {
      workspaceId: config.workspaceId,
      hasAuthCookie: config.hasAuthCookie,
      source: config.source,
    }
  }
  return { workspaceId: "", hasAuthCookie: false, source: "none" }
}

export async function updateOpenCodeGoQuotaConfig(
  userDataPath: string,
  input: OpenCodeGoQuotaConfigUpdate,
): Promise<OpenCodeGoQuotaConfig> {
  const { setSecureCredential } = await import("../credentials.ts")
  const existing = await resolveOpenCodeGoConfig(userDataPath)
  const workspaceId = input.workspaceId.trim()
  const existingAuthCookie = existing.state === "configured" || existing.state === "incomplete"
    ? existing.authCookie ?? ""
    : ""
  const authCookie = input.clearAuthCookie
    ? ""
    : normalizeAuthCookie(input.authCookie) ?? existingAuthCookie
  await setSecureCredential(
    OPENCODE_GO_CREDENTIAL_ID,
    workspaceId || authCookie ? { workspaceId, authCookie } : null,
  )
  return getOpenCodeGoQuotaConfig(userDataPath)
}

async function resolveOpenCodeGoConfig(userDataPath: string): Promise<OpenCodeGoConfigResolution> {
  const envWorkspaceId = process.env.OPENCODE_GO_WORKSPACE_ID?.trim() ?? ""
  const envAuthCookie = normalizeAuthCookie(process.env.OPENCODE_GO_AUTH_COOKIE) ?? ""
  if (envWorkspaceId || envAuthCookie) {
    if (envWorkspaceId && envAuthCookie) {
      return {
        state: "configured",
        workspaceId: envWorkspaceId,
        authCookie: envAuthCookie,
        source: "environment",
      }
    }
    return {
      state: "incomplete",
      workspaceId: envWorkspaceId,
      ...(envAuthCookie ? { authCookie: envAuthCookie } : {}),
      hasAuthCookie: Boolean(envAuthCookie),
      source: "environment",
      missing: envWorkspaceId ? "authCookie" : "workspaceId",
    }
  }

  const { getSecureCredential } = await import("../credentials.ts")
  const secure = await getSecureCredential(OPENCODE_GO_CREDENTIAL_ID)
  const secureWorkspaceId = secure?.workspaceId?.trim() ?? ""
  const secureAuthCookie = normalizeAuthCookie(secure?.authCookie) ?? ""
  if (secureWorkspaceId || secureAuthCookie) {
    if (secureWorkspaceId && secureAuthCookie) {
      return {
        state: "configured",
        workspaceId: secureWorkspaceId,
        authCookie: secureAuthCookie,
        source: "secure-storage",
      }
    }
    return {
      state: "incomplete",
      workspaceId: secureWorkspaceId,
      ...(secureAuthCookie ? { authCookie: secureAuthCookie } : {}),
      hasAuthCookie: Boolean(secureAuthCookie),
      source: "secure-storage",
      missing: secureWorkspaceId ? "authCookie" : "workspaceId",
    }
  }

  for (const path of openCodeGoConfigCandidates(userDataPath)) {
    const loaded = await readFile(path, "utf8")
      .then(content => record(JSON.parse(content) as unknown))
      .catch(() => undefined)
    if (!loaded) continue
    const workspaceId = text(loaded.workspaceId) ?? ""
    const authCookie = normalizeAuthCookie(loaded.authCookie) ?? ""
    if (workspaceId && authCookie) {
      return {
        state: "configured",
        workspaceId,
        authCookie,
        source: "config-file",
      }
    }
    return {
      state: "incomplete",
      workspaceId,
      ...(authCookie ? { authCookie } : {}),
      hasAuthCookie: Boolean(authCookie),
      source: "config-file",
      missing: workspaceId ? "authCookie" : "workspaceId",
    }
  }
  return { state: "none" }
}

function openCodeGoConfigCandidates(userDataPath: string) {
  const configDirs = [
    join(userDataPath, "config", "opencode"),
    process.env.OPENCODE_CONFIG_DIR,
    process.env.XDG_CONFIG_HOME ? join(process.env.XDG_CONFIG_HOME, "opencode") : undefined,
    join(homedir(), ".config", "opencode"),
    process.platform === "darwin" ? join(homedir(), "Library", "Application Support", "opencode") : undefined,
    process.platform === "win32" && process.env.APPDATA ? join(process.env.APPDATA, "opencode") : undefined,
    process.platform === "win32" && process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "opencode") : undefined,
  ].filter((value): value is string => Boolean(value))
  return [...new Set(configDirs)].map(directory => join(directory, "opencode-quota", "opencode-go.json"))
}

function normalizeAuthCookie(value: unknown) {
  const raw = text(value)
  if (!raw) return
  const cookie = raw.split(";").map(item => item.trim()).find(item => item.startsWith("auth="))
  return (cookie ? cookie.slice("auth=".length) : raw).trim() || undefined
}

async function queryOpenCodeGo(providerId: string, userDataPath: string) {
  const config = await resolveOpenCodeGoConfig(userDataPath)
  if (config.state === "none") {
    return failed(providerId, "请先配置 OpenCode Go 工作区 ID 和 auth Cookie")
  }
  if (config.state === "incomplete") {
    return failed(providerId, config.missing === "workspaceId" ? "请配置 OpenCode Go 工作区 ID" : "请配置 OpenCode Go auth Cookie")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(`https://opencode.ai/workspace/${encodeURIComponent(config.workspaceId)}/go`, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Gecko/20100101 Firefox/148.0",
        Accept: "text/html",
        Cookie: `auth=${config.authCookie}`,
      },
    })
    if (response.status >= 300 && response.status < 400) return failed(providerId, "OpenCode Go 登录状态已失效")
    if (!response.ok) return failed(providerId, `OpenCode Go Dashboard 返回 HTTP ${response.status}`)
    const windows = parseOpenCodeGoDashboard(await response.text())
    const rows = [
      windows.rolling ? openCodeGoRow("5小时", windows.rolling) : undefined,
      windows.weekly ? openCodeGoRow("1周", windows.weekly) : undefined,
      windows.monthly ? openCodeGoRow("1月", windows.monthly) : undefined,
    ].filter((value): value is QuotaRow => Boolean(value))
    return rows.length
      ? result(providerId, "ok", rows)
      : failed(providerId, "无法解析 OpenCode Go Dashboard 的余量信息")
  } catch (error) {
    return failed(providerId, safeError(error))
  } finally {
    clearTimeout(timeout)
  }
}

type OpenCodeGoWindow = {
  usagePercent: number
  resetInSec: number
}

export function parseOpenCodeGoDashboard(html: string) {
  const ssr = {
    rolling: parseOpenCodeGoSsrWindow(html, OPENCODE_GO_SSR_PATTERNS.rolling),
    weekly: parseOpenCodeGoSsrWindow(html, OPENCODE_GO_SSR_PATTERNS.weekly),
    monthly: parseOpenCodeGoSsrWindow(html, OPENCODE_GO_SSR_PATTERNS.monthly),
  }
  if (ssr.rolling || ssr.weekly || ssr.monthly) return ssr
  return parseOpenCodeGoDataSlots(html)
}

function parseOpenCodeGoSsrWindow(
  html: string,
  patterns: readonly [RegExp, RegExp],
): OpenCodeGoWindow | undefined {
  const percentFirst = patterns[0].exec(html)
  if (percentFirst) {
    const usagePercent = Number(percentFirst[1])
    const resetInSec = Number(percentFirst[2])
    if (Number.isFinite(usagePercent) && Number.isFinite(resetInSec)) return { usagePercent, resetInSec }
  }
  const resetFirst = patterns[1].exec(html)
  if (!resetFirst) return
  const resetInSec = Number(resetFirst[1])
  const usagePercent = Number(resetFirst[2])
  return Number.isFinite(usagePercent) && Number.isFinite(resetInSec) ? { usagePercent, resetInSec } : undefined
}

function parseOpenCodeGoDataSlots(html: string): Partial<Record<"rolling" | "weekly" | "monthly", OpenCodeGoWindow>> {
  return html.split(/data-slot="usage-item"/).slice(1).reduce<Partial<Record<"rolling" | "weekly" | "monthly", OpenCodeGoWindow>>>((result, content) => {
    const label = content.match(/data-slot="usage-label">([^<]+)</)?.[1]?.trim().toLowerCase()
    const usagePercent = Number(content.match(/data-slot="usage-value">[^0-9]*(\d+(?:\.\d+)?)/)?.[1])
    const reset = content.match(/data-slot="(reset-time|reset-now)">([\s\S]*?)<\/span>/)
    if (!label || !Number.isFinite(usagePercent) || !reset) return result
    const resetInSec = reset[1] === "reset-now"
      ? 0
      : parseOpenCodeGoDuration(reset[2]
          .replace(/<!--\$-->/g, "")
          .replace(/<!--\/-->/g, "")
          .replace(/Resets?\s*in\s*/i, "")
          .trim())
    if (resetInSec === undefined) return result
    const key = label.includes("rolling") ? "rolling" : label.includes("weekly") ? "weekly" : label.includes("monthly") ? "monthly" : undefined
    if (key) result[key] = { usagePercent, resetInSec }
    return result
  }, {})
}

function parseOpenCodeGoDuration(value: string) {
  const normalized = value.toLowerCase().trim().replace(/\s+/g, " ")
  if (["reset-now", "reset now", "now", "resets now"].includes(normalized)) return 0
  const units = [
    { pattern: /(\d+(?:\.\d+)?)\s*days?/, seconds: 86_400 },
    { pattern: /(\d+(?:\.\d+)?)\s*hours?/, seconds: 3_600 },
    { pattern: /(\d+(?:\.\d+)?)\s*minutes?/, seconds: 60 },
    { pattern: /(\d+(?:\.\d+)?)\s*seconds?/, seconds: 1 },
  ]
  const matches = units.flatMap(unit => {
    const match = normalized.match(unit.pattern)
    return match ? [Number(match[1]) * unit.seconds] : []
  })
  return matches.length ? matches.reduce((total, seconds) => total + seconds, 0) : undefined
}

function openCodeGoRow(label: string, window: OpenCodeGoWindow): QuotaRow {
  const resetInSec = Math.max(0, window.resetInSec)
  return {
    label,
    kind: "percent",
    percentRemaining: clamp(100 - Math.max(0, window.usagePercent)),
    resetAt: new Date(Date.now() + resetInSec * 1_000).toISOString(),
  }
}

function parsePercentWindow(value: Record<string, unknown> | undefined, key: "used_percent" | "remaining_percent"): QuotaRow | undefined {
  const percent = finite(value?.[key])
  if (percent === undefined) return
  return {
    label: "",
    kind: "percent",
    percentRemaining: clamp(key === "used_percent" ? 100 - percent : percent),
    resetAt: epochSecondsIso(value?.reset_at) ?? offsetSecondsIso(value?.reset_after_seconds),
  }
}

function resetTime(value: Record<string, unknown>) {
  return ["reset_at", "resetAt", "reset_time", "resetTime"]
    .map(key => iso(value[key]))
    .find(Boolean)
    ?? ["reset_in", "resetIn", "ttl"]
      .map(key => offsetSecondsIso(value[key]))
      .find(Boolean)
}

function bearerHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "User-Agent": "OpenCodex-Quota/1.0",
  }
}

function missingCredential(providerId: string) {
  return failed(providerId, "未找到该供应商的 API Key")
}

function failed(providerId: string, error: string) {
  return result(providerId, "error", [], error)
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function finite(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function iso(value: unknown) {
  const raw = text(value)
  if (!raw) return
  const time = Date.parse(raw)
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined
}

function epochIso(value: unknown) {
  const milliseconds = finite(value)
  if (milliseconds === undefined || milliseconds <= 0) return
  return new Date(milliseconds).toISOString()
}

function epochSecondsIso(value: unknown) {
  const seconds = finite(value)
  if (seconds === undefined || seconds <= 0) return
  return new Date(seconds * 1_000).toISOString()
}

function offsetSecondsIso(value: unknown) {
  const seconds = finite(value)
  if (seconds === undefined || seconds <= 0) return
  return new Date(Date.now() + seconds * 1_000).toISOString()
}

function currencyNumber(value: unknown) {
  const raw = text(value)?.replace(/^\$/, "")
  if (!raw) return
  const amount = Number(raw)
  return Number.isFinite(amount) ? amount : undefined
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[\r\n]+/g, " ").slice(0, 180)
}

function jwtAccountId(token: string) {
  const payload = token.split(".")[1]
  if (!payload) return
  try {
    const decoded = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as unknown
    return text(record(record(decoded)?.["https://api.openai.com/auth"])?.chatgpt_account_id)
  } catch {
    return
  }
}
