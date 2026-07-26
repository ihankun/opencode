export interface ExtractedUnifiedDiff {
  before: string
  after: string
  beforeLineNumbers?: number[]
  afterLineNumbers?: number[]
}

export function extractContentFromUnifiedDiff(diff: string): ExtractedUnifiedDiff {
  const beforeLines: string[] = []
  const afterLines: string[] = []
  const beforeLineNumbers: number[] = []
  const afterLineNumbers: number[] = []
  let oldLine: number | undefined
  let newLine: number | undefined
  let hasHunk = false

  for (const line of diff.split('\n')) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) {
      oldLine = Number(hunk[1])
      newLine = Number(hunk[2])
      hasHunk = true
      continue
    }

    if (
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('Index:') ||
      line.startsWith('===') ||
      line.startsWith('\\ No newline')
    ) {
      continue
    }

    if (line.startsWith('-')) {
      beforeLines.push(line.slice(1))
      if (oldLine !== undefined) beforeLineNumbers.push(oldLine++)
    } else if (line.startsWith('+')) {
      afterLines.push(line.slice(1))
      if (newLine !== undefined) afterLineNumbers.push(newLine++)
    } else if (line.startsWith(' ')) {
      beforeLines.push(line.slice(1))
      afterLines.push(line.slice(1))
      if (oldLine !== undefined) beforeLineNumbers.push(oldLine++)
      if (newLine !== undefined) afterLineNumbers.push(newLine++)
    }
  }

  const before = beforeLines.join('\n').trimEnd()
  const after = afterLines.join('\n').trimEnd()
  return {
    before,
    after,
    beforeLineNumbers: hasHunk ? beforeLineNumbers.slice(0, before ? before.split('\n').length : 0) : undefined,
    afterLineNumbers: hasHunk ? afterLineNumbers.slice(0, after ? after.split('\n').length : 0) : undefined,
  }
}
