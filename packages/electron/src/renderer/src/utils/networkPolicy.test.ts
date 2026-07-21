import { describe, expect, test } from 'bun:test'
import type { CustomOpenCodeSecurityConfig } from '../../../preload'
import { evaluateNetworkTarget, isPrivateNetworkAddress, isValidIPRule, matchesNetworkRule } from './networkPolicy'

const config: CustomOpenCodeSecurityConfig = {
  sandbox: {
    enabled: true,
    denyRead: [], allowRead: [], allowWrite: [], denyWrite: [],
    allowedDomains: ['github.com', '*.npmjs.org'], deniedDomains: ['blocked.npmjs.org'],
    allowedIPs: ['203.0.113.0/24', '2001:db8::/32'], deniedIPs: ['203.0.113.9', '2001:db8:bad::/48'],
    blockPrivateNetworks: true, allowUnixSockets: [], allowAllUnixSockets: false, allowLocalBinding: false,
  },
  audit: { enabled: false, directory: '' },
}

describe('network policy', () => {
  test('matches IPv4 and IPv6 CIDRs with deny precedence', () => {
    expect(matchesNetworkRule('203.0.113.8', '203.0.113.0/24')).toBe(true)
    expect(matchesNetworkRule('2001:db8::8', '2001:db8::/32')).toBe(true)
    expect(evaluateNetworkTarget('203.0.113.9', config).allowed).toBe(false)
    expect(evaluateNetworkTarget('[2001:db8:bad::1]', config).allowed).toBe(false)
  })

  test('wildcards exclude the apex and explicit deny wins', () => {
    expect(evaluateNetworkTarget('registry.npmjs.org', config).allowed).toBe(true)
    expect(evaluateNetworkTarget('npmjs.org', config).allowed).toBe(false)
    expect(evaluateNetworkTarget('blocked.npmjs.org', config).allowed).toBe(false)
  })

  test('blocks private, loopback and mapped loopback addresses', () => {
    expect(isPrivateNetworkAddress('127.0.0.1')).toBe(true)
    expect(isPrivateNetworkAddress('192.168.1.2')).toBe(true)
    expect(isPrivateNetworkAddress('::1')).toBe(true)
    expect(isPrivateNetworkAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateNetworkAddress('8.8.8.8')).toBe(false)
  })

  test('validates IP rules rather than accepting malformed octets or prefixes', () => {
    expect(isValidIPRule('10.0.0.0/8')).toBe(true)
    expect(isValidIPRule('2001:db8::/32')).toBe(true)
    expect(isValidIPRule('999.1.1.1')).toBe(false)
    expect(isValidIPRule('2001:db8::/129')).toBe(false)
  })
})
