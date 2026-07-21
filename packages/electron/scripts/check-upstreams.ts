import manifest from '../upstream-sources.json'

type Source = (typeof manifest.sources)[number]

const token = process.env.GITHUB_TOKEN
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'OpenCodex-upstream-check',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
}

const results = await Promise.all(manifest.sources.map(check))
console.table(results)
if (results.some(result => result.status === 'error')) process.exitCode = 1

async function check(source: Source) {
  try {
    const latest = source.tracking === 'release'
      ? await latestRelease(source.repository)
      : await latestCommit(source.repository)
    return {
      source: source.id,
      pinned: source.pinned.slice(0, 16),
      latest: latest.slice(0, 16),
      status: equivalent(source.pinned, latest) ? 'current' : 'update available',
      path: source.localPath,
    }
  } catch (error) {
    return {
      source: source.id,
      pinned: source.pinned.slice(0, 16),
      latest: '—',
      status: 'error',
      path: error instanceof Error ? error.message : String(error),
    }
  }
}

async function latestRelease(repository: string) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, { headers })
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`)
  const value = await response.json() as { tag_name?: unknown }
  if (typeof value.tag_name !== 'string') throw new Error('Latest release has no tag')
  return value.tag_name
}

async function latestCommit(repository: string) {
  const response = await fetch(`https://api.github.com/repos/${repository}/commits?per_page=1`, { headers })
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`)
  const value = await response.json() as Array<{ sha?: unknown }>
  if (typeof value[0]?.sha !== 'string') throw new Error('Repository has no commits')
  return value[0].sha
}

function equivalent(pinned: string, latest: string) {
  return pinned.replace(/^v/, '') === latest.replace(/^v/, '') || latest.startsWith(pinned) || pinned.startsWith(latest)
}
