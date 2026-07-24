import assert from "node:assert/strict"
import { test } from "node:test"
import { speechProvider } from "./speech/providers/factory.ts"
import { modelListEndpoint, parseModelList } from "./speech/providers/modelDiscovery.ts"
import { openAiChatAudioRequest } from "./speech/providers/openAiChatAudio.ts"
import { openAiTranscriptionRequest } from "./speech/providers/openAiTranscription.ts"
import { openRouterTranscriptionRequest } from "./speech/providers/openRouterTranscription.ts"

const config = {
  baseUrl: new URL("https://speech.example.com/v1"),
  model: "custom-asr-model",
  language: "zh",
  apiKey: "secret",
}
const audio = new ArrayBuffer(5)
new Uint8Array(audio).set(new TextEncoder().encode("audio"))
const input = {
  data: audio,
  mimeType: "audio/wav",
  signal: AbortSignal.timeout(5_000),
}

test("speech provider factory selects each supported adapter", () => {
  assert.equal(speechProvider("openai-transcription").id, "openai-transcription")
  assert.equal(speechProvider("openai-chat-audio").id, "openai-chat-audio")
  assert.equal(speechProvider("openrouter-transcription").id, "openrouter-transcription")
})

test("model discovery uses the OpenAI models endpoint and prioritizes likely speech models", () => {
  assert.equal(modelListEndpoint(config.baseUrl).toString(), "https://speech.example.com/v1/models")
  assert.deepEqual(parseModelList({
    data: [
      { id: "general-model", owned_by: "example" },
      { id: "custom-asr-model", owned_by: "example" },
    ],
  }), [
    { id: "custom-asr-model", ownedBy: "example", likelySpeechModel: true },
    { id: "general-model", ownedBy: "example", likelySpeechModel: false },
  ])
})

test("multipart transcription adapter constructs a file upload request", () => {
  const request = openAiTranscriptionRequest(config, input)
  assert.equal(request.endpoint.toString(), "https://speech.example.com/v1/audio/transcriptions")
  assert.equal(request.init.method, "POST")
  assert.equal(new Headers(request.init.headers).get("Authorization"), "Bearer secret")
  const form = request.init.body
  assert.ok(form instanceof FormData)
  assert.equal(form.get("model"), "custom-asr-model")
  assert.equal(form.get("language"), "zh")
  assert.ok(form.get("file") instanceof Blob)
})

test("chat audio adapter constructs an input_audio chat completion", () => {
  const request = openAiChatAudioRequest(config, input)
  assert.equal(request.endpoint.toString(), "https://speech.example.com/v1/chat/completions")
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    model: "custom-asr-model",
    messages: [{
      role: "user",
      content: [{
        type: "input_audio",
        input_audio: {
          data: "data:audio/wav;base64,YXVkaW8=",
          format: "wav",
        },
      }],
    }],
    asr_options: { language: "zh" },
  })
})

test("JSON transcription adapter constructs an OpenRouter-style input_audio request", () => {
  const request = openRouterTranscriptionRequest(config, input)
  assert.equal(request.endpoint.toString(), "https://speech.example.com/v1/audio/transcriptions")
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    model: "custom-asr-model",
    input_audio: {
      data: "YXVkaW8=",
      format: "wav",
    },
  })
})
