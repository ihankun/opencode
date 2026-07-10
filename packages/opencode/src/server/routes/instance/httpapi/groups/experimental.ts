import { AccountID, DeviceCode, OrgID, UserCode } from "@/account/schema"
import { MCP } from "@/mcp"

import { Session } from "@/session/session"
import { SessionID } from "@/session/schema"
import { Worktree } from "@/worktree"
import { NonNegativeInt } from "@opencode-ai/core/schema"
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import {
  WorkspaceRoutingMiddleware,
  WorkspaceRoutingQuery,
  WorkspaceRoutingQueryFields,
} from "../middleware/workspace-routing"
import { described } from "./metadata"
import { QueryBoolean } from "./query"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { ModelV2 } from "@opencode-ai/core/model"

const ConsoleStateResponse = Schema.Struct({
  consoleManagedProviders: Schema.mutable(Schema.Array(Schema.String)),
  activeOrgName: Schema.optionalKey(Schema.String),
  switchableOrgCount: NonNegativeInt,
}).annotate({ identifier: "ConsoleState" })

const CapabilitiesResponse = Schema.Struct({
  backgroundSubagents: Schema.Boolean,
}).annotate({ identifier: "ExperimentalCapabilities" })

const ConsoleOrgOption = Schema.Struct({
  accountID: Schema.String,
  accountEmail: Schema.String,
  accountUrl: Schema.String,
  orgID: Schema.String,
  orgName: Schema.String,
  active: Schema.Boolean,
})

const ConsoleOrgList = Schema.Struct({
  orgs: Schema.Array(ConsoleOrgOption),
})

const ConsoleAccountOption = Schema.Struct({
  accountID: Schema.String,
  accountEmail: Schema.String,
  accountUrl: Schema.String,
  active: Schema.Boolean,
})

const ConsoleAccountList = Schema.Struct({
  accounts: Schema.Array(ConsoleAccountOption),
})

const ConsoleProfile = Schema.Struct({
  account: Schema.optional(ConsoleAccountOption),
  org: Schema.optional(
    Schema.Struct({
      orgID: Schema.String,
      orgName: Schema.String,
    }),
  ),
  accounts: Schema.Array(ConsoleAccountOption),
})

export const ConsoleLoginPayload = Schema.Struct({
  url: Schema.optional(Schema.String),
})

const ConsoleLoginStart = Schema.Struct({
  code: DeviceCode,
  user: UserCode,
  url: Schema.String,
  server: Schema.String,
  expiresInMs: NonNegativeInt,
  intervalMs: NonNegativeInt,
})

export const ConsoleLoginPollPayload = ConsoleLoginStart

const ConsoleLoginPoll = Schema.Struct({
  status: Schema.Literals(["success", "pending", "slow", "expired", "denied", "error"]),
  email: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
})

export const ConsoleSwitchPayload = Schema.Struct({
  accountID: AccountID,
  orgID: OrgID,
})

export const ConsoleLogoutPayload = Schema.Struct({
  accountID: Schema.optional(AccountID),
})

const ToolIDs = Schema.Array(Schema.String).annotate({ identifier: "ToolIDs" })
const ToolListItem = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  parameters: Schema.Unknown,
}).annotate({ identifier: "ToolListItem" })
const ToolList = Schema.Array(ToolListItem).annotate({ identifier: "ToolList" })
export const ToolListQuery = Schema.Struct({
  ...WorkspaceRoutingQueryFields,
  provider: ProviderV2.ID,
  model: ModelV2.ID,
})

const GoalStatus = Schema.Literals(["active", "paused", "complete", "blocked"])
const GoalHistoryEntry = Schema.Struct({
  type: Schema.String,
  detail: Schema.String,
  timestamp: Schema.Number,
}).annotate({ identifier: "GoalHistoryEntry" })
const GoalInfo = Schema.Struct({
  sessionID: Schema.String,
  objective: Schema.String,
  status: GoalStatus,
  step: Schema.Number,
  statusMessage: Schema.NullOr(Schema.String),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
  pausedAt: Schema.NullOr(Schema.Number),
  completedAt: Schema.NullOr(Schema.Number),
  evidence: Schema.NullOr(Schema.String),
  blocker: Schema.NullOr(Schema.String),
  history: Schema.Array(GoalHistoryEntry),
}).annotate({ identifier: "GoalInfo" })
const GoalResponse = Schema.Struct({
  goal: Schema.NullOr(GoalInfo),
}).annotate({ identifier: "GoalResponse" })
export const GoalStatusPayload = Schema.Struct({
  status: Schema.Literals(["active", "paused"]),
})

