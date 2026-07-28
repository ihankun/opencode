export async function platformOpenUrl(url: string, mode: 'internal' | 'system') {
  if (mode === 'internal' && typeof window.customOpenCode?.openInternalUrl === 'function') {
    await window.customOpenCode.openInternalUrl(url)
    return
  }
  if (typeof window.customOpenCode?.openExternalUrl === 'function') {
    await window.customOpenCode.openExternalUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
