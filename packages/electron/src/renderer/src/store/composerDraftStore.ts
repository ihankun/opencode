import type { Attachment } from '../features/attachment'

export interface ComposerDraft {
  text: string
  attachments: Attachment[]
}

// 输入框草稿按 paneId 记忆。组件在切换到插件/任务页时会被卸载，
// 用进程内 store 保存当前草稿，重新挂载时恢复。
// 附件可能包含较大的 data URL / 文件内容，因此不做 localStorage 持久化。
const drafts = new Map<string, ComposerDraft>()

export const composerDraftStore = {
  getDraft(paneId: string): ComposerDraft | undefined {
    return drafts.get(paneId)
  },

  saveDraft(paneId: string, draft: ComposerDraft) {
    const prev = drafts.get(paneId)
    if (prev && prev.text === draft.text && prev.attachments === draft.attachments) return
    drafts.set(paneId, draft)
  },

  clearDraft(paneId: string) {
    drafts.delete(paneId)
  },
}