const WorktreeList = Schema.Array(Schema.String)
const WorktreeErrorName = Schema.Union([
  Schema.Literal("WorktreeNotGitError"),
  Schema.Literal("WorktreeNameGenerationFailedError"),
  Schema.Literal("WorktreeCreateFailedError"),
  Schema.Literal("WorktreeStartCommandFailedError"),
  Schema.Literal("WorktreeRemoveFailedError"),
  Schema.Literal("WorktreeResetFailedError"),
  Schema.Literal("WorktreeListFailedError"),
])
export class WorktreeApiError extends Schema.ErrorClass<WorktreeApiError>("WorktreeError")(
  {
    name: WorktreeErrorName,
    data: Schema.Struct({ message: Schema.String }),
  },
  { httpApiStatus: 400 },
) {}
export const SessionListQuery = Schema.Struct({
  ...WorkspaceRoutingQueryFields,
  roots: Schema.optional(QueryBoolean),
  start: Schema.optional(Schema.NumberFromString),
  cursor: Schema.optional(Schema.NumberFromString),
  search: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.NumberFromString),
  archived: Schema.optional(QueryBoolean),
})

export const ExperimentalPaths = {
  capabilities: "/experimental/capabilities",
  console: "/experimental/console",
  consoleOrgs: "/experimental/console/orgs",
  consoleAccounts: "/experimental/console/accounts",
  consoleProfile: "/experimental/console/profile",
  consoleLogin: "/experimental/console/login",
  consoleLoginPoll: "/experimental/console/login/poll",
  consoleLoginWait: "/experimental/console/login/wait",
  consoleLogout: "/experimental/console/logout",
  consoleSwitch: "/experimental/console/switch",
  tool: "/experimental/tool",
  toolIDs: "/experimental/tool/ids",
  goal: "/experimental/goal/:sessionID",
  goalStatus: "/experimental/goal/:sessionID/status",
  worktree: "/experimental/worktree",
  worktreeReset: "/experimental/worktree/reset",
  session: "/experimental/session",
  sessionBackground: "/experimental/session/:sessionID/background",
  resource: "/experimental/resource",
} as const

