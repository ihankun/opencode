import { app, utilityProcess } from "electron"
import type { Details, UtilityProcess } from "electron"
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { ImBridgeConfig, ImBridgeState } from "../shared/imBridge"
import { writeLog } from "./logging"

const READY_TEXT = "OhMyOpenclaw started — channels active"
const STOP_TIMEOUT = 8_000
const LOG_LIMIT = 300
const SECRET_MASK = "••••••••"
const SECRET_CREDENTIAL_ID = "im-bridge.channels"

export class ImBridgeService {
  private child?: UtilityProcess
  private stateValue: ImBridgeState = { status: "stopped", logs: [] }
  private startPromise?: Promise<ImBridgeState>

  constructor(
    private readonly notify: (state: ImBridgeState) => void,
    private readonly credential: (serverId: string) => Promise<{ username: string; password: string } | undefined>,
    private readonly secretCredential: (id: string) => Promise<Record<string, string> | undefined>,
    private readonly saveSecretCredential: (id: string, credential: Record<string, string> | null) => Promise<void>,
  ) {}

  state() {
    return structuredClone(this.stateValue)
  }

  async config() {
    const config = await this.resolvedConfig()
    return applySecrets(config, Object.fromEntries(Object.entries(extractSecrets(config)).map(([key, value]) => [key, value ? SECRET_MASK : ""])))
  }

  async save(raw: unknown) {
    const config = normalizeConfig(raw)
    const existing = await this.secretCredential(SECRET_CREDENTIAL_ID) ?? {}
    const secrets = Object.fromEntries(Object.entries(extractSecrets(config)).flatMap(([key, value]) => {
      const next = value === SECRET_MASK ? existing[key] ?? "" : value
      return next ? [[key, next]] : []
    }))
    await this.saveSecretCredential(SECRET_CREDENTIAL_ID, Object.keys(secrets).length ? secrets : null)
    await mkdir(this.root(), { recursive: true, mode: 0o700 })
    await writeFile(this.configFile(), `${JSON.stringify(applySecrets(config, {}), null, 2)}\n`, { mode: 0o600 })
    await chmod(this.configFile(), 0o600)
    return applySecrets(config, Object.fromEntries(Object.keys(secrets).map(key => [key, SECRET_MASK])))
  }

  async autoStart(localServerUrl?: string) {
    const config = await this.resolvedConfig()
    if (!config.autoStart || this.child) return this.state()
    if (config.serverId === "local" && !localServerUrl) return this.state()
    return this.start(localServerUrl)
  }

  async start(localServerUrl?: string) {
    if (this.startPromise) return this.startPromise
    if (this.child) return this.state()
    this.startPromise = this.spawn(localServerUrl).finally(() => {
      this.startPromise = undefined
    })
    return this.startPromise
  }

  async stop() {
    const child = this.child
    if (!child) {
      this.update({ status: "stopped", logs: this.stateValue.logs })
      return this.state()
    }
    child.kill()
    await Promise.race([
      new Promise<void>((resolve) => child.once("exit", () => resolve())),
      new Promise<void>((resolve) => setTimeout(resolve, STOP_TIMEOUT)),
    ])
    if (this.child === child) this.child = undefined
    await unlink(this.runtimeConfigFile()).catch(() => undefined)
    this.update({ status: "stopped", logs: this.stateValue.logs })
    return this.state()
  }

  async restart(localServerUrl?: string) {
    await this.stop()
    return this.start(localServerUrl)
  }

