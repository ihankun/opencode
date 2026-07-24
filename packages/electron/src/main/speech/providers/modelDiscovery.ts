import type { SpeechModelOption } from "../../../shared/speechModel.ts"
import type { SpeechProviderConfig } from "./types.ts"

const speechModelPattern = /(^|[-_.:/])(asr|stt|audio)([-_.:/]|$)|whisper|transcri|voxtral|speech.?to.?text/i

export async function listOpenAiModels(config: SpeechProviderConfig, signal: AbortSignal) {
  return listModels(modelListEndpoint(config.baseUrl), config, signal)
}

export async function listOpenRouterModels(config: SpeechProviderConfig, signal: AbortSignal) {
  return (await listModels(openRouterModelListEndpoint(config.baseUrl), config, signal))
    .map(model => ({ ...model, likelySpeechModel: true }))
}

async function listModels(endpoint: URL, config: SpeechProviderConfig, signal: AbortSignal) {
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    redirect: "error",
    signal,
  })
  const body = await response.text()
  if (!response.ok) throw new Error(providerHttpError("Model discovery", response.status, body))
  return parseModelList(parseProviderJson("Model discovery", body))
}

export function modelListEndpoint(baseUrl: URL) {
  const endpoint = new URL(baseUrl)
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}/models`
  endpoint.search = ""
  endpoint.hash = ""
  return endpoint
}

export function openRouterModelListEndpoint(baseUrl: URL) {
  const endpoint = modelListEndpoint(baseUrl)
  endpoint.searchParams.set("output_modalities", "transcription")
  return endpoint
}

export function parseModelList(value: unknown) {
  if (!value || typeof value !== "object" || !("data" in value) || !Array.isArray(value.data)) {
    throw new Error("Model discovery returned an invalid response")
  }
  return value.data
    .flatMap((item): SpeechModelOption[] => {
      if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string") return []
      return [{
        id: item.id,
        ownedBy: "owned_by" in item && typeof item.owned_by === "string" ? item.owned_by : "",
        likelySpeechModel: speechModelPattern.test(item.id),
      }]
    })
    .sort((a, b) => Number(b.likelySpeechModel) - Number(a.likelySpeechModel) || a.id.localeCompare(b.id))
}

export function providerHttpError(action: string, status: number, body: string) {
  try {
    const value = JSON.parse(body) as unknown
    if (value && typeof value === "object" && "error" in value) {
      const error = value.error
      if (typeof error === "string") return `${action} failed (${status}): ${error}`
      if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return `${action} failed (${status}): ${error.message}`
      }
    }
  } catch {
    // Some compatible services return plain text or an upstream proxy page.
  }
  return `${action} failed (${status})${body ? `: ${body.slice(0, 500)}` : ""}`
}

export function parseProviderJson(action: string, body: string) {
  try {
    return JSON.parse(body) as unknown
  } catch {
    throw new Error(`${action} returned invalid JSON`)
  }
}