export const ExperimentalApi = HttpApi.make("experimental")
  .add(
    HttpApiGroup.make("experimental")
      .add(
        HttpApiEndpoint.get("capabilities", ExperimentalPaths.capabilities, {
          query: WorkspaceRoutingQuery,
          success: described(CapabilitiesResponse, "Experimental capabilities"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.capabilities.get",
            summary: "Get experimental capabilities",
            description: "Get experimental features enabled on the OpenCode server.",
          }),
        ),
        HttpApiEndpoint.get("console", ExperimentalPaths.console, {
          query: WorkspaceRoutingQuery,
          success: described(ConsoleStateResponse, "Active Console provider metadata"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.get",
            summary: "Get active Console provider metadata",
            description: "Get the active Console org name and the set of provider IDs managed by that Console org.",
          }),
        ),
        HttpApiEndpoint.get("consoleOrgs", ExperimentalPaths.consoleOrgs, {
          query: WorkspaceRoutingQuery,
          success: described(ConsoleOrgList, "Switchable Console orgs"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.listOrgs",
            summary: "List switchable Console orgs",
            description: "Get the available Console orgs across logged-in accounts, including the current active org.",
          }),
        ),
        HttpApiEndpoint.get("consoleAccounts", ExperimentalPaths.consoleAccounts, {
          query: WorkspaceRoutingQuery,
          success: described(ConsoleAccountList, "Console accounts"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.listAccounts",
            summary: "List Console accounts",
            description: "Get logged-in Console accounts, including the current active account.",
          }),
        ),
        HttpApiEndpoint.get("consoleProfile", ExperimentalPaths.consoleProfile, {
          query: WorkspaceRoutingQuery,
          success: described(ConsoleProfile, "Console profile"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.profile",
            summary: "Get Console profile",
            description: "Get the active Console account and org currently stored in local OpenCode state.",
          }),
        ),
        HttpApiEndpoint.post("consoleLogin", ExperimentalPaths.consoleLogin, {
          query: WorkspaceRoutingQuery,
          payload: ConsoleLoginPayload,
          success: described(ConsoleLoginStart, "Console login device code"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.login",
            summary: "Start Console login",
            description: "Start a Console device authorization flow for the current local OpenCode state.",
          }),
        ),
        HttpApiEndpoint.post("consoleLoginPoll", ExperimentalPaths.consoleLoginPoll, {
          query: WorkspaceRoutingQuery,
          payload: ConsoleLoginPollPayload,
          success: described(ConsoleLoginPoll, "Console login poll status"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.loginPoll",
            summary: "Poll Console login",
            description: "Poll a Console device authorization flow and persist the account when authorization succeeds.",
          }),
        ),
        HttpApiEndpoint.post("consoleLoginWait", ExperimentalPaths.consoleLoginWait, {
          query: WorkspaceRoutingQuery,
          payload: ConsoleLoginPollPayload,
          success: described(ConsoleLoginPoll, "Console login final status"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.loginWait",
            summary: "Wait for Console login",
            description: "Wait for a Console device authorization flow to finish and persist the account when authorization succeeds.",
          }),
        ),
        HttpApiEndpoint.post("consoleLogout", ExperimentalPaths.consoleLogout, {
          query: WorkspaceRoutingQuery,
          payload: ConsoleLogoutPayload,
          success: described(Schema.Boolean, "Logout success"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.logout",
            summary: "Log out of Console",
            description: "Remove a stored Console account from the current local OpenCode state.",
          }),
        ),
        HttpApiEndpoint.post("consoleSwitch", ExperimentalPaths.consoleSwitch, {
          query: WorkspaceRoutingQuery,
          payload: ConsoleSwitchPayload,
          success: described(Schema.Boolean, "Switch success"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.switchOrg",
            summary: "Switch active Console org",
            description: "Persist a new active Console account/org selection for the current local OpenCode state.",
          }),
        ),
        HttpApiEndpoint.get("tool", ExperimentalPaths.tool, {
          query: ToolListQuery,
          success: described(ToolList, "Tools"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tool.list",
            summary: "List tools",
            description:
              "Get a list of available tools with their JSON schema parameters for a specific provider and model combination.",
          }),
        ),
        HttpApiEndpoint.get("toolIDs", ExperimentalPaths.toolIDs, {
          query: WorkspaceRoutingQuery,
          success: described(ToolIDs, "Tool IDs"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tool.ids",
            summary: "List tool IDs",
            description:
              "Get a list of all available tool IDs, including both built-in tools and dynamically registered tools.",
          }),
        ),
        HttpApiEndpoint.get("goal", ExperimentalPaths.goal, {
          params: { sessionID: SessionID },
          query: WorkspaceRoutingQuery,
          success: described(GoalResponse, "Goal state"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.goal.get",
            summary: "Get session goal",
            description: "Get the durable goal state for a session.",
          }),
        ),
        HttpApiEndpoint.post("goalStatus", ExperimentalPaths.goalStatus, {
          params: { sessionID: SessionID },
          query: WorkspaceRoutingQuery,
          payload: GoalStatusPayload,
          success: described(GoalResponse, "Goal state"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.goal.status",
            summary: "Update session goal status",
            description: "Pause or resume the durable goal state for a session.",
          }),
        ),
        HttpApiEndpoint.delete("goalClear", ExperimentalPaths.goal, {
          params: { sessionID: SessionID },
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Goal cleared"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.goal.clear",
            summary: "Clear session goal",
            description: "Remove the durable goal state for a session.",
          }),
        ),
        HttpApiEndpoint.get("worktree", ExperimentalPaths.worktree, {
          query: WorkspaceRoutingQuery,
          success: described(WorktreeList, "List of worktree directories"),
          error: WorktreeApiError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "worktree.list",
            summary: "List worktrees",
            description: "List all sandbox worktrees for the current project.",
          }),
        ),
        HttpApiEndpoint.post("worktreeCreate", ExperimentalPaths.worktree, {
          disableCodecs: true,
          query: WorkspaceRoutingQuery,
          payload: [HttpApiSchema.NoContent, Worktree.CreateInput],
          success: described(Worktree.Info, "Worktree created"),
          error: WorktreeApiError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "worktree.create",
            summary: "Create worktree",
            description: "Create a new git worktree for the current project and run any configured startup scripts.",
          }),
        ),
        HttpApiEndpoint.delete("worktreeRemove", ExperimentalPaths.worktree, {
          query: WorkspaceRoutingQuery,
          payload: Worktree.RemoveInput,
          success: described(Schema.Boolean, "Worktree removed"),
          error: WorktreeApiError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "worktree.remove",
            summary: "Remove worktree",
            description: "Remove a git worktree and delete its branch.",
          }),
        ),
        HttpApiEndpoint.post("worktreeReset", ExperimentalPaths.worktreeReset, {
          query: WorkspaceRoutingQuery,
          payload: Worktree.ResetInput,
          success: described(Schema.Boolean, "Worktree reset"),
          error: WorktreeApiError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "worktree.reset",
            summary: "Reset worktree",
            description: "Reset a worktree branch to the primary default branch.",
          }),
        ),
        HttpApiEndpoint.get("session", ExperimentalPaths.session, {
          query: SessionListQuery,
          success: described(Schema.Array(Session.GlobalInfo), "List of sessions"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.session.list",
            summary: "List sessions",
            description:
              "Get a list of all OpenCode sessions across projects, sorted by most recently updated. Archived sessions are excluded by default.",
          }),
        ),
        HttpApiEndpoint.post("sessionBackground", ExperimentalPaths.sessionBackground, {
          params: { sessionID: SessionID },
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Backgrounded subagents"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.session.background",
            summary: "Background subagents",
            description:
              "Detach any synchronous subagents currently blocking the session and continue them in the background.",
          }),
        ),
        HttpApiEndpoint.get("resource", ExperimentalPaths.resource, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Record(Schema.String, MCP.Resource), "MCP resources"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.resource.list",
            summary: "Get MCP resources",
            description: "Get all available MCP resources from connected servers. Optionally filter by name.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "experimental",
          description: "Experimental HttpApi read-only routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "opencode experimental HttpApi",
      version: "0.0.1",
      description: "Experimental HttpApi surface for selected instance routes.",
    }),
  )
