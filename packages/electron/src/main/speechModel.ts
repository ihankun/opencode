import { Blob } from "node:buffer"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  DEFAULT_SPEECH_MODEL_PREFERENCES,
  normalizeSpeechModelPreferences,
  type SpeechModelConfig,
  type SpeechModelPreferences,
  type SpeechModelUpdate,
  type SpeechTranscriptionInput,
} from "../shared/speechModel.ts"
import { getSecureCredential, setSecureCredential } from "./credentials"
import { writeLog } from "./logging"

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

  async transcribe(value: unknown) {
    const input = normalizeTranscriptionInput(value)
    const credential = await getSecureCredential(credentialID)
    if (!credential?.apiKey) throw new Error("Configure the speech model API key in Settings first")
    const endpoint = transcriptionEndpoint(this.preferences.baseUrl)
    const form = new FormData()
    form.append("file", new Blob([input.data], { type: input.mimeType }), `recording.${audioExtension(input.mimeType)}`)
    form.append("model", this.preferences.model)
    if (this.preferences.language) form.append("language", this.preferences.language)
    writeLog("main", "speech transcription started", {
      endpoint: endpoint.origin,
      model: this.preferences.model,
      bytes: input.data.byteLength,
      mimeType: input.mimeType,
    })
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${credential.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    })
    const body = await response.text()
    if (!response.ok) {
      writeLog("main", "speech transcription failed", { status: response.status, body: body.slice(0, 1_000) })
      throw new Error(speechServiceError(response.status, body))
    }
    const result = JSON.parse(body) as unknown
    if (!result || typeof result !== "object" || !("text" in result) || typeof result.text !== "string") {
      throw new Error("Speech service returned an invalid response")
    }
    writeLog("main", "speech transcription completed", { characters: result.text.length })
    return { text: result.text.trim() }
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

function transcriptionEndpoint(baseUrl: string) {
  const url = validateBaseUrl(baseUrl)
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/audio/transcriptions`
  url.search = ""
  url.hash = ""
  return url
}

function validateBaseUrl(value: string) {
  const url = new URL(value)
  if (url.username || url.password) throw new Error("Speech model URLs cannot contain credentials")
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1"
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("Use HTTPS for remote speech services; HTTP is only allowed for local services")
  }
  return url
}

function audioExtension(mimeType: string) {
  const normalized = mimeType.toLowerCase()
  if (normalized.includes("mp4")) return "m4a"
  if (normalized.includes("ogg")) return "ogg"
  if (normalized.includes("wav")) return "wav"
  return "webm"
}

function speechServiceError(status: number, body: string) {
  try {
    const value = JSON.parse(body) as unknown
    if (value && typeof value === "object" && "error" in value) {
      const error = value.error
      if (typeof error === "string") return `Speech service HTTP ${status}: ${error}`
      if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return `Speech service HTTP ${status}: ${error.message}`
      }
    }
  } catch {
    // The service may return plain text or an upstream proxy page.
  }
  return `Speech service HTTP ${status}${body ? `: ${body.slice(0, 500)}` : ""}`
}
