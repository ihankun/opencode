import type { SpeechProviderType } from "../../../shared/speechModel.ts"
import { openAiChatAudioProvider } from "./openAiChatAudio.ts"
import { openAiTranscriptionProvider } from "./openAiTranscription.ts"
import { openRouterTranscriptionProvider } from "./openRouterTranscription.ts"

// Adapted for the Electron main process from the MIT-licensed provider patterns in
// renjfk/opencode-voice and cgarrot/opencode-stt. Recording and UI remain native to OpenCodex.
export function speechProvider(type: SpeechProviderType) {
  if (type === "openai-chat-audio") return openAiChatAudioProvider
  if (type === "openrouter-transcription") return openRouterTranscriptionProvider
  return openAiTranscriptionProvider
}
