import { describe, expect, test } from 'bun:test'
import { parseNaturalTask } from './taskParser'

describe('natural automation commands', () => {
  test('parses daily, weekday and weekly schedules', () => {
    expect(parseNaturalTask('每天18点总结今天修改的内容')).toMatchObject({ frequency: 'daily', time: '18:00' })
    expect(parseNaturalTask('工作日 9:30 检查构建')).toMatchObject({ frequency: 'weekdays', time: '09:30' })
    expect(parseNaturalTask('每周五 17:45 生成周报')).toMatchObject({ frequency: 'weekly', day: '5', time: '17:45' })
  })

  test('rejects missing and invalid times', () => {
    expect(parseNaturalTask('生成周报')).toBeUndefined()
    expect(parseNaturalTask('每天 25:00 运行')).toBeUndefined()
  })

  test('parses localized English schedule phrases', () => {
    expect(parseNaturalTask('weekdays at 18:30 summarize changes')).toMatchObject({ frequency: 'weekdays', time: '18:30' })
    expect(parseNaturalTask('every Monday at 9:00 review pull requests')).toMatchObject({ frequency: 'weekly', day: '1', time: '09:00' })
  })
})
