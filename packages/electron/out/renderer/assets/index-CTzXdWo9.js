import { be as invoke } from "./main-CxRsPsI8.js";
async function openUrl(url, openWith) {
  await invoke("plugin:opener|open_url", {
    url,
    with: openWith
  });
}
async function openPath(path, openWith) {
  await invoke("plugin:opener|open_path", {
    path,
    with: openWith
  });
}
async function revealItemInDir(path) {
  const paths = typeof path === "string" ? [path] : path;
  return invoke("plugin:opener|reveal_item_in_dir", { paths });
}
export {
  openPath,
  openUrl,
  revealItemInDir
};
