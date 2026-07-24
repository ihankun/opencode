export type ExpertKitSkillSource = {
  id: string
  name: string
  skills: readonly string[]
}

export function expertKitSourcesForSkill(
  location: string,
  userSkillRoot: string | undefined,
  sources: readonly ExpertKitSkillSource[],
) {
  const root = normalizePath(userSkillRoot)
  const normalizedLocation = normalizePath(location)
  const skillDirectory = normalizedLocation.toLowerCase().endsWith("/skill.md")
    ? dirname(normalizedLocation)
    : normalizedLocation
  if (!root || !isUnderPath(skillDirectory, root)) return []
  const relative = skillDirectory.slice(root.length).replace(/^\/+/, "")
  if (!relative || relative.includes("/")) return []
  return sources.filter((source) => source.skills.some((skill) => skill.toLowerCase() === relative.toLowerCase()))
}

function dirname(value: string) {
  const index = value.lastIndexOf("/")
  return index <= 0 ? value : value.slice(0, index)
}

function normalizePath(value?: string) {
  return (value ?? "").replace(/\\/g, "/").replace(/\/+$/, "")
}

function isUnderPath(value: string, parent: string) {
  if (!value || !parent) return false
  return value === parent || value.startsWith(`${parent}/`)
}
