import { $ } from "bun"

await $`cd ../opencode && OPENCODE_CHANNEL=opencodex bun script/build-node.ts`
