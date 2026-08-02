// ============================================
// Auto-Approve Store (Experimental)
// 前端自动批准规则存储，只存内存，刷新即清空
// ============================================

import { serverStorage } from '../utils/perServerStorage'

// Full Auto 模式：off / session / global
export type FullAutoMode = 'off' | 'session' | 'global'
export type ApprovalMode = 'ask' | 'writes' | 'risk' | 'full'

export type SessionPermissionRule = {
  permission: string
  pattern: string
  action: 'allow' | 'ask' | 'deny'
}

export function approvalPermissionRules(mode: ApprovalMode): SessionPermissionRule[] {
  if (mode === 'full') return [{ permission: '*', pattern: '*', action: 'allow' }]
  if (mode === 'ask') {
    return ['bash', 'edit', 'external_directory', 'sandbox', 'webfetch', 'websearch'].map(permission => ({
      permission,
      pattern: '*',
      action: 'ask' as const,
    }))
  }
  if (mode === 'writes') {
    return [
      { permission: 'edit', pattern: '*', action: 'ask' },
      { permission: 'bash', pattern: '*', action: 'ask' },
      { permission: 'sandbox', pattern: '*', action: 'ask' },
      ...[
        'ls*',
        'pwd',
        'git status*',
        'git diff*',
        'git log*',
        'git show*',
        'git branch*',
        'git remote*',
        'git rev-parse*',
        'cat *',
        'head *',
        'tail *',
        'sed -n *',
        'rg *',
        'find *',
        'which *',
      ].map(pattern => ({ permission: 'bash', pattern, action: 'allow' as const })),
    ]
  }
  return [{ permission: 'sandbox', pattern: '*', action: 'ask' }]
}

// Full Auto 状态变更回调
// sourcePaneId 可选：表示这次切换是从哪个 pane 触发的。
// 即使是 global 变更，也可以携带触发源 pane，供 UI hint 精准展示。
type FullAutoListener = (mode: FullAutoMode, sourcePaneId?: string) => void
type StoreListener = () => void

/**
 * 自动批准规则
 */
export interface AutoApproveRule {
  permission: string // 工具类型: bash, edit, read, etc.
  pattern: string // 匹配模式，如 "mkdir *", "ls", "*.tsx"
}

/**
 * Auto-Approve Store
 * 按 sessionId 存储自动批准规则
 */
class AutoApproveStore {
  // 规则存储：sessionId -> rules[]
  private rulesMap = new Map<string, AutoApproveRule[]>()

  // 前端自动批准恒为关闭：始终允许固定交给后端处理
  // Full Auto 开启时是否追补已经等待中的权限（危险操作，默认关闭）
  private _approvePendingOnFullAuto: boolean = false
  private readonly STORAGE_KEY_APPROVE_PENDING_ON_FULL_AUTO = 'opencode-approve-pending-on-full-auto'

  // Full Auto 模式（纯内存，不持久化，刷新即关）
  // off: 不自动放行
  // session: 自动放行当前所在页面的会话（由 handler 层级天然保证）
  // global: 所有会话的权限请求无差别自动放行
  private _fullAutoMode: FullAutoMode = 'off'
  private _fullAutoListeners = new Set<FullAutoListener>()
  private _listeners = new Set<StoreListener>()
  /** per-pane Full Auto 模式（分屏模式下各 pane 独立控制） */
  private _paneFullAutoModes = new Map<string, FullAutoMode>()
  private _autoReplyRequestIds = new Set<string>()
  private _approvalModes = new Map<string, ApprovalMode>()

  constructor() {
    // 从 localStorage 读取开关状态
    try {
      const approvePendingStored = serverStorage.get(this.STORAGE_KEY_APPROVE_PENDING_ON_FULL_AUTO)
      this._approvePendingOnFullAuto = approvePendingStored === 'true'
    } catch {
      this._approvePendingOnFullAuto = false
    }
  }

  private notify(): void {
    this._listeners.forEach(fn => fn())
  }

  /**
   * 重新从 storage 加载开关状态（服务器切换时调用）
   */
  reloadFromStorage(): void {
    try {
      const approvePendingStored = serverStorage.get(this.STORAGE_KEY_APPROVE_PENDING_ON_FULL_AUTO)
      this._approvePendingOnFullAuto = approvePendingStored === 'true'
    } catch {
      this._approvePendingOnFullAuto = false
    }
    // 切换服务器时清空规则并关闭 Full Auto
    this.rulesMap.clear()
    this._paneFullAutoModes.clear()
    this._autoReplyRequestIds.clear()
    this._approvalModes.clear()
    if (this._fullAutoMode !== 'off') {
      this._fullAutoMode = 'off'
      this._fullAutoListeners.forEach(fn => fn('off'))
    }
    this.notify()
  }

  /**
   * 前端自动批准功能状态：固定关闭，始终允许交给后端处理
   */
  get enabled(): boolean {
    return false
  }

  get approvePendingOnFullAuto(): boolean {
    return this._approvePendingOnFullAuto
  }

