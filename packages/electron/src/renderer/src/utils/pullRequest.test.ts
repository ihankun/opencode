import { describe, expect, test } from 'bun:test'
import { createPullRequestUrl } from './pullRequest'

describe('createPullRequestUrl', () => {
  test('creates GitHub compare URLs', () => {
    expect(createPullRequestUrl('https://github.com/owner/repo', 'feature/ui', 'main')).toBe(
      'https://github.com/owner/repo/compare/main...feature%2Fui?expand=1',
    )
  })

  test('normalizes SCP-style and SSH remotes', () => {
    expect(createPullRequestUrl('git@github.com:owner/repo.git', 'feature/ui', 'main')).toBe(
      'https://github.com/owner/repo/compare/main...feature%2Fui?expand=1',
    )
    expect(createPullRequestUrl('ssh://git@gitlab.com/group/repo.git', 'feature/ui', 'main')).toBe(
      'https://gitlab.com/group/repo/-/merge_requests/new?merge_request%5Bsource_branch%5D=feature%2Fui&merge_request%5Btarget_branch%5D=main',
    )
  })

  test('creates GitLab merge request URLs', () => {
    expect(createPullRequestUrl('https://gitlab.com/group/repo', 'feature/ui', 'main')).toBe(
      'https://gitlab.com/group/repo/-/merge_requests/new?merge_request%5Bsource_branch%5D=feature%2Fui&merge_request%5Btarget_branch%5D=main',
    )
  })

  test('requires a supported remote and different branches', () => {
    expect(createPullRequestUrl('https://example.com/owner/repo', 'feature', 'main')).toBeUndefined()
    expect(createPullRequestUrl('https://github.com/owner/repo', 'main', 'main')).toBeUndefined()
  })
})
