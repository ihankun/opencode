import type { SpeechModelOption } from "../../../shared/speechModel.ts"
import type { SpeechProviderConfig } from "./types.ts"

const speechModelPattern = /(^|[-_.:/])(asr|stt)([-_.:/]|$)|whisper|transcri|voxtral|speech.?to.?text/i

export async function listOpenAiModels(config: SpeechProviderConfig, signal: AbortSignal) {
  const response = await fetch(modelListEndpoint(config.baseUrl), {
    headers: {
      Accept: "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    redirect: "error",
    signal,
  })
  const body = await response.text()
  if (!response.ok) throw new Error(providerHttpError("Model discovery", response.status, body))
  return parseModelList(JSON.parse(body))
}

export function modelListEndpoint(baseUrl: URL) {
  const endpoint = new URL(baseUrl)
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}/models`
  endpoint.search = ""
  endpoint.hash = ""
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
