const TEAM = {
  tui: ["kommander", "simonklee"],
  desktop_web: ["Hona", "Brendonovich"],
  core: ["jlongster", "rekram1-node", "nexxeln", "kitlangton"],
  inference: ["fwang", "MrMushrooooom", "starptech"],
  windows: ["Hona"],
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)]
}

export default {
  description: `Use this tool to assign a GitHub issue.

Provide the team that should own the issue. This tool picks a random assignee from that team and does not apply labels.`,
  args: {
    team: {
      type: "string",
      enum: ["tui", "desktop_web", "core", "inference", "windows"],
      description: "The owning team",
    },
  },
  async execute(args) {
    const issue = parseInt(process.env.ISSUE_NUMBER ?? "", 10)
    if (!issue) throw new Error("ISSUE_NUMBER env var not set")
    const owner = "anomalyco"
    const repo = "opencode"
    const assignee = pick(TEAM[args.team])

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issue}/assignees`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assignees: [assignee] }),
    })
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return `Assigned @${assignee} from ${args.team} to issue #${issue}`
  },
}
