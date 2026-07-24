import { listOpenAiModels, providerHttpError } from "./modelDiscovery.ts"
import type { SpeechProvider } from "./types.ts"

export const openAiChatAudioProvider: SpeechProvider = {
  id: "openai-chat-audio",
  listModels: listOpenAiModels,
  async transcribe(config, input) {
    const request = openAiChatAudioRequest(config, input)
    const response = await fetch(request.endpoint, request.init)
    const body = await response.text()
    if (!response.ok) throw new Error(providerHttpError("Speech transcription", response.status, body))
    const value = JSON.parse(body) as unknown
    const text = chatCompletionText(value)
    if (!text) throw new Error("Speech transcription returned an invalid chat completion")
    return text
  },
}

export function openAiChatAudioRequest(config: Parameters<SpeechProvider["transcribe"]>[0], input: Parameters<SpeechProvider["transcribe"]>[1]) {
  const endpoint = new URL(config.baseUrl)
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}/chat/completions`
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
        messages: [{
          role: "user",
          content: [{
            type: "input_audio",
            input_audio: {
              data: `data:${input.mimeType};base64,${Buffer.from(input.data).toString("base64")}`,
              format: audioFormat(input.mimeType),
            },
          }],
        }],
        ...(config.language ? { asr_options: { language: config.language } } : {}),
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

function chatCompletionText(value: unknown) {
  if (!value || typeof value !== "object" || !("choices" in value) || !Array.isArray(value.choices)) return ""
  const choice = value.choices[0]
  if (!choice || typeof choice !== "object" || !("message" in choice)) return ""
  const message = choice.message
  if (!message || typeof message !== "object" || !("content" in message)) return ""
  if (typeof message.content === "string") return message.content.trim()
  if (!Array.isArray(message.content)) return ""
  return message.content
    .flatMap((item: unknown) => item && typeof item === "object" && "text" in item && typeof item.text === "string" ? [item.text] : [])
    .join("")
    .trim()
}
