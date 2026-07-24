export const SPEECH_PROVIDER_TYPES = [
  'openai-transcription',
  'openai-chat-audio',
  'dashscope-chat-audio',
  'openrouter-transcription',
] as const

export type SpeechProviderType = typeof SPEECH_PROVIDER_TYPES[number]

export type SpeechModelPreferences = {
  provider: SpeechProviderType
  baseUrl: string
  model: string
  language: string
}

export type SpeechModelConfig = SpeechModelPreferences & {
  hasApiKey: boolean
  apiKeyRequired: boolean
}

export type SpeechModelUpdate = SpeechModelPreferences & {
  apiKey?: string
  clearApiKey?: boolean
}

export type SpeechModelDiscoveryInput = SpeechModelPreferences & {
  apiKey?: string
}

export type SpeechModelOption = {
  id: string
  ownedBy: string
  likelySpeechModel: boolean
}

export type SpeechTranscriptionInput = {
  data: ArrayBuffer
  mimeType: string
}

export const DEFAULT_SPEECH_MODEL_PREFERENCES: SpeechModelPreferences = {
  provider: 'openai-transcription',
  baseUrl: 'https://api.openai.com/v1',
  model: 'whisper-1',
  language: '',
}

export function normalizeSpeechModelPreferences(value: unknown): SpeechModelPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SPEECH_MODEL_PREFERENCES }
  const input = value as Partial<SpeechModelPreferences>
  return {
    provider: typeof input.provider === 'string' && SPEECH_PROVIDER_TYPES.includes(input.provider as SpeechProviderType)
      ? input.provider as SpeechProviderType
      : DEFAULT_SPEECH_MODEL_PREFERENCES.provider,
    baseUrl: typeof input.baseUrl === 'string' && input.baseUrl.trim()
      ? input.baseUrl.trim().replace(/\/+$/, '')
      : DEFAULT_SPEECH_MODEL_PREFERENCES.baseUrl,
    model: typeof input.model === 'string' && input.model.trim()
      ? input.model.trim()
      : DEFAULT_SPEECH_MODEL_PREFERENCES.model,
    language: typeof input.language === 'string' ? input.language.trim() : '',
  }
}
