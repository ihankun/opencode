import { afterEach, describe, expect, test } from 'bun:test'
import { getSDKClient, invalidateSDKClient } from './sdk'
import { serverStore } from '../store/serverStore'

const created: string[] = []

afterEach(() => {
  created.splice(0).forEach(id => serverStore.removeServer(id))
  invalidateSDKClient()
})

describe('server-scoped SDK clients', () => {
  test('keeps independent stable clients for each server', () => {
    const remote = serverStore.addServer({ name: 'Remote test', url: 'https://example.test' })
    created.push(remote.id)

    const localClient = getSDKClient('local')
    const remoteClient = getSDKClient(remote.id)

    expect(remoteClient).not.toBe(localClient)
    expect(getSDKClient('local')).toBe(localClient)
    expect(getSDKClient(remote.id)).toBe(remoteClient)
  })

  test('invalidates one server without discarding other server clients', () => {
    const remote = serverStore.addServer({ name: 'Remote test', url: 'https://example.test' })
    created.push(remote.id)
    const localClient = getSDKClient('local')
    const remoteClient = getSDKClient(remote.id)

    invalidateSDKClient(remote.id)

    expect(getSDKClient('local')).toBe(localClient)
    expect(getSDKClient(remote.id)).not.toBe(remoteClient)
  })
})
