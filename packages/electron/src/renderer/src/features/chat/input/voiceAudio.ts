const speechSampleRate = 16_000

export async function normalizeVoiceRecording(recording: Blob) {
  const context = new AudioContext()
  const decoded = await context.decodeAudioData(await recording.arrayBuffer())
    .finally(() => context.close())
  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * speechSampleRate)),
    speechSampleRate,
  )
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return new Blob([encodeWav(rendered.getChannelData(0), speechSampleRate)], { type: 'audio/wav' })
}

export function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((sample, index) => {
    const normalized = Math.max(-1, Math.min(1, sample))
    view.setInt16(44 + index * 2, normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff, true)
  })
  return buffer
}

function writeAscii(view: DataView, offset: number, value: string) {
  Array.from(value).forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)))
}
