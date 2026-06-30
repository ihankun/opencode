import type { CustomOpenCodeApi } from "../preload"

declare global {
  interface Window {
    customOpenCode: CustomOpenCodeApi
  }
}
