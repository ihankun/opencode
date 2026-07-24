import { listOpenAiModels, providerHttpError } from "./modelDiscovery.ts"
import type { SpeechProvider } from "./types.ts"

export const openRouterTranscriptionProvider: SpeechProvider = {
  id: "openrouter-transcription",
  listModels: listOpenAiModels,
  async transcribe(config, input) {
    const request = openRouterTranscriptionRequest(config, input)
    const response = await fetch(request.endpoint, request.init)
    const body = await response.text()
    if (!response.ok) throw new Error(providerHttpError("Speech transcription", response.status, body))
    const value = JSON.parse(body) as unknown
    if (!value || typeof value !== "object" || !("text" in value) || typeof value.text !== "string") {
      throw new Error("Speech transcription returned an invalid response")
    }
    return value.text.trim()
  },
}

export function openRouterTranscriptionRequest(config: Parameters<SpeechProvider["transcribe"]>[0], input: Parameters<SpeechProvider["transcribe"]>[1]) {
  const endpoint = new URL(config.baseUrl)
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}/audio/transcriptions`
  endpoint.search = ""
  endpoint.hash = ""
  return {
    endpoint,
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        input_audio: {
          data: Buffer.from(input.data).toString("base64"),
          format: audioFormat(input.mimeType),
        },
      }),
      redirect: "error",
      signal: input.signal,
    } satisfies RequestInit,
  }
}

function audioFormat(mimeType: string) {
  const normalized = mimeType.toLowerCase()
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3"
  if (normalized.includes("wav")) return "wav"
  if (normalized.includes("mp4")) return "mp4"
  if (normalized.includes("ogg")) return "ogg"
  return "webm"
}
