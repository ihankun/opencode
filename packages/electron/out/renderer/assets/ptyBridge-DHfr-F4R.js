const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./main-CxRsPsI8.js","./main-DuqtzUZU.css"])))=>i.map(i=>d[i]);
import { ai as __vitePreload, aX as getPtyConnectUrl, aJ as getAuthHeader } from "./main-CxRsPsI8.js";
async function connectTauriPty({
  ptyId,
  directory,
  cursor,
  onConnected,
  onMessage,
  onDisconnected,
  onError
}) {
  const { invoke, Channel } = await __vitePreload(async () => {
    const { invoke: invoke2, Channel: Channel2 } = await import("./main-CxRsPsI8.js").then((n) => n.aq);
    return { invoke: invoke2, Channel: Channel2 };
  }, true ? __vite__mapDeps([0,1]) : void 0, import.meta.url);
  const url = getPtyConnectUrl(ptyId, directory, { includeAuthInUrl: false, cursor });
  const authHeader = getAuthHeader()["Authorization"] || null;
  const onEvent = new Channel();
  let closed = false;
  onEvent.onmessage = (msg) => {
    if (closed) return;
    switch (msg.event) {
      case "connected":
        onConnected();
        break;
      case "data":
        if (msg.data?.data) {
          onMessage(msg.data.data);
        }
        break;
      case "disconnected":
        closed = true;
        onDisconnected({ code: msg.data?.code, reason: msg.data?.reason });
        break;
      case "error":
        onError(msg.data?.message || "Unknown bridge error");
        break;
    }
  };
  void invoke("bridge_connect", {
    args: { bridgeId: ptyId, url, authHeader },
    onEvent
  }).catch((error) => {
    if (closed) return;
    closed = true;
    const message = error instanceof Error ? error.message : String(error);
    onDisconnected({ reason: message });
  });
  return {
    send(data) {
      if (closed) return;
      void invoke("bridge_send", { args: { bridgeId: ptyId, data } }).catch((error) => {
        if (closed) return;
        const message = error instanceof Error ? error.message : String(error);
        onError(message);
      });
    },
    close() {
      if (closed) return;
      closed = true;
      void invoke("bridge_disconnect", { args: { bridgeId: ptyId } }).catch(() => {
      });
    }
  };
}
export {
  connectTauriPty
};
