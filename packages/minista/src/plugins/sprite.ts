import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"
import fg from "fast-glob"

import type { ResolvedConfig } from "../config/index.js"
import { transformSprite } from "../transform/sprite.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginSprite(
  config: ResolvedConfig,
  useInit?: boolean
): Plugin {
  let command: "build" | "serve"
  let activeSprite = false

  const srcDir = path.join(
    config.sub.resolvedRoot,
    config.main.assets.icons.srcDir
  )
  const output = path.join(config.sub.tempDir, "__minista_plugin_sprite.svg")
  const options = config.main.assets.icons.svgstoreOptions

  async function buildSprite() {
    const svgFiles = await fg(srcDir + "**/*.svg")

    if (svgFiles.length > 0) {
      const data = transformSprite({
        svgFiles,
        options,
      })
      return await fs.outputFile(output, data).catch((err) => {
        console.error(err)
      })
    }
  }

  return {
    name: "minista-vite-plugin:sprite",
    enforce: "pre",
    config(_, viteConfig) {
      command = viteConfig.command
      activeSprite = config.main.assets.icons.useSprite && fs.existsSync(srcDir)

      if (activeSprite) {
        return {
          resolve: {
            alias: [
              {
                find: "/@minista-temp/__minista_plugin_sprite.svg",
                replacement: output,
              },
            ],
          },
        }
      }
    },
    async buildStart() {
      if (useInit) {
        await fs.remove(output)
        activeSprite && (await buildSprite())
      }
    },
    async configureServer(server) {
      if (!activeSprite) {
        return
      }
      const watcher = server.watcher.add(srcDir)

      watcher.on("all", async function (eventName, path) {
        const triggers = ["add", "change", "unlink"]

        if (triggers.includes(eventName) && path.includes(srcDir)) {
          await buildSprite()
        }
      })
    },
    transform(code, id) {
      if (
        command === "build" &&
        activeSprite &&
        id.match(path.join(__dirname, "../shared/icon.js"))
      ) {
        const addImport = `import tempSpriteUrl from "/@minista-temp/__minista_plugin_sprite.svg";\n`
        const replacedCode = code.replace(
          `"/@minista-temp/__minista_plugin_sprite.svg#"`,
          `tempSpriteUrl + "#"`
        )
        return {
          code: addImport + replacedCode,
          map: null,
        }
      }
    },
  }
}
