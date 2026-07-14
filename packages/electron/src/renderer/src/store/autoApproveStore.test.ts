import { describe, expect, test } from 'bun:test'
import { approvalPermissionRules, type ApprovalMode } from './autoApproveStore'

describe('approvalPermissionRules', () => {
  test.each(['ask', 'writes', 'risk'] satisfies ApprovalMode[])('%s asks before leaving the sandbox', mode => {
    expect(approvalPermissionRules(mode)).toContainEqual({
      permission: 'sandbox',
      pattern: '*',
      action: 'ask',
    })
  })

  test('full allows sandbox escalation with the rest of the session', () => {
    expect(approvalPermissionRules('full')).toEqual([{ permission: '*', pattern: '*', action: 'allow' }])
  })
})