  private async spawn(localServerUrl?: string) {
    const config = await this.resolvedConfig()
    validateConfig(config)
    const serverUrl = config.serverId === "local" ? localServerUrl : config.serverUrl
    if (!serverUrl) throw new Error("所选 OpenCode 服务器地址不可用")
    const credential = await this.credential(config.serverId)
    await this.writeRuntimeConfig(config)
    this.update({ status: "starting", logs: this.stateValue.logs })
    const child = utilityProcess.fork(join(dirname(fileURLToPath(import.meta.url)), "imBridgeSidecar.js"), [], {
      cwd: config.directory || app.getPath("home"),
      env: createEnv(config, serverUrl, this.runtimeConfigFile(), credential),
      serviceName: "opencodex im bridge",
      stdio: "pipe",
    })
    this.child = child
    this.update({ status: "starting", pid: child.pid, logs: this.stateValue.logs })

    const onProcessGone = (_event: unknown, details: Details) => {
      if (details.type !== "Utility" || details.name !== "opencodex im bridge") return
      writeLog("im-bridge", "utility process gone", details)
    }
    app.on("child-process-gone", onProcessGone)
    child.stdout?.on("data", (chunk: Buffer) => this.appendLog("stdout", chunk.toString("utf8")))
    child.stderr?.on("data", (chunk: Buffer) => this.appendLog("stderr", chunk.toString("utf8")))
    child.once("exit", (code) => {
      app.off("child-process-gone", onProcessGone)
      if (this.child !== child) return
      this.child = undefined
      void unlink(this.runtimeConfigFile()).catch(() => undefined)
      const stopped = this.stateValue.status === "stopped"
      this.update(stopped
        ? { status: "stopped", logs: this.stateValue.logs }
        : { status: "error", error: `IM bridge exited with code ${code}`, logs: this.stateValue.logs })
    })
    return this.state()
  }

  private appendLog(stream: "stdout" | "stderr", value: string) {
    const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return
    lines.forEach((line) => writeLog(`im-bridge:${stream}`, line))
    const logs = [...this.stateValue.logs, ...lines].slice(-LOG_LIMIT)
    if (value.includes(READY_TEXT)) {
      this.update({ status: "running", pid: this.child?.pid, startedAt: Date.now(), logs })
      return
    }
    this.update({ ...this.stateValue, logs })
  }

  private update(state: ImBridgeState) {
    this.stateValue = state
    this.notify(this.state())
  }

  private root() {
    return join(app.getPath("home"), ".opencodex", "im-bridge")
  }

  private configFile() {
    return join(this.root(), "config.json")
  }

  private runtimeConfigFile() {
    return join(this.root(), "runtime.json")
  }

  private async writeRuntimeConfig(config: ImBridgeConfig) {
    const enabled = <T extends { enabled: boolean }>(channel: T) => channel.enabled
      ? Object.fromEntries(Object.entries(channel).filter(([key]) => key !== "enabled"))
      : undefined
    const runtime = {
      feishu: enabled(config.feishu),
      qq: enabled(config.qq),
      telegram: enabled(config.telegram),
      discord: enabled(config.discord),
      wechat: enabled(config.wechat),
      dingtalk: enabled(config.dingtalk),
      defaultAgent: config.defaultAgent,
      defaultModel: config.defaultModel,
      dataDir: join(this.root(), "data"),
      launcher: { enabled: false },
      messageDebounceMs: config.messageDebounceMs,
    }
    await mkdir(this.root(), { recursive: true, mode: 0o700 })
    await writeFile(this.runtimeConfigFile(), `${JSON.stringify(runtime, null, 2)}\n`, { mode: 0o600 })
    await chmod(this.runtimeConfigFile(), 0o600)
  }

  private async resolvedConfig() {
    const stored = normalizeConfig(await readFile(this.configFile(), "utf8").then(JSON.parse, () => ({})))
    const legacy = extractSecrets(stored)
    const encrypted = await this.secretCredential(SECRET_CREDENTIAL_ID) ?? {}
    const secrets = { ...legacy, ...encrypted }
    if (Object.values(legacy).some(Boolean)) {
      await this.saveSecretCredential(SECRET_CREDENTIAL_ID, secrets)
      await mkdir(this.root(), { recursive: true, mode: 0o700 })
      await writeFile(this.configFile(), `${JSON.stringify(applySecrets(stored, {}), null, 2)}\n`, { mode: 0o600 })
      await chmod(this.configFile(), 0o600)
    }
    return applySecrets(stored, secrets)
  }
}

function createEnv(config: ImBridgeConfig, serverUrl: string, configPath: string, credential?: { username: string; password: string }) {
  return {
    ...Object.fromEntries(Object.entries(process.env).flatMap(([key, value]) => value === undefined ? [] : [[key, value]])),
    OPENCODE_IM_BRIDGE_EMBEDDED: "1",
    OPENCODE_IM_BRIDGE_CONFIG: configPath,
    OPENCODE_SERVER_URL: serverUrl,
    OPENCODE_SERVER_USERNAME: credential?.username ?? "",
    OPENCODE_SERVER_PASSWORD: credential?.password ?? "",
    OPENCODE_CWD: config.directory,
  }
}

