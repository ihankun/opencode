// ============================================
// Session 加载相关的辅助函数
// ============================================

import type { ApiSession, ModelInfo } from '../api'
import { getModelKey } from './modelUtils'

// ============================================
// Model Selection 恢复
// ============================================

export interface ModelSelectionResult {
  modelKey: string // providerId:modelId 格式
  model: ModelInfo
  variant: string | undefined
}

export function areSessionListsSame(a: ApiSession[], b: ApiSession[]) {
  if (a.length !== b.length) return false
  return a.every((session, index) => {
    const other = b[index]
    if (!other) return false
    return (
      session.id === other.id &&
      session.title === other.title &&
      session.directory === other.directory &&
      session.parentID === other.parentID &&
      session.time.updated === other.time.updated &&
      session.time.archived === other.time.archived &&
      session.summary?.additions === other.summary?.additions &&
      session.summary?.deletions === other.summary?.deletions &&
      session.summary?.files === other.summary?.files
    )
  })
}

/**
 * 根据 session 最后使用的模型信息恢复选择
 */
export function restoreModelSelection(
  lastModel: { providerID: string; modelID: string } | null,
  lastVariant: string | null,
  models: ModelInfo[],
): ModelSelectionResult | null {
  if (!lastModel || models.length === 0) {
    return null
  }

  // 精确匹配 providerId + modelId（不做 modelID-only fallback，
  // 避免多 provider 同 modelId 时选错渠道）
  const model = models.find(m => m.providerId === lastModel.providerID && m.id === lastModel.modelID)

  if (!model) {
    return null
  }

  let variant: string | undefined = undefined
  if (lastVariant && model.variants.includes(lastVariant)) {
    variant = lastVariant
  }

  return {
    modelKey: getModelKey(model),
    model,
    variant,
  }
}
