import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { clearGoal, closeGoal, createGoal, getGoal, setGoalStatus, updateGoalProgress } from "@/goal/state"

const Empty = Schema.Struct({})
const CreateGoalParameters = Schema.Struct({
  objective: Schema.String,
})
const ProgressParameters = Schema.Struct({
  step: Schema.optional(Schema.Number),
  statusMessage: Schema.optional(Schema.String),
})
const StatusParameters = Schema.Struct({
  status: Schema.Literals(["active", "paused"]),
})
const CloseParameters = Schema.Struct({
  status: Schema.Literals(["complete", "blocked"]),
  evidence: Schema.optional(Schema.String),
  blocker: Schema.optional(Schema.String),
})

export const GetGoalTool = Tool.define(
  "get_goal",
  Effect.succeed({
    description: "Get the current native OpenCodex goal for this session, including status, objective, current step, and progress.",
    parameters: Empty,
    execute: (_params: {}, ctx: Tool.Context) =>
      Effect.promise(() => getGoal(ctx.sessionID)).pipe(
        Effect.map((goal) => ({
          title: "Goal",
          output: JSON.stringify({ goal }, null, 2),
          metadata: {},
        })),
      ),
  }),
)

export const CreateGoalTool = Tool.define(
  "create_goal",
  Effect.succeed({
    description:
      "Create a native OpenCodex goal only when explicitly requested by the user, such as via /goal. Fails if an open goal already exists.",
    parameters: CreateGoalParameters,
    execute: (params: typeof CreateGoalParameters.Type, ctx: Tool.Context) =>
      Effect.promise(() => createGoal(ctx.sessionID, params.objective, { paused: ctx.agent === "plan" })).pipe(
        Effect.map((goal) => ({
          title: "Goal created",
          output: JSON.stringify({ goal }, null, 2),
          metadata: {},
        })),
      ),
  }),
)

export const UpdateGoalProgressTool = Tool.define(
  "update_goal_progress",
  Effect.succeed({
    description:
      "Update the current native OpenCodex goal progress after a meaningful milestone. Increase step only when moving to a new concrete phase.",
    parameters: ProgressParameters,
    execute: (params: typeof ProgressParameters.Type, ctx: Tool.Context) =>
      Effect.promise(() => updateGoalProgress(ctx.sessionID, params)).pipe(
        Effect.map((goal) => ({
          title: "Goal progress",
          output: JSON.stringify({ goal }, null, 2),
          metadata: {},
        })),
      ),
  }),
)

export const UpdateGoalStatusTool = Tool.define(
  "update_goal_status",
  Effect.succeed({
    description: "Pause or resume the current native OpenCodex goal when the user explicitly asks.",
    parameters: StatusParameters,
    execute: (params: typeof StatusParameters.Type, ctx: Tool.Context) =>
      Effect.promise(() => setGoalStatus(ctx.sessionID, params.status)).pipe(
        Effect.map((goal) => ({
          title: params.status === "paused" ? "Goal paused" : "Goal resumed",
          output: JSON.stringify({ goal }, null, 2),
          metadata: {},
        })),
      ),
  }),
)

export const UpdateGoalTool = Tool.define(
  "update_goal",
  Effect.succeed({
    description:
      "Close the current native OpenCodex goal. Use complete only after verifying all requirements with evidence; use blocked only for a concrete blocker.",
    parameters: CloseParameters,
    execute: (params: typeof CloseParameters.Type, ctx: Tool.Context) =>
      Effect.promise(() => closeGoal(ctx.sessionID, params)).pipe(
        Effect.map((goal) => ({
          title: params.status === "complete" ? "Goal complete" : "Goal blocked",
          output: JSON.stringify({ goal }, null, 2),
          metadata: {},
        })),
      ),
  }),
)

export const ClearGoalTool = Tool.define(
  "clear_goal",
  Effect.succeed({
    description: "Clear the current native OpenCodex goal when the user explicitly asks to stop, reset, cancel, or clear it.",
    parameters: Empty,
    execute: (_params: {}, ctx: Tool.Context) =>
      Effect.promise(() => clearGoal(ctx.sessionID)).pipe(
        Effect.map((cleared) => ({
          title: "Goal cleared",
          output: JSON.stringify({ cleared }, null, 2),
          metadata: {},
        })),
      ),
  }),
)
