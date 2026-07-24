export type SpeechModelPreferences = {
  baseUrl: string
  model: string
  language: string
}

export type SpeechModelConfig = SpeechModelPreferences & {
  hasApiKey: boolean
}

export type SpeechModelUpdate = SpeechModelPreferences & {
  apiKey?: string
  clearApiKey?: boolean
}

export type SpeechTranscriptionInput = {
  data: ArrayBuffer
  mimeType: string
}

export const DEFAULT_SPEECH_MODEL_PREFERENCES: SpeechModelPreferences = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'whisper-1',
  language: '',
}

export function normalizeSpeechModelPreferences(value: unknown): SpeechModelPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SPEECH_MODEL_PREFERENCES }
  const input = value as Partial<SpeechModelPreferences>
  return {
    baseUrl: typeof input.baseUrl === 'string' && input.baseUrl.trim()
      ? input.baseUrl.trim().replace(/\/+$/, '')
      : DEFAULT_SPEECH_MODEL_PREFERENCES.baseUrl,
    model: typeof input.model === 'string' && input.model.trim()
      ? input.model.trim()
      : DEFAULT_SPEECH_MODEL_PREFERENCES.model,
    language: typeof input.language === 'string' ? input.language.trim() : '',
  }
}
