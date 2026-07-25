import { describe, expect, test } from 'bun:test'
import { ensureFileMime, getMimeFromPath, isDocumentFileMime, isFileSupported } from './inputUtils'

const textOnlyCapabilities = {
  image: false,
  pdf: false,
  audio: false,
  video: false,
}

describe('composer document attachments', () => {
  test('recognizes PDF and Office MIME types independently of model media flags', () => {
    const documents = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]

    for (const mime of documents) {
      expect(isDocumentFileMime(mime)).toBe(true)
      expect(isFileSupported(mime, textOnlyCapabilities)).toBe(true)
    }
  })

  test('fills missing Office MIME types from file extensions', () => {
    expect(getMimeFromPath('/tmp/report.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(getMimeFromPath('C:\\tmp\\budget.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(getMimeFromPath('/tmp/slides.pptx')).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )

    const file = ensureFileMime(new File(['slides'], 'slides.pptx'))
    expect(file.type).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation')
  })

  test('still rejects unrelated binary files when the model has no matching capability', () => {
    expect(isFileSupported('application/zip', textOnlyCapabilities)).toBe(false)
    expect(isFileSupported('image/png', textOnlyCapabilities)).toBe(false)
  })
})
