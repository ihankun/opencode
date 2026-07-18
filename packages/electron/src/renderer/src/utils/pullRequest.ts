export function createPullRequestUrl(remoteUrl: string | undefined, branch: string | undefined, base: string | undefined) {
  if (!remoteUrl || !branch || !base || branch === base || !URL.canParse(remoteUrl)) return
  const remote = new URL(remoteUrl)
  const path = remote.pathname.replace(/\/+$/, '')

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