function normalizeConfig(raw: unknown): ImBridgeConfig {
  const value = isRecord(raw) ? raw : {}
  const channel = (name: string) => isRecord(value[name]) ? value[name] : {}
  const text = (input: unknown, fallback = "") => typeof input === "string" ? input : fallback
  const enabled = (input: unknown) => input === true
  const list = (input: unknown) => Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : []
  return {
    autoStart: enabled(value.autoStart),
    serverId: text(value.serverId, "local"),
    serverUrl: text(value.serverUrl),
    directory: text(value.directory, app.getPath("home")),
    defaultAgent: text(value.defaultAgent, "build"),
    defaultModel: text(value.defaultModel),
    messageDebounceMs: Math.max(0, Number(value.messageDebounceMs) || 10_000),
    feishu: { enabled: enabled(channel("feishu").enabled), appId: text(channel("feishu").appId), appSecret: text(channel("feishu").appSecret), verificationToken: text(channel("feishu").verificationToken), webhookPort: Math.max(1, Number(channel("feishu").webhookPort) || 3001), encryptKey: text(channel("feishu").encryptKey) },
    qq: { enabled: enabled(channel("qq").enabled), appId: text(channel("qq").appId), secret: text(channel("qq").secret), sandbox: enabled(channel("qq").sandbox) },
    telegram: { enabled: enabled(channel("telegram").enabled), botToken: text(channel("telegram").botToken), allowedChatIds: list(channel("telegram").allowedChatIds) },
    discord: { enabled: enabled(channel("discord").enabled), botToken: text(channel("discord").botToken), allowedChannelIds: list(channel("discord").allowedChannelIds) },
    wechat: { enabled: enabled(channel("wechat").enabled), sessionFile: text(channel("wechat").sessionFile), baseUrl: text(channel("wechat").baseUrl, "https://ilinkai.weixin.qq.com"), token: text(channel("wechat").token) },
    dingtalk: { enabled: enabled(channel("dingtalk").enabled), appKey: text(channel("dingtalk").appKey), appSecret: text(channel("dingtalk").appSecret), agentId: text(channel("dingtalk").agentId), botName: text(channel("dingtalk").botName) },
  }
}

function validateConfig(config: ImBridgeConfig) {
  const valid = (config.feishu.enabled && config.feishu.appId && config.feishu.appSecret)
    || (config.qq.enabled && config.qq.appId && config.qq.secret)
    || (config.telegram.enabled && config.telegram.botToken)
    || (config.discord.enabled && config.discord.botToken)
    || config.wechat.enabled
    || (config.dingtalk.enabled && config.dingtalk.appKey && config.dingtalk.appSecret)
  if (!valid) throw new Error("请至少启用并完整配置一个 IM 机器人")
}

function extractSecrets(config: ImBridgeConfig) {
  return {
    "feishu.appSecret": config.feishu.appSecret,
    "feishu.verificationToken": config.feishu.verificationToken,
    "feishu.encryptKey": config.feishu.encryptKey,
    "qq.secret": config.qq.secret,
    "telegram.botToken": config.telegram.botToken,
    "discord.botToken": config.discord.botToken,
    "wechat.token": config.wechat.token,
    "dingtalk.appSecret": config.dingtalk.appSecret,
  }
}

function applySecrets(config: ImBridgeConfig, secrets: Record<string, string>): ImBridgeConfig {
  return {
    ...config,
    feishu: {
      ...config.feishu,
      appSecret: secrets["feishu.appSecret"] ?? "",
      verificationToken: secrets["feishu.verificationToken"] ?? "",
      encryptKey: secrets["feishu.encryptKey"] ?? "",
    },
    qq: { ...config.qq, secret: secrets["qq.secret"] ?? "" },
    telegram: { ...config.telegram, botToken: secrets["telegram.botToken"] ?? "" },
    discord: { ...config.discord, botToken: secrets["discord.botToken"] ?? "" },
    wechat: { ...config.wechat, token: secrets["wechat.token"] ?? "" },
    dingtalk: { ...config.dingtalk, appSecret: secrets["dingtalk.appSecret"] ?? "" },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
