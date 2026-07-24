import type { SpeechModelOption, SpeechProviderType } from "../../../shared/speechModel.ts"

export type SpeechProviderConfig = {
  baseUrl: URL
  model: string
  language: string
  apiKey: string
}

export type SpeechProviderInput = {
  data: ArrayBuffer
  mimeType: string
  signal: AbortSignal
}

export type SpeechProvider = {
  readonly id: SpeechProviderType
  transcribe(config: SpeechProviderConfig, input: SpeechProviderInput): Promise<string>
  listModels(config: SpeechProviderConfig, signal: AbortSignal): Promise<SpeechModelOption[]>
}
