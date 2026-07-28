type RendererSettingsApi = Pick<
  Window["customOpenCode"],
  "rendererSettings" | "updateRendererSettings"
>

export async function initializeRendererSettingsPersistence() {
  if (!window.customOpenCode?.rendererSettings || !window.customOpenCode?.updateRendererSettings) return
  const settings = await window.customOpenCode.rendererSettings()
  Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => key !== null && !Object.hasOwn(settings, key))
    .forEach(key => localStorage.removeItem(key))
  Object.entries(settings)
    .filter(([key, value]) => localStorage.getItem(key) !== value)
    .forEach(([key, value]) => localStorage.setItem(key, value))
  observeRendererSettings(localStorage, window.customOpenCode)
}

export function snapshotRendererSettings(storage: Storage) {
  return Object.fromEntries(
    Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key !== null)
      .map(key => [key, storage.getItem(key) ?? ""]),
  )
}

function observeRendererSettings(storage: Storage, api: RendererSettingsApi) {
  const setItem = Storage.prototype.setItem
  const removeItem = Storage.prototype.removeItem
  const clear = Storage.prototype.clear
  let timer: ReturnType<typeof setTimeout> | undefined
  let writes = Promise.resolve()

  const flush = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    const settings = snapshotRendererSettings(storage)
    writes = writes
      .then(() => api.updateRendererSettings(settings))
      .then(() => undefined)
      .catch(error => console.error("Failed to persist renderer settings", error))
  }
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, 100)
  }

  Storage.prototype.setItem = function (key, value) {
    setItem.call(this, key, value)
    if (this === storage) schedule()
  }
  Storage.prototype.removeItem = function (key) {
    removeItem.call(this, key)
    if (this === storage) schedule()
  }
  Storage.prototype.clear = function () {
    clear.call(this)
    if (this === storage) schedule()
  }

  window.addEventListener("storage", schedule)
  window.addEventListener("pagehide", flush)
}
