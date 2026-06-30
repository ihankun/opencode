import { app, utilityProcess, protocol, ipcMain, BrowserWindow } from "electron";
import { join, dirname } from "node:path";
import { mkdirSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let logFile;
function initLogging() {
  const dir = join(app.getPath("userData"), "logs");
  mkdirSync(dir, { recursive: true });
  logFile = join(dir, "main.log");
  writeLog("main", "logging initialized", { logFile });
  return logFile;
}
function writeLog(scope, message, meta) {
  const line = `${(/* @__PURE__ */ new Date()).toISOString()} [${scope}] ${message}${meta === void 0 ? "" : ` ${format(meta)}`}
`;
  process.stdout.write(line);
  if (!logFile) return;
  appendFileSync(logFile, line);
}
function format(value) {
  if (value instanceof Error) return JSON.stringify({ message: value.message, stack: value.stack });
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
const SIDECAR_SERVICE_NAME = "custom opencode server";
const SIDECAR_READY_TIMEOUT = 6e4;
const SIDECAR_STOP_TIMEOUT = 6e3;
async function spawnServer(userDataPath, cors) {
  const port = await getRandomPort();
  writeLog("server", "spawning opencode sidecar", { cors, port });
  const password = randomBytes(24).toString("base64url");
  const child = utilityProcess.fork(join(dirname(fileURLToPath(import.meta.url)), "sidecar.js"), [], {
    cwd: process.cwd(),
    env: createEnv(),
    serviceName: SIDECAR_SERVICE_NAME,
    stdio: "pipe"
  });
  let exited = false;
  const exit = defer();
  const onProcessGone = (_event, details) => {
    if (details.type !== "Utility" || details.name !== SIDECAR_SERVICE_NAME) return;
    writeLog("server", "opencode sidecar gone", { reason: details.reason, exitCode: details.exitCode });
  };
  app.on("child-process-gone", onProcessGone);
  child.once("exit", (code) => {
    exited = true;
    app.off("child-process-gone", onProcessGone);
    writeLog("server", "opencode sidecar exited", { code });
    exit.resolve(code);
  });
  child.stdout?.on("data", (chunk) => writeLog("server:stdout", chunk.toString("utf8").trimEnd()));
  child.stderr?.on("data", (chunk) => writeLog("server:stderr", chunk.toString("utf8").trimEnd()));
  const url = await new Promise((resolve, reject) => {
    let done = false;
    const timeout = setTimeout(() => fail(new Error("opencode server did not become ready")), SIDECAR_READY_TIMEOUT);
    const fail = (error) => {
      if (done) return;
      done = true;
      cleanup();
      reject(error);
    };
    const succeed = (value) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(value);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.off("message", onMessage);
      child.off("exit", onExit);
    };
    const onMessage = (message) => {
      if (message.type === "ready") {
        writeLog("server", "opencode sidecar ready", { url: message.url });
        succeed(message.url);
        return;
      }
      if (message.type === "error") fail(Object.assign(new Error(message.error.message), { stack: message.error.stack }));
    };
    const onExit = (code) => fail(new Error(`opencode sidecar exited before ready with code ${code}`));
    child.on("message", onMessage);
    child.on("exit", onExit);
    child.postMessage({
      type: "start",
      hostname: "127.0.0.1",
      port,
      password,
      userDataPath,
      cors
    });
  }).catch((error) => {
    if (!exited) child.kill();
    throw error;
  });
  let stopping;
  return {
    state: {
      url,
      username: "opencode",
      password
    },
    stop() {
      if (stopping) return stopping;
      if (exited) return Promise.resolve();
      child.postMessage({ type: "stop" });
      stopping = Promise.race([
        exit.promise.then(() => void 0),
        delay(SIDECAR_STOP_TIMEOUT).then(() => {
          if (!exited) child.kill();
        })
      ]);
      return stopping;
    }
  };
}
function createEnv() {
  const env = Object.fromEntries(
    Object.entries(process.env).flatMap(([key, value]) => value === void 0 ? [] : [[key, String(value)]])
  );
  delete env.DEBUG;
  if (process.platform === "linux") delete env.LD_PRELOAD;
  return env;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getRandomPort() {
  return new Promise((resolve, reject) => {
    const server2 = createServer();
    server2.once("error", reject);
    server2.listen(0, "127.0.0.1", () => {
      const address = server2.address();
      server2.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
          return;
        }
        reject(new Error("Failed to allocate a random local port"));
      });
    });
  });
}
function defer() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
let mainWindow;
let server;
let serverError;
function rendererUrl() {
  if (process.env.ELECTRON_RENDERER_URL) return process.env.ELECTRON_RENDERER_URL;
  return `file://${join(__dirname, "../renderer/index.html")}`;
}
async function createWindow() {
  const url = rendererUrl();
  writeLog("main", "creating window", { url });
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 580,
    show: false,
    backgroundColor: "#0f1115",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.once("ready-to-show", () => {
    writeLog("main", "window ready-to-show");
    mainWindow?.show();
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    writeLog("main", "window did-fail-load", { errorCode, errorDescription, validatedURL });
    mainWindow?.show();
  });
  setTimeout(() => {
    if (!mainWindow || mainWindow.isVisible()) return;
    writeLog("main", "forcing window show after timeout");
    mainWindow.show();
  }, 2e3);
  void mainWindow.loadURL(url).catch((error) => {
    writeLog("main", "window loadURL failed", error);
    mainWindow?.show();
  });
  void startServer(url);
}
async function startServer(url) {
  try {
    serverError = void 0;
    server = await spawnServer(app.getPath("userData"), allowedOrigins(url));
    mainWindow?.webContents.send("server:updated", currentServerState());
  } catch (error) {
    serverError = error instanceof Error ? error.message : String(error);
    writeLog("main", "failed to start opencode server", error);
    mainWindow?.webContents.send("server:updated", currentServerState());
  }
}
async function stopServer() {
  const current = server;
  server = void 0;
  await current?.stop();
}
function allowedOrigins(url) {
  const defaults = ["custom-opencode://renderer", "http://localhost:46237", "http://127.0.0.1:46237"];
  try {
    const origin = new URL(url).origin;
    if (origin === "null") return defaults;
    return [.../* @__PURE__ */ new Set([...defaults, origin])];
  } catch {
    return defaults;
  }
}
app.setName("Custom OpenCode");
app.setAppUserModelId("com.hankun.opencode.custom");
app.setPath("userData", join(app.getPath("appData"), "CustomOpenCode"));
initLogging();
writeLog("main", "app boot", { userData: app.getPath("userData") });
process.on("uncaughtException", (error) => {
  writeLog("main", "uncaughtException", error);
});
process.on("unhandledRejection", (error) => {
  writeLog("main", "unhandledRejection", error);
});
protocol.registerSchemesAsPrivileged([
  {
    scheme: "custom-opencode",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);
function currentServerState() {
  if (server) return { status: "online", server: server.state };
  return { status: "starting", error: serverError };
}
ipcMain.handle("server:get", currentServerState);
app.on("before-quit", () => {
  void stopServer();
});
app.on("window-all-closed", () => {
  void stopServer().finally(() => app.quit());
});
void app.whenReady().then(() => {
  writeLog("main", "app ready");
  return createWindow();
}).catch((error) => {
  writeLog("main", "startup failed", error);
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length > 0) return;
  void createWindow();
});
