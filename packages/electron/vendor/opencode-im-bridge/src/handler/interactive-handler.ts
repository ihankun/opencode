/**
 * Interactive card action handler.
 * Handles question answers and permission replies from Feishu card button clicks,
 * forwarding responses back to the opencode server.
 *
 * Feedback to the user is handled by the card callback response (toast + card update)
 * in ws-client.ts — this module only handles the opencode POST.
 */

import type { Logger } from "../utils/logger.js"
import type { FeishuCardAction } from "../types.js"
import { getChannelWorkingDirectory } from "../utils/paths.js"

// ── Types ──

export interface InteractiveHandlerDeps {
  serverUrl: string
  logger: Logger
}

// ── Factory ──

export function createInteractiveHandler(deps: InteractiveHandlerDeps) {
  const { serverUrl, logger } = deps

  return async (action: FeishuCardAction): Promise<void> => {
    const actionValue = action.action?.value
    if (!actionValue) return

    const actionType = actionValue.action

    if (actionType === "question_answer") {
      await handleQuestionAnswer(actionValue)
      return
    }

    if (actionType === "permission_reply") {
      await handlePermissionReply(actionValue)
      return
    }
  }

  async function handleQuestionAnswer(
    value: Record<string, string>,
  ): Promise<void> {
    const { requestId, answers } = value
    if (!requestId || !answers) {
      throw new Error("Missing requestId or answers in question_answer action")
    }

    const parsedAnswers = JSON.parse(answers) as string[][]
    const resp = await fetch(`${serverUrl}/question/${requestId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-opencode-directory": getChannelWorkingDirectory(value.channelId ?? "feishu"),
      },
      body: JSON.stringify({ answers: parsedAnswers }),
      signal: AbortSignal.timeout(2_000),
    })
    if (!resp.ok) {
      throw new Error(`Question reply failed: ${resp.status} ${resp.statusText}`)
    }
    logger.info(`Question ${requestId} answered: ${parsedAnswers[0]?.[0] ?? ""}`)
  }

  async function handlePermissionReply(
    value: Record<string, string>,
  ): Promise<void> {
    const { requestId, reply } = value
    if (!requestId || !reply) {
      throw new Error("Missing requestId or reply in permission_reply action")
    }

    const resp = await fetch(`${serverUrl}/permission/${requestId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-opencode-directory": getChannelWorkingDirectory(value.channelId ?? "feishu"),
      },
      body: JSON.stringify({ reply }),
      signal: AbortSignal.timeout(2_000),
    })
    if (!resp.ok) {
      throw new Error(`Permission reply failed: ${resp.status} ${resp.statusText}`)
    }
    const labelMap: Record<string, string> = {
      once: "Allowed (once)",
      always: "Always allowed",
      reject: "Rejected",
    }
    logger.info(`Permission ${requestId}: ${labelMap[reply] ?? reply}`)
  }
}
