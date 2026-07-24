import { Blob } from "node:buffer"
import { listOpenAiModels, providerHttpError } from "./modelDiscovery.ts"
import type { SpeechProvider } from "./types.ts"

export const openAiTranscriptionProvider: SpeechProvider = {
  id: "openai-transcription",
  listModels: listOpenAiModels,
  async transcribe(config, input) {
    const request = openAiTranscriptionRequest(config, input)
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

export function openAiTranscriptionRequest(config: Parameters<SpeechProvider["transcribe"]>[0], input: Parameters<SpeechProvider["transcribe"]>[1]) {
  const endpoint = new URL(config.baseUrl)
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}/audio/transcriptions`
  endpoint.search = ""
  endpoint.hash = ""
  const form = new FormData()
  form.append("model", config.model)
  form.append("file", new Blob([input.data], { type: input.mimeType }), `recording.${audioExtension(input.mimeType)}`)
  form.append("response_format", "json")
  if (config.language) form.append("language", config.language)
  return {
    endpoint,
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: form,
      redirect: "error",
      signal: input.signal,
    } satisfies RequestInit,
  }
}

function audioExtension(mimeType: string) {
  const normalized = mimeType.toLowerCase()
  if (normalized.includes("mp4")) return "m4a"
  if (normalized.includes("ogg")) return "ogg"
  if (normalized.includes("wav")) return "wav"
  return "webm"
}
