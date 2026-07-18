export function createPullRequestUrl(remoteUrl: string | undefined, branch: string | undefined, base: string | undefined) {
  if (!remoteUrl || !branch || !base || branch === base) return
  const remote = normalizeGitRemoteUrl(remoteUrl)
  if (!remote) return
  const path = remote.pathname.replace(/\/+$/, '').replace(/\.git$/, '')

  if (remote.hostname === 'github.com' || remote.hostname.endsWith('.github.com')) {
    return `${remote.origin}${path}/compare/${encodeURIComponent(base)}...${encodeURIComponent(branch)}?expand=1`
  }

  if (remote.hostname === 'gitlab.com' || remote.hostname.includes('gitlab')) {
    const url = new URL(`${path}/-/merge_requests/new`, remote.origin)
    url.searchParams.set('merge_request[source_branch]', branch)
    url.searchParams.set('merge_request[target_branch]', base)
    return url.toString()
  }

  if (remote.hostname === 'bitbucket.org' || remote.hostname.includes('bitbucket')) {
    const url = new URL(`${path}/pull-requests/new`, remote.origin)
    url.searchParams.set('source', branch)
    url.searchParams.set('dest', base)
    return url.toString()
  }
}

function normalizeGitRemoteUrl(value: string) {
  const remote = value.trim()
  const scp = remote.includes('://') ? undefined : remote.match(/^(?:[^@\s]+@)?([^/:\s]+):(.+)$/)
  if (scp) return new URL(`https://${scp[1]}/${scp[2]}`)
  if (!URL.canParse(remote)) return
  const url = new URL(remote)
  if (url.protocol === 'http:' || url.protocol === 'https:') return url
  if (url.protocol === 'ssh:' && url.hostname) return new URL(`https://${url.hostname}${url.pathname}`)
}
