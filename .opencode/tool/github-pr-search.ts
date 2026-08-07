export default {
  description: `Use this tool to search GitHub pull requests by title and description.

This tool searches PRs in the anomalyco/opencode repository and returns LLM-friendly results including:
- PR number and title
- Author
- State (open/closed/merged)
- Labels
- Description snippet

Use the query parameter to search for keywords that might appear in PR titles or descriptions.`,
  args: {
    query: { type: "string", description: "Search query for PR titles and descriptions" },
    limit: { type: "number", description: "Maximum number of results to return", default: 10 },
    offset: { type: "number", description: "Number of results to skip for pagination", default: 0 },
  },
  async execute(args) {
    const owner = "anomalyco"
    const repo = "opencode"

    const page = Math.floor(args.offset / args.limit) + 1
    const searchQuery = encodeURIComponent(`${args.query} repo:${owner}/${repo} type:pr state:open`)
    const result = await fetch(
      `https://api.github.com/search/issues?q=${searchQuery}&per_page=${args.limit}&page=${page}&sort=updated&order=desc`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
      },
    )
    if (!result.ok) {
      throw new Error(`GitHub API error: ${result.status} ${result.statusText}`)
    }
    const data = await result.json()

    if (data.total_count === 0) {
      return `No PRs found matching "${args.query}"`
    }

    const prs = data.items

    if (prs.length === 0) {
      return `No other PRs found matching "${args.query}"`
    }

    const formatted = prs.map((pr) => `${pr.title}\n${pr.html_url}`).join("\n\n")

    return `Found ${data.total_count} PRs (showing ${prs.length}):\n\n${formatted}`
  },
}
