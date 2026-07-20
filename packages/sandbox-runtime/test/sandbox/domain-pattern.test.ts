import { describe, test, expect } from 'bun:test'
import {
  isInjectHostCoveredByAllowedDomains,
  isIPPattern,
  matchesDomainPattern,
  matchesIPPattern,
} from '../../src/sandbox/domain-pattern.js'

describe('matchesDomainPattern', () => {
  test('exact match is case-insensitive', () => {
    expect(matchesDomainPattern('API.Example.com', 'api.example.com')).toBe(
      true,
    )
  })

  test('wildcard matches strict subdomains only', () => {
    expect(matchesDomainPattern('a.example.com', '*.example.com')).toBe(true)
    expect(matchesDomainPattern('a.b.example.com', '*.example.com')).toBe(true)
    expect(matchesDomainPattern('example.com', '*.example.com')).toBe(false)
    expect(matchesDomainPattern('notexample.com', '*.example.com')).toBe(false)
  })
})

describe('matchesIPPattern', () => {
  test('matches exact IPv4 and IPv6 addresses', () => {
    expect(matchesIPPattern('192.168.1.10', '192.168.1.10')).toBe(true)
    expect(matchesIPPattern('192.168.1.11', '192.168.1.10')).toBe(false)
    expect(matchesIPPattern('2001:db8::1', '2001:db8::1')).toBe(true)
  })

  test('matches IPv4 and IPv6 CIDR ranges', () => {
    expect(matchesIPPattern('10.20.30.40', '10.0.0.0/8')).toBe(true)
    expect(matchesIPPattern('11.20.30.40', '10.0.0.0/8')).toBe(false)
    expect(matchesIPPattern('2001:db8:1::1', '2001:db8::/32')).toBe(true)
    expect(matchesIPPattern('2001:db9::1', '2001:db8::/32')).toBe(false)
    expect(matchesIPPattern('::ffff:127.0.0.1', '127.0.0.0/8')).toBe(true)
  })

  test('validates address and CIDR syntax', () => {
    expect(isIPPattern('127.0.0.1')).toBe(true)
    expect(isIPPattern('127.0.0.0/8')).toBe(true)
    expect(isIPPattern('::1')).toBe(true)
    expect(isIPPattern('2001:db8::/129')).toBe(false)
    expect(isIPPattern('192.168.1.1/33')).toBe(false)
    expect(isIPPattern('192.168.1.1/abc')).toBe(false)
  })
})

// Generic "is this pattern fully covered by that pattern list" predicate.
// Used for injectHosts ⊆ allowedDomains and, since tlsTerminate
// excludeDomains, for "could this injectHost ever be injected".
describe('isInjectHostCoveredByAllowedDomains', () => {
  test('exact host covered by an exact entry or a wildcard', () => {
    expect(
      isInjectHostCoveredByAllowedDomains('api.example.com', [
        'api.example.com',
      ]),
    ).toBe(true)
    expect(
      isInjectHostCoveredByAllowedDomains('api.example.com', ['*.example.com']),
    ).toBe(true)
    expect(
      isInjectHostCoveredByAllowedDomains('api.example.com', ['example.com']),
    ).toBe(false)
  })

  test('a wildcard is never covered by exact entries', () => {
    expect(
      isInjectHostCoveredByAllowedDomains('*.example.com', [
        'api.example.com',
        'b.example.com',
      ]),
    ).toBe(false)
  })

  test('a wildcard is covered by an equal or ancestor wildcard only', () => {
    expect(
      isInjectHostCoveredByAllowedDomains('*.api.example.com', [
        '*.example.com',
      ]),
    ).toBe(true)
    expect(
      isInjectHostCoveredByAllowedDomains('*.example.com', [
        '*.api.example.com',
      ]),
    ).toBe(false)
  })
})
