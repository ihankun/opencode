import { initializeRendererSettingsPersistence } from "./rendererSettings"

async function bootstrap() {
  await initializeRendererSettingsPersistence().catch((error) => {
    console.error("Failed to initialize renderer settings persistence", error)
  })
  await import("./main")
}

void bootstrap()
