import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_SPEECH_MODEL_PREFERENCES,
  normalizeSpeechModelPreferences,
} from '../../../../shared/speechModel'

describe('speech model preferences', () => {
  test('uses stable OpenAI-compatible defaults', () => {
    expect(normalizeSpeechModelPreferences(undefined)).toEqual(DEFAULT_SPEECH_MODEL_PREFERENCES)
  })

  test('trims fields and removes trailing URL separators', () => {
    expect(normalizeSpeechModelPreferences({
      baseUrl: ' https://speech.example.com/v1/// ',
      model: ' whisper-large-v3 ',
      language: ' zh ',
    })).toEqual({
      baseUrl: 'https://speech.example.com/v1',
      model: 'whisper-large-v3',
      language: 'zh',
    })
  })

  test('falls back when required string fields are empty', () => {
    expect(normalizeSpeechModelPreferences({
      baseUrl: ' ',
      model: '',
      language: 42,
    })).toEqual(DEFAULT_SPEECH_MODEL_PREFERENCES)
  })
})
