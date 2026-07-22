import { describe, it, expect, beforeEach, vi } from "vitest"
import { createInteractiveHandler } from "../interactive-handler.js"
import { createMockLogger } from "../../__tests__/setup.js"
import type { FeishuCardAction } from "../../types.js"
import { getChannelWorkingDirectory } from "../../utils/paths.js"

describe("createInteractiveHandler", () => {
  let mockLogger: ReturnType<typeof createMockLogger>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLogger = createMockLogger()
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
    vi.clearAllMocks()
  })

  describe("question_answer action", () => {
    it("successfully answers a question with correct POST request", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const answers = JSON.stringify([["first", "second"]])
      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "question_answer",
            requestId: "req-123",
            answers,
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      })

      await handler(action)

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test:4096/question/req-123/reply",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ answers: [["first", "second"]] }),
        }),
      )
      expect(new Headers(mockFetch.mock.calls[0]![1].headers).get("x-opencode-directory")).toBe(
        getChannelWorkingDirectory("feishu"),
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Question req-123 answered: first",
      )
    })

    it("logs warn when requestId is missing", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "question_answer",
            answers: JSON.stringify([["test"]]),
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      await expect(handler(action)).rejects.toThrow(
        "Missing requestId or answers in question_answer action",
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("logs warn when answers is missing", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "question_answer",
            requestId: "req-123",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      await expect(handler(action)).rejects.toThrow(
        "Missing requestId or answers in question_answer action",
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("logs warn when answers JSON is malformed", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "question_answer",
            requestId: "req-123",
            answers: "{invalid json",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      await expect(handler(action)).rejects.toThrow()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("logs warn on HTTP non-ok response", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "question_answer",
            requestId: "req-123",
            answers: JSON.stringify([["test"]]),
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      })

      await expect(handler(action)).rejects.toThrow(
        "Question reply failed: 400 Bad Request",
      )
    })

    it("logs warn on fetch network failure", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "question_answer",
            requestId: "req-123",
            answers: JSON.stringify([["test"]]),
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      const error = new Error("Network error")
      mockFetch.mockRejectedValueOnce(error)

      await expect(handler(action)).rejects.toThrow("Network error")
    })
  })

  describe("permission_reply action", () => {
    it("successfully replies permission 'once'", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "permission_reply",
            requestId: "req-456",
            reply: "once",
            channelId: "qqbot",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      })

      await handler(action)

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test:4096/permission/req-456/reply",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reply: "once" }),
        }),
      )
      expect(new Headers(mockFetch.mock.calls[0]![1].headers).get("x-opencode-directory")).toBe(
        getChannelWorkingDirectory("qqbot"),
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Permission req-456: Allowed (once)",
      )
    })

    it("successfully replies permission 'always'", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "permission_reply",
            requestId: "req-456",
            reply: "always",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      })

      await handler(action)

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Permission req-456: Always allowed",
      )
    })

    it("successfully replies permission 'reject'", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "permission_reply",
            requestId: "req-456",
            reply: "reject",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      })

      await handler(action)

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Permission req-456: Rejected",
      )
    })

    it("logs warn when requestId is missing", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "permission_reply",
            reply: "once",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      await expect(handler(action)).rejects.toThrow(
        "Missing requestId or reply in permission_reply action",
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("logs warn when reply is missing", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "permission_reply",
            requestId: "req-456",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      await expect(handler(action)).rejects.toThrow(
        "Missing requestId or reply in permission_reply action",
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("logs warn on HTTP non-ok response", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "permission_reply",
            requestId: "req-456",
            reply: "once",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })

      await expect(handler(action)).rejects.toThrow(
        "Permission reply failed: 500 Internal Server Error",
      )
    })

    it("logs warn on fetch network failure", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "permission_reply",
            requestId: "req-456",
            reply: "once",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      const error = new Error("Network error")
      mockFetch.mockRejectedValueOnce(error)

      await expect(handler(action)).rejects.toThrow("Network error")
    })
  })

  describe("invalid action handling", () => {
    it("returns early when action.action is missing", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {},
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      await handler(action)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    it("returns early when action.value is missing", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action = {
        action: {
          tag: "button",
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      } as any

      await handler(action)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    it("returns early with unknown action type", async () => {
      const handler = createInteractiveHandler({
        serverUrl: "http://test:4096",
        logger: mockLogger,
      })

      const action: FeishuCardAction = {
        action: {
          tag: "button",
          value: {
            action: "unknown_action_type",
            requestId: "req-123",
          },
        },
        open_message_id: "msg-1",
        open_chat_id: "chat-1",
        operator: { open_id: "ou-1" },
      }

      await handler(action)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })
})
