import { describe, expect, test } from "bun:test"
import {
  PROJECT_SESSION_PREVIEW_LIMIT,
  collapsedProjectSessionPreviews,
  projectSessionsForDisplay,
} from "./projectSessionPreview"

describe("project session previews", () => {
  const sessions = Array.from({ length: 8 }, (_, index) => `session-${index + 1}`)

  test("shows five sessions until the project preview is expanded", () => {
    expect(projectSessionsForDisplay(sessions, false, false)).toEqual(
      sessions.slice(0, PROJECT_SESSION_PREVIEW_LIMIT),
    )
    expect(projectSessionsForDisplay(sessions, true, false)).toEqual(sessions)
  })

  test("does not truncate search results", () => {
    expect(projectSessionsForDisplay(sessions, false, true)).toEqual(sessions)
  })

  test("forgets expanded previews when their project is collapsed", () => {
    expect(collapsedProjectSessionPreviews(["a", "b"], ["b", "c"])).toEqual(["b"])
  })
})
