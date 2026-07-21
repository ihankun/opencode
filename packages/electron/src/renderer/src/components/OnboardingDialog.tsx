import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from './ui/Dialog'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, GlobeIcon, ShieldIcon } from './Icons'
import { useServerStore } from '../hooks/useServerStore'
import type { SettingsTab } from '../features/settings/SettingsDialog'

export function OnboardingDialog(props: { isOpen: boolean; projectSelected: boolean; onOpenSettings: (tab: SettingsTab) => void; onComplete: () => void }) {
  const { i18n } = useTranslation()
  const zh = i18n.language.startsWith('zh')
  const { activeServer, getHealth } = useServerStore()
  const [step, setStep] = useState(0)
  const steps = useMemo(() => [
    { title: zh ? '欢迎使用 OpenCodex' : 'Welcome to OpenCodex', description: zh ? '用几步完成服务器、模型、项目和安全边界配置。所有设置以后都可以修改。' : 'Configure your server, model, project, and security boundaries in a few steps. Everything can be changed later.' },
    { title: zh ? '连接 Runner' : 'Connect a Runner', description: zh ? '选择本地或远程 OpenCode Server，并确认健康检查为在线。' : 'Choose a local or remote OpenCode Server and verify that its health check is online.', tab: 'servers' as const, ready: getHealth(activeServer?.id ?? '')?.status === 'online' },
    { title: zh ? '配置模型' : 'Configure a model', description: zh ? '添加供应商凭据并选择任务默认模型。凭据会保存在系统安全存储中。' : 'Add provider credentials and select a default task model. Credentials are kept in system secure storage.', tab: 'providers' as const },
    { title: zh ? '选择项目' : 'Select a project', description: zh ? '选择工作目录，并可在工作区设置中创建 Project Profile。' : 'Choose a workspace and optionally create a Project Profile in Workspace settings.', tab: 'workspace' as const, ready: props.projectSelected },
    { title: zh ? '确认安全策略' : 'Review security policy', description: zh ? '默认启用沙箱、严格网络白名单和私网保护。需要本地开发服务器时再开启端口监听。' : 'Sandboxing, strict network allowlists, and private-network protection are enabled by default. Enable local binding only when needed.', tab: 'security' as const, ready: true },
  ], [activeServer?.id, getHealth, props.projectSelected, zh])
  const current = steps[step]

  return <Dialog isOpen={props.isOpen} onClose={props.onComplete} title="" ariaLabel={zh ? '首次使用引导' : 'Getting started'} width={620} showCloseButton={false} rawContent>
    <div className="flex min-h-[420px] flex-col bg-bg-000/95 p-6">
      <div className="mb-6 flex items-center gap-2" aria-label={`${step + 1}/${steps.length}`}>
        {steps.map((item, index) => <div key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-accent-main-100' : 'bg-bg-200'}`} />)}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-main-100/10 text-accent-main-100">
          {step === 4 ? <ShieldIcon size={28} /> : step === 0 ? <CheckIcon size={28} /> : <GlobeIcon size={28} />}
        </div>
        <div className="text-[length:var(--fs-heading-2)] font-semibold text-text-100">{current.title}</div>
        <p className="mt-3 max-w-md text-[length:var(--fs-md)] leading-7 text-text-400">{current.description}</p>
        {current.ready !== undefined && <div className={`mt-5 rounded-full px-3 py-1 text-[length:var(--fs-xs)] ${current.ready ? 'bg-success-100/10 text-success-100' : 'bg-warning-100/10 text-warning-100'}`}>{current.ready ? (zh ? '已就绪' : 'Ready') : (zh ? '尚未完成，可稍后继续' : 'Not completed; you can continue later')}</div>}
        {current.tab && <button type="button" onClick={() => props.onOpenSettings(current.tab!)} className="mt-5 rounded-lg border border-border-200 bg-bg-100 px-4 py-2 text-[length:var(--fs-sm)] font-medium text-text-100 hover:bg-bg-200">{zh ? '打开对应设置' : 'Open settings'}</button>}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-border-200/60 pt-4">
        <button type="button" onClick={props.onComplete} className="rounded-lg px-3 py-2 text-[length:var(--fs-sm)] text-text-400 hover:bg-bg-100">{zh ? '跳过引导' : 'Skip'}</button>
        <div className="flex gap-2">
          {step > 0 && <button type="button" onClick={() => setStep(value => value - 1)} className="inline-flex items-center gap-1 rounded-lg border border-border-200 px-3 py-2 text-[length:var(--fs-sm)] text-text-200"><ChevronLeftIcon size={14} />{zh ? '上一步' : 'Back'}</button>}
          <button type="button" onClick={() => step === steps.length - 1 ? props.onComplete() : setStep(value => value + 1)} className="inline-flex items-center gap-1 rounded-lg bg-accent-main-100 px-4 py-2 text-[length:var(--fs-sm)] font-medium text-oncolor-100">{step === steps.length - 1 ? (zh ? '开始使用' : 'Get started') : (zh ? '下一步' : 'Next')}{step < steps.length - 1 && <ChevronRightIcon size={14} />}</button>
        </div>
      </div>
    </div>
  </Dialog>
}
