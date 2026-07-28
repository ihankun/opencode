export type CustomOpenCodeDeepLink =
  | {
      action: "open-project"
      directory: string
    }
  | {
      action: "new-session"
      directory: string
      prompt?: string
    }
