export type ParsedNaturalTask = {
  title: string
  prompt: string
  frequency: 'daily' | 'weekdays' | 'weekly'
  time: string
  day: string
}

export function parseNaturalTask(text: string): ParsedNaturalTask | undefined {
  const value = text.trim()
  const time = value.match(/(?:每天|工作日|周[一二三四五六日天])?\s*(\d{1,2})(?:[:：点时](\d{1,2})?)?/)
  if (!time) return
  const hour = Number(time[1])
  const minute = Number(time[2] ?? 0)
  if (hour > 23 || minute > 59) return
  const weekly = value.match(/(?:每)?周([一二三四五六日天])/)
  const englishFrequency = value.match(/\b(weekdays|every\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/i)
  const frequency = weekly || englishFrequency?.[2] ? 'weekly' as const : value.includes('工作日') || englishFrequency?.[1].toLowerCase() === 'weekdays' ? 'weekdays' as const : 'daily' as const
  const names = '日一二三四五六'
  const englishDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const day = weekly ? String(weekly[1] === '天' ? 0 : names.indexOf(weekly[1])) : englishFrequency?.[2] ? String(englishDays.indexOf(englishFrequency[2].toLowerCase())) : '1'
  const prompt = value.replace(time[0], '').replace(englishFrequency?.[0] ?? '', '').replace(/^每\s*/, '').replace(/^(请|帮我|提醒我)\s*/, '').replace(/^\s*(?:daily\s+)?at\s+/i, '').trim()
  return { title: prompt.slice(0, 24), prompt: prompt || value, frequency, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, day }
}
