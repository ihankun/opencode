import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, protocol } from "electron"
import { join } from "node:path"
import { initLogging, writeLog } from "./logging"
import { spawnServer } from "./server"
import type { SidecarHandle } from "./server"

let mainWindow: BrowserWindow | undefined
let server: SidecarHandle | undefined
let serverError: string | undefined
let tray: Tray | undefined
let isQuitting = false
let isStoppingForQuit = false

function rendererUrl() {
  if (process.env.ELECTRON_RENDERER_URL) return process.env.ELECTRON_RENDERER_URL
  return `file://${join(__dirname, "../renderer/index.html")}`
}

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showWindow()
    return
  }

  const url = rendererUrl()
  writeLog("main", "creating window", { url })

  mainWindow = new BrowserWindow({
    title: "",
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 580,
    show: false,
    icon: iconPath("icon.icns"),
    backgroundColor: "#0f1115",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault()
    mainWindow?.setTitle("")
  })
  mainWindow.on("close", (event) => {
    if (isQuitting) return
    event.preventDefault()
    mainWindow?.hide()
  })
  mainWindow.once("ready-to-show", () => {
    writeLog("main", "window ready-to-show")
    mainWindow?.show()
  })
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    writeLog("main", "window did-fail-load", { errorCode, errorDescription, validatedURL })
    mainWindow?.show()
  })
  setTimeout(() => {
    if (!mainWindow || mainWindow.isVisible()) return
    writeLog("main", "forcing window show after timeout")
    mainWindow.show()
  }, 2_000)

  void mainWindow.loadURL(url).catch((error: unknown) => {
    writeLog("main", "window loadURL failed", error)
    mainWindow?.show()
  })
  void startServer(url)
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    void createWindow()
    return
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createTray() {
  if (tray) return

  const image = nativeImage.createFromPath(iconPath("generated/opencode-trayTemplate.png"))
  if (process.platform === "darwin") image.setTemplateImage(true)

  tray = new Tray(image)
  tray.setToolTip("Custom OpenCode")
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开 OpenCode", click: showWindow },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on("click", showWindow)
}

function iconPath(filename: string) {
  return join(__dirname, "../../assets", filename)
}

function setDockIcon() {
  if (process.platform !== "darwin") return

  try {
    const image = nativeImage.createFromPath(iconPath("icon.icns"))
    if (image.isEmpty()) {
      writeLog("main", "dock icon skipped because image is empty", { path: iconPath("icon.icns") })
      return
    }
    app.dock?.setIcon(image)
  } catch (error) {
    writeLog("main", "dock icon failed", error)
  }
}

async function startServer(url: string) {
  try {
    serverError = undefined
    server = await spawnServer(app.getPath("userData"), allowedOrigins(url))
    mainWindow?.webContents.send("server:updated", currentServerState())
  } catch (error) {
    serverError = error instanceof Error ? error.message : String(error)
    writeLog("main", "failed to start opencode server", error)
    mainWindow?.webContents.send("server:updated", currentServerState())
  }
}

async function stopServer() {
  const current = server
  server = undefined
  await current?.stop()
}

function allowedOrigins(url: string) {
  const defaults = ["custom-opencode://renderer", "http://localhost:46237", "http://127.0.0.1:46237"]
  try {
    const origin = new URL(url).origin
    if (origin === "null") return defaults
    return [...new Set([...defaults, origin])]
  } catch {
    return defaults
  }
}

app.setName("Custom OpenCode")
app.setAppUserModelId("com.hankun.opencode.custom")
app.setPath("userData", join(app.getPath("appData"), "CustomOpenCode"))
initLogging()
writeLog("main", "app boot", { userData: app.getPath("userData") })

process.on("uncaughtException", (error) => {
  writeLog("main", "uncaughtException", error)
})

process.on("unhandledRejection", (error) => {
  writeLog("main", "unhandledRejection", error)
})

protocol.registerSchemesAsPrivileged([
  {
    scheme: "custom-opencode",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

function currentServerState() {
  if (server) return { status: "online" as const, server: server.state }
  return { status: "starting" as const, error: serverError }
}

ipcMain.handle("server:get", currentServerState)

app.on("before-quit", (event) => {
  if (isStoppingForQuit) return
  event.preventDefault()
  isQuitting = true
  isStoppingForQuit = true
  void stopServer().finally(() => app.exit(0))
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") return
})

void app.whenReady().then(() => {
  writeLog("main", "app ready")
  createTray()
  setDockIcon()
  return createWindow()
}).catch((error: unknown) => {
  writeLog("main", "startup failed", error)
})

app.on("activate", () => {
  showWindow()
})
