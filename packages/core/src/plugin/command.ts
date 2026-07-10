export * as CommandPlugin from "./command"

import { define } from "./internal"
import { Effect } from "effect"
import { Location } from "../location"
import PROMPT_INITIALIZE from "./command/initialize.txt"
import PROMPT_REVIEW from "./command/review.txt"

const PROMPT_GOAL = `OpenCode goal mode command "/goal" was invoked.

Arguments:
<goal_command_arguments>
$ARGUMENTS
</goal_command_arguments>

Use the native goal tools to handle this command:
- Empty arguments, "status", "show", or "current": call get_goal and briefly report the current goal.
- "pause": call update_goal_status with status "paused".
- "resume": call update_goal_status with status "active", then continue working toward the goal.
- "clear", "stop", "off", "reset", "none", or "cancel": call clear_goal.
- "complete" or "done": audit real artifacts and call update_goal with status "complete" only if the goal is truly achieved.
- "blocked" or "blocker": call update_goal with status "blocked" only when there is a concrete blocker.
- Otherwise create a new goal with create_goal using the full arguments as the objective.

Create a goal only from explicit /goal arguments. After create_goal succeeds, continue working toward the new goal.`

export const Plugin = define({
  id: "command",
  effect: Effect.fn(function* (ctx) {
    const location = yield* Location.Service
    yield* ctx.command.transform((draft) => {
      draft.update("init", (command) => {
        command.template = PROMPT_INITIALIZE.replace("${path}", location.project.directory)
        command.description = "guided AGENTS.md setup"
      })
      draft.update("review", (command) => {
        command.template = PROMPT_REVIEW.replace("${path}", location.project.directory)
        command.description = "review changes [commit|branch|pr], defaults to uncommitted"
        command.subtask = true
      })
      draft.update("goal", (command) => {
        command.template = PROMPT_GOAL
        command.description = "创建或查看当前目标"
        command.agent = "goal"
      })
    })
  }),
})
