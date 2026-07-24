import { listOpenAiModels, parseProviderJson, providerHttpError } from "./modelDiscovery.ts"
import { chatCompletionText } from "./openAiChatAudio.ts"
import type { SpeechProvider } from "./types.ts"

export const dashscopeChatAudioProvider: SpeechProvider = {
  id: "dashscope-chat-audio",
  listModels: listOpenAiModels,
  async transcribe(config, input) {
    const request = dashscopeChatAudioRequest(config, input)
    const response = await fetch(request.endpoint, request.init)
    const body = await response.text()
    if (!response.ok) throw new Error(providerHttpError("Speech transcription", response.status, body))
    const text = chatCompletionText(parseProviderJson("Speech transcription", body))
    if (!text) throw new Error("Speech transcription returned an empty chat completion")
    return text
  },
}

export function dashscopeChatAudioRequest(config: Parameters<SpeechProvider["transcribe"]>[0], input: Parameters<SpeechProvider["transcribe"]>[1]) {
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
            },
          }],
        }],
        stream: false,
        ...(config.language ? { asr_options: { language: config.language } } : {}),
      }),
      redirect: "error",
      signal: input.signal,
    } satisfies RequestInit,
  }
}
