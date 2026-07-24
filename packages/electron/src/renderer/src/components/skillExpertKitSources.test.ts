import { describe, expect, test } from "bun:test"
import { expertKitSourcesForSkill } from "./skillExpertKitSources"

const sources = [
  { id: "engineering", name: "工程", skills: ["architecture", "debug"] },
  { id: "operations", name: "运营", skills: ["debug", "capacity-plan"] },
]

describe("expertKitSourcesForSkill", () => {
  test("returns every suite that owns a user skill", () => {
    expect(expertKitSourcesForSkill(
      "/Users/test/.opencodex/skills/debug/SKILL.md",
      "/Users/test/.opencodex/skills",
      sources,
    )).toEqual(sources)
  })

  test("does not classify unrelated user or project skills", () => {
    expect(expertKitSourcesForSkill(
      "/Users/test/.opencodex/skills/manual/SKILL.md",
      "/Users/test/.opencodex/skills",
      sources,
    )).toEqual([])
    expect(expertKitSourcesForSkill(
      "/workspace/.opencode/skills/debug/SKILL.md",
      "/Users/test/.opencodex/skills",
      sources,
    )).toEqual([])
  })

  test("supports Windows separators and case-insensitive directory matching", () => {
    expect(expertKitSourcesForSkill(
      "C:\\Users\\test\\.opencodex\\skills\\Architecture\\SKILL.md",
      "C:\\Users\\test\\.opencodex\\skills",
      sources,
    )).toEqual([sources[0]])
  })
})
