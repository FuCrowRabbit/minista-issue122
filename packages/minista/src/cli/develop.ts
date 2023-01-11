import type { PluginOption } from "vite"
import {
  createServer as createViteServer,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"
import { default as pluginReact } from "@vitejs/plugin-react"
import { default as pluginMdx } from "@mdx-js/rollup"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { pluginPreact } from "../plugins/preact.js"
import { pluginImage } from "../plugins/image.js"
import { pluginSvgr } from "../plugins/svgr.js"
import { pluginIcon } from "../plugins/icon.js"
import { pluginFetch } from "../plugins/fetch.js"
import { pluginServe } from "../plugins/serve.js"
import { pluginPartial } from "../plugins/partial.js"
import { pluginSearch } from "../plugins/search.js"

export async function develop(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      plugins: [
        pluginReact(),
        pluginPreact(config),
        pluginMdx(config.mdx) as PluginOption,
        pluginImage(config),
        pluginSvgr(config),
        pluginIcon(config),
        pluginFetch(config),
        pluginServe(config),
        pluginPartial(config),
        pluginSearch(config),
      ],
    })
  )
  const viteServer = await createViteServer(mergedViteConfig)

  await viteServer.listen()
  viteServer.printUrls()
}