  setApprovePendingOnFullAuto(value: boolean): void {
    this._approvePendingOnFullAuto = value
    try {
      serverStorage.set(this.STORAGE_KEY_APPROVE_PENDING_ON_FULL_AUTO, String(value))
    } catch {
      // ignore
    }
    this.notify()
  }

  subscribe = (listener: StoreListener): (() => void) => {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  getApprovalMode(paneId: string): ApprovalMode {
    return this._approvalModes.get(paneId) ?? 'risk'
  }

  setApprovalMode(paneId: string, mode: ApprovalMode): void {
    if (mode !== 'full') {
      this._paneFullAutoModes.delete(paneId)
      if (this._fullAutoMode === 'global') this._fullAutoMode = 'off'
    }
    this._approvalModes.set(paneId, mode)
    this.notify()
  }

  // ---- Full Auto 模式 ----

  /**
   * 当前 Full Auto 模式
   */
  get fullAutoMode(): FullAutoMode {
    return this._fullAutoMode
  }

  /**
   * 向后兼容：fullAuto 等价于 mode !== 'off'
   */
  get fullAuto(): boolean {
    return this._fullAutoMode !== 'off'
  }

  /**
   * 设置 Full Auto 模式（全局）
   */
  setFullAutoMode(mode: FullAutoMode, sourcePaneId?: string): void {
    this._fullAutoMode = mode
    this._fullAutoListeners.forEach(fn => fn(mode, sourcePaneId))
    this.notify()
  }

  // ---- Per-pane Full Auto 模式 ----

  /** 获取指定 pane 的生效 Full Auto 模式（global 优先，否则看 pane-local） */
  getPaneFullAutoMode(paneId: string): FullAutoMode {
    if (this._fullAutoMode === 'global') return 'global'
    return this._paneFullAutoModes.get(paneId) ?? 'off'
  }

  /** 设置指定 pane 的 Full Auto 模式 */
  setPaneFullAutoMode(paneId: string, mode: FullAutoMode): void {
    if (mode === 'global') {
      this._paneFullAutoModes.delete(paneId)
      this.setFullAutoMode('global', paneId)
      return
    }
    this._paneFullAutoModes.set(paneId, mode)
    this._fullAutoListeners.forEach(fn => fn(mode, paneId))
    this.notify()
  }

  /** 清除指定 pane 的 Full Auto 模式（恢复跟随全局） */
  clearPaneFullAutoMode(paneId: string): void {
    this._paneFullAutoModes.delete(paneId)
    this.notify()
  }

  /** 按当前 pane 的生效状态循环：off -> session -> global -> off */
  cyclePaneFullAutoMode(paneId: string): FullAutoMode {
    const current = this.getPaneFullAutoMode(paneId)

    if (current === 'off') {
      this.setPaneFullAutoMode(paneId, 'session')
      return 'session'
    }

    if (current === 'session') {
      // 进入 global 前清掉当前 pane 的局部状态，global 关闭后回到 off。
      this._paneFullAutoModes.delete(paneId)
      this.setFullAutoMode('global', paneId)
      return 'global'
    }

    this.setFullAutoMode('off', paneId)
    return 'off'
  }

  /**
   * 向后兼容：setFullAuto(bool) 映射到 off/global
   */
  setFullAuto(value: boolean): void {
    this.setFullAutoMode(value ? 'global' : 'off')
  }

  /**
   * 订阅 Full Auto 状态变更
   */
  onFullAutoChange(listener: FullAutoListener): () => void {
    this._fullAutoListeners.add(listener)
    return () => {
      this._fullAutoListeners.delete(listener)
    }
  }

  claimAutoReply(requestId: string): boolean {
    if (this._autoReplyRequestIds.has(requestId)) return false
    this._autoReplyRequestIds.add(requestId)
    return true
  }

  releaseAutoReply(requestId: string): void {
    this._autoReplyRequestIds.delete(requestId)
  }

  /**
   * 添加自动批准规则
   * 前端自动批准恒关闭，规则不记录，始终允许固定交给后端处理
   */
  addRules(sessionId: string, permission: string, patterns: string[]): void {
    return
  }

  /**
   * 获取某个会话的所有规则
   */
  getRules(sessionId: string): AutoApproveRule[] {
    return this.rulesMap.get(sessionId) || []
  }

  /**
   * 清空某个会话的所有规则
   */
  clearRules(sessionId: string): void {
    this.rulesMap.delete(sessionId)
  }

  /**
   * 清空所有规则
   */
  clearAllRules(): void {
    this.rulesMap.clear()
  }

  /**
   * 检查权限请求是否应该自动批准
   * 前端自动批准恒关闭，始终返回 false，交由后端处理
   */
  shouldAutoApprove(sessionId: string, permission: string, requestPatterns: string[]): boolean {
    return false
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): { enabled: boolean; sessions: { id: string; rules: AutoApproveRule[] }[] } {
    return {
      enabled: false,
      sessions: Array.from(this.rulesMap.entries()).map(([id, rules]) => ({
        id,
        rules,
      })),
    }
  }
}

// 单例导出
export const autoApproveStore = new AutoApproveStore()
