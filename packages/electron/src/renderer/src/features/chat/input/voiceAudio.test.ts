import { describe, expect, test } from 'bun:test'
import { encodeWav } from './voiceAudio'

describe('voice WAV encoding', () => {
  test('writes a mono 16-bit PCM WAV header and samples', () => {
    const buffer = encodeWav(new Float32Array([-1, 0, 1]), 16_000)
    const view = new DataView(buffer)
    expect(new TextDecoder().decode(buffer.slice(0, 4))).toBe('RIFF')
    expect(new TextDecoder().decode(buffer.slice(8, 12))).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16_000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(6)
    expect(view.getInt16(44, true)).toBe(-32_768)
    expect(view.getInt16(46, true)).toBe(0)
    expect(view.getInt16(48, true)).toBe(32_767)
  })
})
