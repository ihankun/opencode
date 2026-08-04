import type { Attachment } from '../features/attachment'

export interface ComposerDraft {
  text: string
  attachments: Attachment[]
}

interface PersistedAttachment extends Attachment {
  blob?: { id: string; mime?: string }
}

// 输入框草稿按 paneId 记忆。组件在切换到插件/任务页时会被卸载，
// 用进程内 store 保存当前草稿，重新挂载时恢复。
//
// 持久化：附件中的大 data URL 提取为 blob 存到主进程 SQLite（drafts.sqlite），
// 草稿 JSON（text + 附件元数据 + blob 引用）存 document 表，写入做 500ms 防抖批量。
// 这样既避免了 localStorage 体积与同步 IO 卡顿，也让重启后草稿可以恢复。
const drafts = new Map<string, ComposerDraft>()

const draftApi = () =>
  typeof window !== 'undefined' && typeof window.customOpenCode?.draftSet === 'function'
    ? window.customOpenCode
    : undefined

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function arrayBufferToDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return `data:${mime};base64,${btoa(binary)}`
}

async function encodeDraft(draft: ComposerDraft): Promise<string> {
  const api = draftApi()
  const attachments: PersistedAttachment[] = []
  for (const attachment of draft.attachments) {
    if (api && attachment.type === 'file' && attachment.url?.startsWith('data:')) {
      const id = await api.draftBlobPut(dataUrlToArrayBuffer(attachment.url))
      attachments.push({ ...attachment, url: undefined, blob: { id, mime: attachment.mime } })
    } else {
      attachments.push(attachment)
    }
  }
  return JSON.stringify({ text: draft.text, attachments })
}

async function decodeDraft(json: string): Promise<ComposerDraft> {
  const parsed = JSON.parse(json) as { text?: string; attachments?: PersistedAttachment[] }
  const api = draftApi()
  const attachments: Attachment[] = []
  for (const attachment of parsed.attachments ?? []) {
    if (api && attachment.blob?.id) {
      const buffer = await api.draftBlobGet(attachment.blob.id)
      const { blob: _blob, ...rest } = attachment
      const mime = attachment.blob.mime ?? attachment.mime ?? 'application/octet-stream'
      attachments.push({
        ...rest,
        url: buffer ? arrayBufferToDataUrl(buffer, mime) : rest.url,
      })
    } else {
      const { blob: _blob, ...rest } = attachment
      attachments.push(rest)
    }
  }
  return { text: parsed.text ?? '', attachments }
}

// 防抖批量持久化：pending 保存每个 key 的最新值，500ms 后统一写主进程。
const pending = new Map<string, { draft: ComposerDraft } | null>()
let flushTimer: ReturnType<typeof setTimeout> | undefined

async function flush() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = undefined
  const api = draftApi()
  if (!api) return
  const writes = [...pending]
  pending.clear()
  for (const [paneId, value] of writes) {
    try {
      if (value === null) {
        await api.draftDelete(paneId)
      } else {
        await api.draftSet(paneId, await encodeDraft(value.draft))
      }
    } catch {
      if (!pending.has(paneId)) pending.set(paneId, value)
      scheduleFlush()
    }
  }
}

function scheduleFlush() {
  if (!draftApi()) return
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    void flush()
  }, 500)
}

const hydrated = new Set<string>()

// 页面隐藏（切窗口/退出）时立即落盘，避免防抖期间丢失最后输入
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
  })
}

async function hydratePane(paneId: string) {
  const api = draftApi()
  if (!api || hydrated.has(paneId)) return
  hydrated.add(paneId)
  const json = await api.draftGet(paneId).catch(() => null)
  if (json == null) return
  if (drafts.has(paneId)) return
  drafts.set(paneId, await decodeDraft(json))
}

export const composerDraftStore = {
  getDraft(paneId: string): ComposerDraft | undefined {
    return drafts.get(paneId)
  },

  saveDraft(paneId: string, draft: ComposerDraft) {
    const prev = drafts.get(paneId)
    if (prev && prev.text === draft.text && prev.attachments === draft.attachments) return
    drafts.set(paneId, draft)
    pending.set(paneId, { draft })
    scheduleFlush()
  },

  clearDraft(paneId: string) {
    drafts.delete(paneId)
    pending.set(paneId, null)
    scheduleFlush()
  },

  /** 确保某个 pane 的持久化草稿已回填到内存（在未输入内容时使用）。 */
  hydratePane,

  /** 启动时预填所有持久化草稿到内存。 */
  async hydrateAll() {
    const api = draftApi()
    if (!api) return
    const keys = await api.draftKeys().catch(() => [] as string[])
    for (const key of keys) await hydratePane(key)
  },

  /** 立即刷新未落盘的写入（供退出前调用）。 */
  async flushNow() {
    await flush()
  },
}
