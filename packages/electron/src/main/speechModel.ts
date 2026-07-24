import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  DEFAULT_SPEECH_MODEL_PREFERENCES,
  normalizeSpeechModelPreferences,
  type SpeechModelConfig,
  type SpeechModelDiscoveryInput,
  type SpeechModelPreferences,
  type SpeechModelUpdate,
  type SpeechTranscriptionInput,
} from "../shared/speechModel.ts"
import { getSecureCredential, setSecureCredential } from "./credentials"
import { writeLog } from "./logging"
import { speechProvider } from "./speech/providers/factory.ts"

const credentialID = "speech.transcription"
const maxAudioBytes = 25 * 1024 * 1024

export class SpeechModelService {
  private preferences: SpeechModelPreferences = { ...DEFAULT_SPEECH_MODEL_PREFERENCES }

  constructor(private readonly file: string) {}

  async load() {
    this.preferences = await readFile(this.file, "utf8")
      .then(content => normalizeSpeechModelPreferences(JSON.parse(content)))
      .catch(() => ({ ...DEFAULT_SPEECH_MODEL_PREFERENCES }))
  }

  async config(): Promise<SpeechModelConfig> {
    return {
      ...this.preferences,
      hasApiKey: Boolean((await getSecureCredential(credentialID))?.apiKey),
      apiKeyRequired: endpointRequiresAuth(validateBaseUrl(this.preferences.baseUrl)),
    }
  }

  async save(value: unknown): Promise<SpeechModelConfig> {
    if (!value || typeof value !== "object") throw new Error("Invalid speech model configuration")
    const input = value as Partial<SpeechModelUpdate>
    const preferences = normalizeSpeechModelPreferences(input)
    validateBaseUrl(preferences.baseUrl)
    if (typeof input.apiKey === "string" && input.apiKey.trim()) {
      await setSecureCredential(credentialID, { apiKey: input.apiKey.trim() })
    }
    if (input.clearApiKey === true) await setSecureCredential(credentialID, null)
    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(this.file, `${JSON.stringify(preferences, null, 2)}\n`, { mode: 0o600 })
    this.preferences = preferences
    return this.config()
  }

  async models(value: unknown) {
    if (!value || typeof value !== "object") throw new Error("Invalid speech model discovery configuration")
    const input = value as Partial<SpeechModelDiscoveryInput>
    const preferences = normalizeSpeechModelPreferences(input)
    const baseUrl = validateBaseUrl(preferences.baseUrl)
    const apiKey = typeof input.apiKey === "string" && input.apiKey.trim()
      ? input.apiKey.trim()
      : (await getSecureCredential(credentialID))?.apiKey ?? ""
    if (endpointRequiresAuth(baseUrl) && !apiKey) {
      throw new Error("Configure the speech model API key before loading models")
    }
    writeLog("main", "speech model discovery started", {
      endpoint: baseUrl.origin,
      provider: preferences.provider,
    })
    const result = await speechProvider(preferences.provider).listModels({
      baseUrl,
      model: preferences.model,
      language: preferences.language,
      apiKey,
    }, AbortSignal.timeout(10_000))
    writeLog("main", "speech model discovery completed", { models: result.length })
    return result
  }

  async transcribe(value: unknown) {
    const input = normalizeTranscriptionInput(value)
    const credential = await getSecureCredential(credentialID)
    const baseUrl = validateBaseUrl(this.preferences.baseUrl)
    if (endpointRequiresAuth(baseUrl) && !credential?.apiKey) {
      throw new Error("Configure the speech model API key in Settings first")
    }
    writeLog("main", "speech transcription started", {
      endpoint: baseUrl.origin,
      provider: this.preferences.provider,
      model: this.preferences.model,
      bytes: input.data.byteLength,
      mimeType: input.mimeType,
    })
    const text = await speechProvider(this.preferences.provider).transcribe({
      baseUrl,
      model: this.preferences.model,
      language: this.preferences.language,
      apiKey: credential?.apiKey ?? "",
    }, {
      ...input,
      signal: AbortSignal.timeout(120_000),
    }).catch(error => {
      writeLog("main", "speech transcription failed", {
        provider: this.preferences.provider,
        message: error instanceof Error ? error.message : String(error),
      })
      throw error
    })
    writeLog("main", "speech transcription completed", { characters: text.length })
    return { text }
  }
}

function normalizeTranscriptionInput(value: unknown): SpeechTranscriptionInput {
  if (!value || typeof value !== "object") throw new Error("Invalid speech recording")
  const input = value as Partial<SpeechTranscriptionInput>
  if (!(input.data instanceof ArrayBuffer) || input.data.byteLength === 0) throw new Error("The speech recording is empty")
  if (input.data.byteLength > maxAudioBytes) throw new Error("The speech recording exceeds the 25 MB limit")
  if (typeof input.mimeType !== "string" || !input.mimeType.toLowerCase().startsWith("audio/")) {
    throw new Error("Unsupported speech recording format")
  }
  return { data: input.data, mimeType: input.mimeType }
}

export function validateBaseUrl(value: string) {
  const url = new URL(value)
  if (url.username || url.password) throw new Error("Speech model URLs cannot contain credentials")
  if (url.protocol !== "https:" && !(url.protocol === "http:" && !endpointRequiresAuth(url))) {
    throw new Error("Use HTTPS for remote speech services; HTTP is only allowed for local services")
  }
  return url
}

function endpointRequiresAuth(url: URL) {
  return url.hostname !== "localhost" && url.hostname !== "127.0.0.1" && url.hostname !== "::1"
}
