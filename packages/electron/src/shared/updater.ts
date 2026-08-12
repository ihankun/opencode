export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "not-available"
  | "error"

export type UpdaterProgress = {
  percent: number
  transferred: number
  total: number
}

export type UpdaterState = {
  supported: boolean
  status: UpdaterStatus
  version: string | null
  releaseName: string | null
  releaseNotes: string | null
  progress: UpdaterProgress | null
  error: string | null
}
