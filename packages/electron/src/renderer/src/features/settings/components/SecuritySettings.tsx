import { useEffect, useState } from 'react'
import type { CustomOpenCodeSecurityConfig } from '../../../../../preload'
import { SegmentedControl, SettingRow, SettingsSection, Toggle } from './SettingsUI'

const fieldClass = 'w-full min-h-20 resize-y rounded-lg border border-border-200 bg-bg-000 px-3 py-2 text-[length:var(--fs-sm)] text-text-100 outline-none focus:border-accent-main-100'

export function SecuritySettings() {
  const [config, setConfig] = useState<CustomOpenCodeSecurityConfig>()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    void window.customOpenCode.security().then(setConfig)
  }, [])

  if (!config) return <div className="text-sm text-text-400">正在读取安全策略…</div>

  const setSandbox = (value: Partial<CustomOpenCodeSecurityConfig['sandbox']>) => {
    setConfig({ ...config, sandbox: { ...config.sandbox, ...value } })
    setStatus('idle')
  }
  const setAudit = (value: Partial<CustomOpenCodeSecurityConfig['audit']>) => {
    setConfig({ ...config, audit: { ...config.audit, ...value } })
    setStatus('idle')
  }
  const listField = (label: string, description: string, value: string[], onChange: (value: string[]) => void) => (
    <label className="flex flex-col gap-2">
      <span className="text-[length:var(--fs-md)] font-medium text-text-100">{label}</span>
      <span className="text-[length:var(--fs-sm)] text-text-400">{description}</span>
      <textarea
        className={fieldClass}
        value={value.join('\n')}
        onChange={event => onChange(event.target.value.split(/\n|,/).map(item => item.trim()).filter(Boolean))}
      />
    </label>
  )

  return (
    <div>
      <SettingsSection title="沙箱">
        <SettingRow label="启用 Agent 沙箱" description="限制 Agent 文件工具和 bash 命令可读写的路径，并限制命令可访问的网络；默认开启。">
          <Toggle enabled={config.sandbox.enabled} onChange={() => setSandbox({ enabled: !config.sandbox.enabled })} />
        </SettingRow>
        <div className="rounded-lg border border-border-200/60 bg-bg-050 px-3 py-2 text-[length:var(--fs-sm)] text-text-300">
          {config.sandbox.enabled ? '已启用：Agent 的文件工具与命令共享路径限制；命令额外使用操作系统沙箱限制文件系统和网络。' : '已关闭：Agent 工具与命令不再施加这套额外的文件系统和网络边界。'}
        </div>
        <div className="rounded-lg border border-accent-main-100/25 bg-accent-main-100/5 px-3 py-2 text-[length:var(--fs-sm)] text-text-300">
          命中限制时会先通过对话中的权限弹窗申请授权。“允许一次”只放行本次操作；拒绝后不会越过沙箱边界执行。
        </div>
        {listField('禁止读取', '每行一个绝对路径或 ~ 路径。允许读取规则优先于禁止读取。', config.sandbox.denyRead, denyRead => setSandbox({ denyRead }))}
        {listField('额外允许读取', '只添加确实需要暴露给 Agent 的路径。', config.sandbox.allowRead, allowRead => setSandbox({ allowRead }))}
        {listField('额外允许写入', '留空时自动允许当前项目、worktree 和临时目录。危险的系统根目录会被拒绝。', config.sandbox.allowWrite, allowWrite => setSandbox({ allowWrite }))}
        {listField('禁止写入', '优先级高于允许写入，可用于保护项目中的 .env 或发布配置。', config.sandbox.denyWrite, denyWrite => setSandbox({ denyWrite }))}
        {listField('网络白名单', '支持 *.example.com。未列出的域名默认无法访问。', config.sandbox.allowedDomains, allowedDomains => setSandbox({ allowedDomains }))}
        {listField('网络黑名单', '即使匹配白名单也明确拒绝的域名。', config.sandbox.deniedDomains, deniedDomains => setSandbox({ deniedDomains }))}
        {listField('允许 Unix Socket', '每行一个 Socket 路径；通常保持为空。', config.sandbox.allowUnixSockets, allowUnixSockets => setSandbox({ allowUnixSockets }))}
        <SettingRow label="允许所有 Unix Socket" description="可能使 Agent 访问 Docker 等宿主服务，建议关闭。">
          <Toggle enabled={config.sandbox.allowAllUnixSockets} onChange={() => setSandbox({ allowAllUnixSockets: !config.sandbox.allowAllUnixSockets })} />
        </SettingRow>
        <SettingRow label="允许本地端口监听" description="允许命令启动本地开发服务器。">
          <Toggle enabled={config.sandbox.allowLocalBinding} onChange={() => setSandbox({ allowLocalBinding: !config.sandbox.allowLocalBinding })} />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="审计">
        <SettingRow label="记录 Agent 活动" description="发送消息后立即创建会话日志，并记录 Assistant 完成消息、命令参数、工具结果和代码修改；默认关闭。">
          <Toggle enabled={config.audit.enabled} onChange={() => setAudit({ enabled: !config.audit.enabled })} />
        </SettingRow>
        <SettingRow label="存储格式" description="由 OpenCodex 内置审计器按会话写入结构化 JSONL，不加载外部插件。">
          <div className="w-32"><SegmentedControl value="jsonl" options={[{ value: 'jsonl', label: 'JSONL' }]} onChange={() => undefined} /></div>
        </SettingRow>
        <label className="flex flex-col gap-2">
          <span className="text-[length:var(--fs-md)] font-medium text-text-100">日志目录</span>
          <input className={`${fieldClass} !min-h-0`} value={config.audit.directory} onChange={event => setAudit({ directory: event.target.value })} />
        </label>
      </SettingsSection>

      <div className="flex items-center justify-end gap-3">
        <span className={`text-sm ${status === 'error' ? 'text-danger-100' : 'text-text-400'}`}>
          {status === 'saving' ? '正在保存并重启服务…' : status === 'saved' ? '安全策略已生效' : status === 'error' ? '保存失败，请重试' : '修改后需要保存以重启本地服务'}
        </span>
        <button
          type="button"
          disabled={status === 'saving'}
          className="rounded-lg bg-accent-main-100 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => {
            setStatus('saving')
            void window.customOpenCode.updateSecurity(config).then(value => {
              setConfig(value)
              setStatus('saved')
            }, () => setStatus('error'))
          }}
        >
          保存并应用
        </button>
      </div>
    </div>
  )
}
