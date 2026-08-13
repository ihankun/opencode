import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SunIcon, MoonIcon, SystemIcon, ChevronDownIcon } from '../../../components/Icons'
import { Toggle, SegmentedControl, SettingRow, SettingsSection } from './SettingsUI'
import { useTheme } from '../../../hooks'
import { FONT_SCALE_MIN, FONT_SCALE_MAX } from '../../../store/themeStore'
import { CodeBlockThemeSettings } from './CodeBlockThemeSettings'
import { accessibilityStore, useAccessibilitySettings } from '../../../store/accessibilityStore'

// ============================================
// Font Scale Slider
// ============================================

const sliderCls = `flex-1 h-1.5 rounded-full appearance-none cursor-pointer
  bg-bg-200
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-3.5
  [&::-webkit-slider-thumb]:h-3.5
  [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:bg-accent-main-100
  [&::-webkit-slider-thumb]:shadow-sm
  [&::-webkit-slider-thumb]:border-2
  [&::-webkit-slider-thumb]:border-bg-000
  [&::-webkit-slider-thumb]:cursor-pointer
  [&::-moz-range-thumb]:w-3.5
  [&::-moz-range-thumb]:h-3.5
  [&::-moz-range-thumb]:rounded-full
  [&::-moz-range-thumb]:bg-accent-main-100
  [&::-moz-range-thumb]:border-2
  [&::-moz-range-thumb]:border-bg-000
  [&::-moz-range-thumb]:cursor-pointer
  [&::-moz-range-track]:bg-bg-200
  [&::-moz-range-track]:rounded-full
  [&::-moz-range-track]:h-1.5`

function FontScaleSlider({
  value,
  onChange,
  baseSize,
}: {
  value: number
  onChange: (v: number) => void
  /** 偏移 0 对应的基准像素值，用于显示 */
  baseSize: number
}) {
  const displayPx = baseSize + value
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-text-400 text-[length:var(--fs-xs)] select-none shrink-0" style={{ fontSize: 11 }}>
        A
      </span>
      <input
        type="range"
        min={FONT_SCALE_MIN}
        max={FONT_SCALE_MAX}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={sliderCls}
      />
      <span className="text-text-400 select-none shrink-0" style={{ fontSize: 16 }}>
        A
      </span>
      <span className="text-[length:var(--fs-sm)] text-text-300 w-12 text-right tabular-nums shrink-0">
        {displayPx}px
      </span>
    </div>
  )
}

// ============================================
// Tab: Appearance
// ============================================

export function AppearanceSettings() {
  const { t, i18n } = useTranslation(['settings', 'common'])
  const {
    mode: themeMode,
    setThemeWithAnimation,
    resolvedTheme,
    glassEffect,
    setGlassEffect,
    uiFontScale,
    setUIFontScale,
    codeFontScale,
    setCodeFontScale,
  } = useTheme()
  const accessibility = useAccessibilitySettings()

  return (
    <div>
      <CodeBlockThemeSettings />

      <SettingsSection title={t('appearance.display')}>
        <div>
          <p className="text-[length:var(--fs-md)] text-text-100 mb-1.5">{t('appearance.colorMode')}</p>
          <SegmentedControl
            value={themeMode}
            options={[
              { value: 'system', label: t('appearance.modeAuto'), icon: <SystemIcon size={14} /> },
              { value: 'light', label: t('appearance.modeLight'), icon: <SunIcon size={14} /> },
              { value: 'dark', label: t('appearance.modeDark'), icon: <MoonIcon size={14} /> },
            ]}
            onChange={(v, e) => setThemeWithAnimation(v, e)}
          />
        </div>

        <SettingRow
          label={t('appearance.glassEffect')}
          description={t('appearance.glassEffectDesc')}
          onClick={() => setGlassEffect(!glassEffect)}
        >
          <Toggle enabled={glassEffect} onChange={() => setGlassEffect(!glassEffect)} />
        </SettingRow>

        <div>
          <p className="text-[length:var(--fs-md)] text-text-100 mb-2">{t('appearance.uiFontScale')}</p>
          <FontScaleSlider value={uiFontScale} onChange={setUIFontScale} baseSize={14} />
          <p className="text-[length:var(--fs-xs)] text-text-500 mt-1">{t('appearance.uiFontScaleDesc')}</p>
        </div>

        <div>
          <p className="text-[length:var(--fs-md)] text-text-100 mb-2">{t('appearance.codeFontScale')}</p>
          <FontScaleSlider value={codeFontScale} onChange={setCodeFontScale} baseSize={13} />
          <p className="text-[length:var(--fs-xs)] text-text-500 mt-1">{t('appearance.codeFontScaleDesc')}</p>
        </div>

        {(uiFontScale !== 0 || codeFontScale !== 0) && (
          <button
            onClick={() => {
              setUIFontScale(0)
              setCodeFontScale(0)
            }}
            className="text-[length:var(--fs-sm)] text-accent-main-100 hover:text-accent-main-200 transition-colors px-2 py-1 rounded hover:bg-bg-200/50 self-start"
          >
            {t('appearance.fontScaleReset')}
          </button>
        )}

        <SettingRow label={t('appearance.language')} description={t('appearance.languageDesc')}>
          <div className="relative inline-flex">
            <select
              value={i18n.language}
              onChange={e => i18n.changeLanguage(e.target.value)}
              aria-label={t('appearance.language')}
              style={{ colorScheme: resolvedTheme }}
              className="appearance-none pl-2 pr-8 py-1 text-[length:var(--fs-sm)] bg-bg-200/50 border border-border-200 rounded-md text-text-100 focus:outline-none focus:border-accent-main-100/50 cursor-pointer"
            >
              <option className="bg-bg-100 text-text-100" value="en">
                {t('appearance.languages.en')}
              </option>
              <option className="bg-bg-100 text-text-100" value="zh-CN">
                {t('appearance.languages.zh-CN')}
              </option>
            </select>
            <ChevronDownIcon
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-300"
            />
          </div>
        </SettingRow>
      </SettingsSection>
      <SettingsSection title={t('appearance.accessibility')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('appearance.accessibilityDesc')}</p>
        <SettingRow label={t('appearance.reducedMotion')} description={t('appearance.reducedMotionDesc')} onClick={() => accessibilityStore.set({ reducedMotion: !accessibility.reducedMotion })}><Toggle enabled={accessibility.reducedMotion} onChange={() => accessibilityStore.set({ reducedMotion: !accessibility.reducedMotion })} /></SettingRow>
        <SettingRow label={t('appearance.highContrast')} description={t('appearance.highContrastDesc')} onClick={() => accessibilityStore.set({ highContrast: !accessibility.highContrast })}><Toggle enabled={accessibility.highContrast} onChange={() => accessibilityStore.set({ highContrast: !accessibility.highContrast })} /></SettingRow>
        <SettingRow label={t('appearance.largeTargets')} description={t('appearance.largeTargetsDesc')} onClick={() => accessibilityStore.set({ largeTargets: !accessibility.largeTargets })}><Toggle enabled={accessibility.largeTargets} onChange={() => accessibilityStore.set({ largeTargets: !accessibility.largeTargets })} /></SettingRow>
        <SettingRow label={t('appearance.visibleFocus')} description={t('appearance.visibleFocusDesc')} onClick={() => accessibilityStore.set({ visibleFocus: !accessibility.visibleFocus })}><Toggle enabled={accessibility.visibleFocus} onChange={() => accessibilityStore.set({ visibleFocus: !accessibility.visibleFocus })} /></SettingRow>
      </SettingsSection>
    </div>
  )
}
