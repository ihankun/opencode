import { afterEach, describe, expect, test } from 'bun:test'
import { exportServerSettingsBackup, serverStore } from './serverStore'

const created: string[] = []

afterEach(() => {
  created.splice(0).forEach(id => serverStore.removeServer(id))
})

describe('server connection security', () => {
  test('requires explicit consent for remote plain HTTP', () => {
    expect(() => serverStore.addServer({ name: 'Unsafe', url: 'http://example.test:4096' })).toThrow('Explicitly allow insecure HTTP')
    const server = serverStore.addServer({ name: 'Allowed', url: 'http://example.test:4096', allowInsecureHttp: true })
    created.push(server.id)
    expect(server.url).toBe('http://example.test:4096')
  })

  test('allows loopback HTTP and rejects credentials embedded in URLs', () => {
    const local = serverStore.addServer({ name: 'Loopback', url: 'http://127.0.0.1:4096/' })
    created.push(local.id)
    expect(local.url).toBe('http://127.0.0.1:4096')
    expect(() => serverStore.addServer({ name: 'Credential URL', url: 'https://user:secret@example.test' })).toThrow('must not be embedded')
  })

  test('does not include credentials in exported settings', () => {
    const server = serverStore.addServer({ name: 'Authenticated', url: 'https://example.test', auth: { username: 'open', password: 'secret' } })
    created.push(server.id)
    expect(exportServerSettingsBackup().servers.find(item => item.id === server.id)?.auth).toBeUndefined()
  })
})
