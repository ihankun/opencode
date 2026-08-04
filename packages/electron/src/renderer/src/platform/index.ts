export async function platformOpenUrl(url: string, mode: 'internal' | 'system') {
  // mailto 只能在系统邮件客户端打开，internal 沙箱不支持
  const isMailto = url.startsWith('mailto:')
  if (!isMailto && mode === 'internal' && typeof window.customOpenCode?.openInternalUrl === 'function') {
    await window.customOpenCode.openInternalUrl(url)
    return
  }
  if (typeof window.customOpenCode?.openExternalUrl === 'function') {
    await window.customOpenCode.openExternalUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
