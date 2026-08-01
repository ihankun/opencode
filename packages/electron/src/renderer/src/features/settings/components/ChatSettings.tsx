import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PathAutoIcon, PathUnixIcon, PathWindowsIcon } from '../../../components/Icons'
import { usePathMode, useIsMobile, useTheme } from '../../../hooks'
import {
  themeStore,
  type EnterKeyBehavior,
  type FileChangeIndicatorScope,
} from '../../../store/themeStore'
import { Toggle, SegmentedControl, SettingRow, SettingsSection } from './SettingsUI'
import { getBrowserOpenMode, setBrowserOpenMode, type BrowserOpenMode } from '../../../utils/browserOpen'
import type { PathMode } from '../../../utils/directoryUtils'

export function ChatSettings() {
  const { t } = useTranslation(['settings'])
  const { pathMode, setPathMode, effectiveStyle, detectedStyle, isAutoMode } = usePathMode()
  const { outlineCurrentHighlight, setOutlineCurrentHighlight } = useTheme()
  const [collapseUserMessages, setCollapseUserMessages] = useState(themeStore.collapseUserMessages)
  const [enterKeyBehavior, setEnterKeyBehavior] = useState(themeStore.enterKeyBehavior)
  const [stepFinishDisplay, setStepFinishDisplay] = useState(themeStore.stepFinishDisplay)
  const [fileChangeIndicatorScope, setFileChangeIndicatorScope] = useState(themeStore.fileChangeIndicatorScope)
  const [browserOpenMode, setBrowserOpenModeState] = useState<BrowserOpenMode>(() => getBrowserOpenMode())
  const isMobile = useIsMobile()
  void isMobile

  const handleCollapseToggle = () => {
    const v = !collapseUserMessages
    setCollapseUserMessages(v)
    themeStore.setCollapseUserMessages(v)
  }

  const handleEnterKeyBehaviorChange = (behavior: EnterKeyBehavior) => {
    setEnterKeyBehavior(behavior)
    themeStore.setEnterKeyBehavior(behavior)
  }

  const handleOutlineHighlightToggle = () => {
    setOutlineCurrentHighlight(!outlineCurrentHighlight)
  }

  const handleFileChangeIndicatorScopeChange = (scope: FileChangeIndicatorScope) => {
    setFileChangeIndicatorScope(scope)
    themeStore.setFileChangeIndicatorScope(scope)
  }

  const handleBrowserOpenModeChange = (mode: BrowserOpenMode) => {
    setBrowserOpenModeState(mode)
    setBrowserOpenMode(mode)
  }

  return (
    <div>
      {/* 路径格式 */}
      <SettingsSection title={t('chat.pathsFormatting')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('chat.pathsFormattingDesc')}</p>
        <SegmentedControl
          value={pathMode}
          options={[
            { value: 'auto', label: t('chat.auto'), icon: <PathAutoIcon size={14} /> },
            { value: 'unix', label: t('chat.unixSlash'), icon: <PathUnixIcon size={14} /> },
            { value: 'windows', label: t('chat.winBackslash'), icon: <PathWindowsIcon size={14} /> },
          ]}
          onChange={v => setPathMode(v as PathMode)}
        />
        {isAutoMode && (
          <p className="text-[length:var(--fs-xs)] text-text-400">
            {t('chat.usingStyle', { style: effectiveStyle === 'windows' ? '\\' : '/' })}
            {detectedStyle &&
              t('chat.detectedStyle', {
                style: detectedStyle === 'windows' ? t('chat.windows') : t('chat.unix'),
              })}
          </p>
        )}

      </SettingsSection>

      <SettingsSection title={t('chat.conversationExperience')}>
        <p className="text-[length:var(--fs-sm)] text-text-400">{t('chat.conversationExperienceDesc')}</p>

        <SettingRow
          label={t('chat.collapseLongMessages')}
          description={t('chat.collapseLongMessagesDesc')}
          onClick={handleCollapseToggle}
        >
          <Toggle enabled={collapseUserMessages} onChange={handleCollapseToggle} />
        </SettingRow>

        <SettingRow
          label={t('chat.outlineCurrentHighlight')}
          description={t('chat.outlineCurrentHighlightDesc')}
          onClick={handleOutlineHighlightToggle}
        >
          <Toggle enabled={outlineCurrentHighlight} onChange={handleOutlineHighlightToggle} />
        </SettingRow>

        <div>
          <p className="text-[length:var(--fs-md)] text-text-100 mb-1.5">{t('chat.fileChangeIndicatorScope')}</p>
          <p className="text-[length:var(--fs-sm)] text-text-400 mb-3">{t('chat.fileChangeIndicatorScopeDesc')}</p>
          <SegmentedControl
            value={fileChangeIndicatorScope}
            options={[
              { value: 'latestTurn', label: t('chat.fileChangeIndicatorScopeLatestTurn') },
              { value: 'session', label: t('chat.fileChangeIndicatorScopeSession') },
            ]}
            onChange={v => handleFileChangeIndicatorScopeChange(v as FileChangeIndicatorScope)}
          />
        </div>

        <div>
          <p className="text-[length:var(--fs-md)] text-text-100 mb-1.5">{t('chat.enterKeyBehavior')}</p>
          <p className="text-[length:var(--fs-sm)] text-text-400 mb-3">{t('chat.enterKeyBehaviorDesc')}</p>
          <SegmentedControl
            value={enterKeyBehavior}
            options={[
              { value: 'newline', label: t('chat.enterKeyNewline') },
              { value: 'send', label: t('chat.enterKeySend') },
            ]}
            onChange={value => handleEnterKeyBehaviorChange(value as EnterKeyBehavior)}
          />
        </div>

        <div>
          <p className="text-[length:var(--fs-md)] text-text-100 mb-1.5">{t('chat.browserOpenMode')}</p>
          <p className="text-[length:var(--fs-sm)] text-text-400 mb-3">{t('chat.browserOpenModeDesc')}</p>
          <SegmentedControl
            value={browserOpenMode}
            options={[
              { value: 'internal', label: t('chat.browserOpenInternal') },
              { value: 'system', label: t('chat.browserOpenSystem') },
            ]}
             onChange={v => handleBrowserOpenModeChange(v as BrowserOpenMode)}
          />
        </div>
      </SettingsSection>

      {/* Step 完成信息 */}
      <SettingsSection title={t('chat.stepFinishInfo')}>
        {(
          [
            { key: 'agent', label: t('chat.agent'), desc: t('chat.showAgent') },
            { key: 'model', label: t('chat.model'), desc: t('chat.showModel') },
            { key: 'tokens', label: t('chat.tokens'), desc: t('chat.showTokenUsage') },
            { key: 'cache', label: t('chat.cache'), desc: t('chat.showCacheHit') },
            { key: 'cost', label: t('chat.cost'), desc: t('chat.showApiCost') },
            { key: 'duration', label: t('chat.duration'), desc: t('chat.showResponseTime') },
            { key: 'turnDuration', label: t('chat.totalDuration'), desc: t('chat.showTurnElapsed') },
            { key: 'completedAt', label: t('chat.completedAt'), desc: t('chat.showCompletedAt') },
          ] as const
        ).map(({ key, label, desc }) => (
          <SettingRow
            key={key}
            label={label}
            description={desc}
            onClick={() => {
              const next = { [key]: !stepFinishDisplay[key] }
              setStepFinishDisplay(prev => ({ ...prev, ...next }))
              themeStore.setStepFinishDisplay(next)
            }}
          >
            <Toggle
              enabled={stepFinishDisplay[key]}
              onChange={() => {
                const next = { [key]: !stepFinishDisplay[key] }
                setStepFinishDisplay(prev => ({ ...prev, ...next }))
                themeStore.setStepFinishDisplay(next)
              }}
            />
          </SettingRow>
        ))}
      </SettingsSection>
    </div>
  )
}
