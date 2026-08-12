import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

type ParsedAddress = {
  value: bigint
  bits: 32 | 128
}

type NetworkRule = ParsedAddress & { prefix: number }

const PRIVATE_NETWORKS = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "::/128",
  "::1/128",
  "2001:db8::/32",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
].flatMap((rule) => {
  const parsed = parseNetworkRule(rule)
  return parsed ? [parsed] : []
})

const dnsCache = new Map<string, { blocked: boolean; expiresAt: number }>()
const pendingDnsChecks = new Map<string, Promise<boolean>>()
const DNS_CACHE_TTL = 30_000
const MAX_DNS_CACHE_ENTRIES = 128

export function isLocalPreviewHost(value: string) {
  const host = normalizeHost(value)
  if (host === "localhost" || host.endsWith(".localhost")) return true

  const address = parseAddress(host)
  if (!address) return false
  if (address.bits === 32) return (address.value >> 24n) === 127n
  return address.value === 1n
}

export function isPrivateIpAddress(value: string) {
  const address = parseAddress(value)
  if (!address) return false

  if (address.bits === 128 && address.value >> 32n === 0xffffn) {
    const mapped = address.value & 0xffffffffn
    const ipv4 = [24n, 16n, 8n, 0n].map((shift) => String((mapped >> shift) & 255n)).join(".")
    return isPrivateIpAddress(ipv4)
  }

  return PRIVATE_NETWORKS.some((rule) => matchesNetwork(address, rule))
}

export async function assertBrowserTarget(rawUrl: string, allowLocalPreview = true) {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error("Invalid browser URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP(S) URLs can be opened")
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed")
  }

  const host = normalizeHost(url.hostname)
  if (!host) throw new Error("Browser URL must contain a host")
  if (isLocalPreviewHost(host)) {
    if (allowLocalPreview) return url
    throw new Error("Local preview addresses are only allowed for local preview pages")
  }
  if (isPrivateIpAddress(host) || await resolvesToPrivateAddress(host)) {
    throw new Error("Private and local network addresses are blocked")
  }
  return url
}

async function resolvesToPrivateAddress(host: string) {
  if (isIP(host)) return false

  const cached = dnsCache.get(host)
  if (cached && cached.expiresAt > Date.now()) return cached.blocked
  if (cached) dnsCache.delete(host)

  const pending = pendingDnsChecks.get(host)
  if (pending) return pending

  const check = lookup(host, { all: true, verbatim: true })
    .then((addresses) => addresses.length === 0 || addresses.some((entry) => isPrivateIpAddress(entry.address)))
    .catch(() => true)
    .then((blocked) => {
      pendingDnsChecks.delete(host)
      dnsCache.delete(host)
      dnsCache.set(host, { blocked, expiresAt: Date.now() + DNS_CACHE_TTL })
      while (dnsCache.size > MAX_DNS_CACHE_ENTRIES) {
        const oldest = dnsCache.keys().next().value
        if (oldest === undefined) break
        dnsCache.delete(oldest)
      }
      return blocked
    })

  pendingDnsChecks.set(host, check)
  return check
}

function normalizeHost(value: string) {
  return value.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase()
}

function matchesNetwork(address: ParsedAddress, rule: NetworkRule) {
  if (address.bits !== rule.bits) return false
  const mask = rule.prefix === 0
    ? 0n
    : ((1n << BigInt(rule.bits)) - 1n) ^ ((1n << BigInt(rule.bits - rule.prefix)) - 1n)
  return (address.value & mask) === (rule.value & mask)
}

function parseNetworkRule(value: string): NetworkRule | undefined {
  const slash = value.lastIndexOf("/")
  const host = slash === -1 ? value : value.slice(0, slash)
  const address = parseAddress(host)
  const prefix = slash === -1 ? address?.bits : Number(value.slice(slash + 1))
  if (!address || prefix === undefined || !Number.isInteger(prefix) || prefix < 0 || prefix > address.bits) return
  return { ...address, prefix }
}

function parseAddress(value: string): ParsedAddress | undefined {
  const host = normalizeHost(value)
  if (isIP(host) === 4) {
    const parts = host.split(".")
    if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255)) return
    return {
      value: parts.reduce((result, part) => (result << 8n) | BigInt(part), 0n),
      bits: 32,
    }
  }
  if (isIP(host) !== 6) return

  const embedded = host.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  const ipv4 = embedded ? parseAddress(embedded) : undefined
  if (embedded && (!ipv4 || ipv4.bits !== 32)) return
  const normalized = embedded
    ? host.slice(0, -embedded.length) + `${Number(ipv4!.value >> 16n).toString(16)}:${Number(ipv4!.value & 0xffffn).toString(16)}`
    : host
  if ((normalized.match(/::/g) ?? []).length > 1) return

  const [leftValue, rightValue] = normalized.split("::")
  const left = leftValue ? leftValue.split(":") : []
  const right = rightValue ? rightValue.split(":") : []
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/i.test(part))) return
  const missing = 8 - left.length - right.length
  if (normalized.includes("::") ? missing < 1 : missing !== 0) return

  return {
    value: [...left, ...Array.from({ length: missing }, () => "0"), ...right]
      .reduce((result, part) => (result << 16n) | BigInt(`0x${part}`), 0n),
    bits: 128,
  }
}
