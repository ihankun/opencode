import { setDefaultCACertificates, getCACertificates } from "node:tls";
const parentPort = requireParentPort();
let listener;
parentPort.on("message", (event) => {
  const command = parseCommand(event.data);
  if (!command) return;
  if (command.type === "stop") {
    void stop();
    return;
  }
  void start(command);
});
async function start(command) {
  try {
    prepareEnv(command);
    useSystemCertificates();
    const { Server } = await import("./chunks/node-Dc_W7plh.js");
    listener = await Server.listen({
      hostname: command.hostname,
      port: command.port,
      username: "opencode",
      password: command.password,
      cors: command.cors
    });
    parentPort.postMessage({ type: "ready", url: listener.url.toString() });
  } catch (error) {
    parentPort.postMessage({ type: "error", error: serializeError(error) });
    setImmediate(() => process.exit(1));
  }
}
async function stop() {
  try {
    await listener?.stop(true);
  } finally {
    listener = void 0;
    parentPort.postMessage({ type: "stopped" });
    setImmediate(() => process.exit(0));
  }
}
function prepareEnv(command) {
  Object.assign(process.env, {
    OPENCODE_CLIENT: "custom-electron",
    OPENCODE_DISABLE_EMBEDDED_WEB_UI: "true",
    OPENCODE_EXPERIMENTAL_FILEWATCHER: "true",
    OPENCODE_SERVER_USERNAME: "opencode",
    OPENCODE_SERVER_PASSWORD: command.password,
    XDG_STATE_HOME: process.env.XDG_STATE_HOME ?? command.userDataPath
  });
}
function useSystemCertificates() {
  try {
    setDefaultCACertificates([.../* @__PURE__ */ new Set([...getCACertificates("default"), ...getCACertificates("system")])]);
  } catch (error) {
    console.warn("failed to load system certificates", error);
  }
}
function parseCommand(value) {
  if (!value || typeof value !== "object") return;
  const command = value;
  if (command.type === "stop") return { type: "stop" };
  if (command.type !== "start") return;
  if (typeof command.hostname !== "string") return;
  if (typeof command.port !== "number") return;
  if (typeof command.password !== "string") return;
  if (typeof command.userDataPath !== "string") return;
  if (!Array.isArray(command.cors) || !command.cors.every((item) => typeof item === "string")) return;
  return {
    type: "start",
    hostname: command.hostname,
    port: command.port,
    password: command.password,
    userDataPath: command.userDataPath,
    cors: command.cors
  };
}
function serializeError(error) {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  return { message: String(error) };
}
function requireParentPort() {
  const port = process.parentPort;
  if (!port) throw new Error("Sidecar parent port unavailable");
  return port;
}
