import type { CustomOpenCodeSecurityConfig } from '../../../preload'

const PRIVATE_NETWORKS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '::/128',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
  'ff00::/8',
]

export function evaluateNetworkTarget(target: string, config: CustomOpenCodeSecurityConfig) {
  const host = parseNetworkTarget(target)
  if (!host) return { allowed: false, reason: 'deny: invalid host' }
  const ip = parseAddress(host)
  const deniedRules = ip ? config.sandbox.deniedIPs : config.sandbox.deniedDomains
  const denied = deniedRules.find(rule => matchesNetworkRule(host, rule))
  if (denied) return { allowed: false, reason: `deny: ${denied}` }
  if (ip && config.sandbox.blockPrivateNetworks && isPrivateNetworkAddress(host)) {
    return { allowed: false, reason: 'deny: private or local network protection' }
  }
  const allowedRules = ip ? config.sandbox.allowedIPs : config.sandbox.allowedDomains
  const allowed = allowedRules.find(rule => matchesNetworkRule(host, rule))
  if (allowed) {
    return {
      allowed: true,
      reason: ip ? `allow: ${allowed}` : `allow: ${allowed}; resolved IP is revalidated at runtime`,
    }
  }
  return { allowed: false, reason: allowedRules.length === 0 ? 'deny: allowlist is empty' : 'deny: no allowlist rule matched' }
}

export function parseNetworkTarget(target: string) {
  const value = target.trim()
  if (!value) return
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
  } catch {
    return
  }
}

export function matchesNetworkRule(host: string, rule: string) {
  if (rule === '*') return true
  if (rule.startsWith('*.')) {
    const suffix = rule.slice(2).toLowerCase()
    return !parseAddress(host) && host.toLowerCase().endsWith(`.${suffix}`)
  }
  const address = parseAddress(host)
  const network = parseIPRule(rule)
  if (address && network && address.bits === network.bits) {
    const shift = BigInt(address.bits - network.prefix)
    return address.value >> shift === network.value >> shift
  }
  return host.toLowerCase() === rule.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
}

export function isValidDomainRule(value: string, allowAll = false) {
  if (value === '*') return allowAll
  return /^(\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value) && value.length <= 253
}

export function isValidIPRule(value: string, allowAll = false) {
  if (value === '*') return allowAll
  return parseIPRule(value) !== undefined
}

export function isPrivateNetworkAddress(value: string) {
  const address = parseAddress(value)
  if (!address) return false
  if (address.bits === 128 && address.value >> 32n === 0xffffn) {
    const mapped = Number(address.value & 0xffffffffn)
    return isPrivateNetworkAddress([24, 16, 8, 0].map(shift => String((mapped >> shift) & 255)).join('.'))
  }
  return PRIVATE_NETWORKS.some(rule => matchesNetworkRule(value, rule))
}

function parseIPRule(value: string) {
  const normalized = value.replace(/^\[|\]$/g, '')
  const slash = normalized.lastIndexOf('/')
  const address = parseAddress(slash === -1 ? normalized : normalized.slice(0, slash))
  if (!address) return
  const prefixValue = slash === -1 ? address.bits : Number(normalized.slice(slash + 1))
  if (!Number.isInteger(prefixValue) || prefixValue < 0 || prefixValue > address.bits) return
  return { ...address, prefix: prefixValue }
}

function parseAddress(value: string) {
  const ipv4 = parseIPv4(value)
  if (ipv4 !== undefined) return { value: ipv4, bits: 32 as const }
  const ipv6 = parseIPv6(value)
  if (ipv6 !== undefined) return { value: ipv6, bits: 128 as const }
}

function parseIPv4(value: string) {
  const parts = value.split('.')
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part) || Number(part) > 255)) return
  return parts.reduce((result, part) => (result << 8n) | BigInt(part), 0n)
}

function parseIPv6(value: string) {
  if (!value.includes(':') || value.includes('%')) return
  const embedded = value.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  const ipv4 = embedded ? parseIPv4(embedded) : undefined
  if (embedded && ipv4 === undefined) return
  const normalized = embedded
    ? value.slice(0, -embedded.length) + `${Number(ipv4! >> 16n).toString(16)}:${Number(ipv4! & 0xffffn).toString(16)}`
    : value
  if ((normalized.match(/::/g) ?? []).length > 1) return
  const [leftValue, rightValue] = normalized.split('::')
  const left = leftValue ? leftValue.split(':') : []
  const right = rightValue ? rightValue.split(':') : []
  if ([...left, ...right].some(part => !/^[0-9a-f]{1,4}$/i.test(part))) return
  const missing = 8 - left.length - right.length
  if (normalized.includes('::') ? missing < 1 : missing !== 0) return
  return [...left, ...Array.from({ length: missing }, () => '0'), ...right]
    .reduce((result, part) => (result << 16n) | BigInt(`0x${part}`), 0n)
}
