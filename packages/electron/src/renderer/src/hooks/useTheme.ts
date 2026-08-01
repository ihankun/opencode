import { useCallback, useRef, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { THEME_SWITCH_DISABLE_MS } from '../constants'
import { themeStore, type ColorMode } from '../store/themeStore'
import type { StepFinishDisplay, CustomCSSSnippet } from '../store/themeStore'
import type { FileChangeIndicatorScope } from '../store/themeStore'

// 保持向后兼容的类型别名
export type ThemeMode = ColorMode

function syncNativeTheme(mode: ThemeMode) {
  if (typeof window.customOpenCode?.windowSetTheme !== 'function') return Promise.resolve()
  return window.customOpenCode.windowSetTheme(mode).catch(() => undefined)
}

function waitForThemeMask(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function applyElectronThemeWithMask(mode: ThemeMode, apply: () => void) {
  const root = document.documentElement
  root.setAttribute('data-theme-switch-mask', 'ready')
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  root.setAttribute('data-theme-switch-mask', 'active')
  await waitForThemeMask(100)
  await syncNativeTheme(mode)
  apply()
  await waitForThemeMask(160)
  root.setAttribute('data-theme-switch-mask', 'leaving')
  await waitForThemeMask(180)
  root.removeAttribute('data-theme-switch-mask')
}

export function useTheme() {
  // 订阅 themeStore 变化
  const state = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot)

  const skipNextTransitionRef = useRef(false)
  const resolvedTheme = themeStore.getResolvedMode()

  // ---- Color Mode (日夜模式) ----

  const setTheme = useCallback((newMode: ThemeMode) => {
    void syncNativeTheme(newMode).then(() => {
      skipNextTransitionRef.current = true
      themeStore.setColorMode(newMode)
    })
  }, [])

  const toggleTheme = useCallback(() => {
    const current = themeStore.colorMode
    const newMode = current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system'
    void syncNativeTheme(newMode).then(() => {
      skipNextTransitionRef.current = true
      themeStore.setColorMode(newMode)
    })
  }, [])

  const setThemeWithAnimation = useCallback((newMode: ThemeMode, event?: React.MouseEvent) => {
    if (typeof window.customOpenCode?.windowSetTheme === 'function') {
      void applyElectronThemeWithMask(newMode, () => {
        skipNextTransitionRef.current = true
        flushSync(() => {
          themeStore.setColorMode(newMode)
        })
      })
      return
    }

    if (!document.startViewTransition || !event) {
      void syncNativeTheme(newMode).then(() => {
        skipNextTransitionRef.current = true
        themeStore.setColorMode(newMode)
      })
      return
    }

    const x = event.clientX
    const y = event.clientY
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const root = document.documentElement
    root.setAttribute('data-theme-transition', 'off')

    const transition = document.startViewTransition(async () => {
      await syncNativeTheme(newMode)
      skipNextTransitionRef.current = true
      flushSync(() => {
        themeStore.setColorMode(newMode)
      })
    })

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 380,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .finally(() => {
        setTimeout(() => {
          root.removeAttribute('data-theme-transition')
        }, THEME_SWITCH_DISABLE_MS)
      })
  }, [])

  // ---- Theme Preset (主题风格) ----

  const setPreset = useCallback((presetId: string) => {
    themeStore.setPreset(presetId)
  }, [])

  const setPresetWithAnimation = useCallback((presetId: string, event?: React.MouseEvent) => {
    if (!document.startViewTransition || !event) {
      themeStore.setPreset(presetId)
      return
    }

    const x = event.clientX
    const y = event.clientY
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const root = document.documentElement
    root.setAttribute('data-theme-transition', 'off')

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        themeStore.setPreset(presetId)
      })
    })

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 380,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .finally(() => {
        setTimeout(() => {
          root.removeAttribute('data-theme-transition')
        }, THEME_SWITCH_DISABLE_MS)
      })
  }, [])

  // ---- Custom CSS ----

  const setCustomCSS = useCallback((css: string) => {
    themeStore.setCustomCSS(css)
  }, [])

  const saveCustomCSSSnippet = useCallback((name: string, css: string) => {
    return themeStore.saveCustomCSSSnippet(name, css)
  }, [])

  const updateCustomCSSSnippet = useCallback((id: string, updates: Partial<Pick<CustomCSSSnippet, 'name' | 'css'>>) => {
    themeStore.updateCustomCSSSnippet(id, updates)
  }, [])

  const deleteCustomCSSSnippet = useCallback((id: string) => {
    themeStore.deleteCustomCSSSnippet(id)
  }, [])

  const applyCustomCSSSnippet = useCallback((id: string) => {
    themeStore.applyCustomCSSSnippet(id)
  }, [])

  const clearActiveCustomCSSSnippet = useCallback(() => {
    themeStore.clearActiveCustomCSSSnippet()
  }, [])

  // ---- Collapse User Messages ----

  const setCollapseUserMessages = useCallback((enabled: boolean) => {
    themeStore.setCollapseUserMessages(enabled)
  }, [])

  // ---- Step Finish Display ----

  const setStepFinishDisplay = useCallback((display: Partial<StepFinishDisplay>) => {
    themeStore.setStepFinishDisplay(display)
  }, [])

  const setFileChangeIndicatorScope = useCallback((scope: FileChangeIndicatorScope) => {
    themeStore.setFileChangeIndicatorScope(scope)
  }, [])

  // ---- Descriptive Tool Steps ----

  const setDescriptiveToolSteps = useCallback((enabled: boolean) => {
    themeStore.setDescriptiveToolSteps(enabled)
  }, [])

  // ---- Inline Tool Requests ----

  const setInlineToolRequests = useCallback((enabled: boolean) => {
    themeStore.setInlineToolRequests(enabled)
  }, [])

  // ---- Code Word Wrap ----

  const setCodeWordWrap = useCallback((enabled: boolean) => {
    themeStore.setCodeWordWrap(enabled)
  }, [])

  // ---- Font Scale ----

  const setUIFontScale = useCallback((scale: number) => {
    themeStore.setUIFontScale(scale)
  }, [])

  const setCodeFontScale = useCallback((scale: number) => {
    themeStore.setCodeFontScale(scale)
  }, [])

  // ---- Immersive Mode ----

  const setImmersiveMode = useCallback((enabled: boolean) => {
    themeStore.setImmersiveMode(enabled)
  }, [])

  const setManualTerminalTitles = useCallback((enabled: boolean) => {
    themeStore.setManualTerminalTitles(enabled)
  }, [])

  const setOutlineCurrentHighlight = useCallback((enabled: boolean) => {
    themeStore.setOutlineCurrentHighlight(enabled)
  }, [])

  const setCodeBlockThemeLight = useCallback((id: string) => {
    themeStore.setCodeBlockThemeLight(id)
  }, [])

  const setCodeBlockThemeDark = useCallback((id: string) => {
    themeStore.setCodeBlockThemeDark(id)
  }, [])

  return {
    // 日夜模式（向后兼容）
    mode: state.colorMode,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme,
    toggleTheme,
    setThemeWithAnimation,
    setThemeImmediate: setTheme,

    // 主题风格
    presetId: state.presetId,
    setPreset,
    setPresetWithAnimation,
    availablePresets: themeStore.getAvailablePresets(),

    // 自定义 CSS
    customCSS: state.customCSS,
    setCustomCSS,
    customCSSSnippets: state.customCSSSnippets,
    activeCustomCSSSnippetId: state.activeCustomCSSSnippetId,
    saveCustomCSSSnippet,
    updateCustomCSSSnippet,
    deleteCustomCSSSnippet,
    applyCustomCSSSnippet,
    clearActiveCustomCSSSnippet,

    // 折叠长用户消息
    collapseUserMessages: state.collapseUserMessages,
    setCollapseUserMessages,

    // step-finish 信息栏显示
    stepFinishDisplay: state.stepFinishDisplay,
    setStepFinishDisplay,
    fileChangeIndicatorScope: state.fileChangeIndicatorScope,
    setFileChangeIndicatorScope,

    // 带工具描述的 steps 摘要
    descriptiveToolSteps: state.descriptiveToolSteps,
    setDescriptiveToolSteps,

    // 工具内嵌权限/提问
    inlineToolRequests: state.inlineToolRequests,
    setInlineToolRequests,

    // 代码块 / diff 自动换行
    codeWordWrap: state.codeWordWrap,
    setCodeWordWrap,

    // 界面字号偏移
    uiFontScale: state.uiFontScale,
    setUIFontScale,

    // 代码 / diff / 终端字号偏移
    codeFontScale: state.codeFontScale,
    setCodeFontScale,

    // 沉浸模式
    immersiveMode: state.immersiveMode,
    setImmersiveMode,

    // 内嵌权限精简模式
    compactInlinePermission: state.compactInlinePermission,
    setCompactInlinePermission: useCallback((enabled: boolean) => {
      themeStore.setCompactInlinePermission(enabled)
    }, []),

    // 毛玻璃效果
    glassEffect: state.glassEffect,
    setGlassEffect: useCallback((enabled: boolean) => {
      themeStore.setGlassEffect(enabled)
    }, []),

    // 终端标签标题模式
    manualTerminalTitles: state.manualTerminalTitles,
    setManualTerminalTitles,

    // 对话历史导航当前位置高亮
    outlineCurrentHighlight: state.outlineCurrentHighlight,
    setOutlineCurrentHighlight,

    // 亮暗模式独立代码块主题
    codeBlockThemeLight: state.codeBlockThemeLight,
    codeBlockThemeDark: state.codeBlockThemeDark,
    setCodeBlockThemeLight,
    setCodeBlockThemeDark,
  }
}
