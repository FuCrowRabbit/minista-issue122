import type { Plugin, ViteDevServer } from "vite"
import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  createServer as createViteServer,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"
import { parse as parseHtml } from "node-html-parser"

import type { InlineConfig, ResolvedConfig } from "../config/index.js"
import type { GetSources } from "../server/sources.js"
import type { SsgPage } from "../server/ssg.js"
import type { CreateImages } from "../generate/image.js"
import type { CreateSprites } from "../generate/sprite.js"
import { resolveConfig } from "../config/index.js"
import { pluginReact } from "../plugins/react.js"
import { pluginPreact } from "../plugins/preact.js"
import { pluginMdx } from "../plugins/mdx.js"
import { pluginImage } from "../plugins/image.js"
import { pluginSvgr } from "../plugins/svgr.js"
import { pluginIcon } from "../plugins/icon.js"
import { pluginFetch } from "../plugins/fetch.js"
import { pluginPartial } from "../plugins/partial.js"
import { pluginSearch } from "../plugins/search.js"
import { transformPage } from "../transform/page.js"
import { transformPages } from "../transform/pages.js"
import { transformEntryTags } from "../transform/tags.js"
import { transformComment } from "../transform/comment.js"
import { transformRemotes } from "../transform/remote.js"
import { transformImages } from "../transform/image.js"
import { transformIcons } from "../transform/icon.js"
import { transformEncode } from "../transform/encode.js"
import { transformSearch } from "../transform/search.js"
import { transformDelivery } from "../transform/delivery.js"
import { resolveBase } from "../utility/base.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function develop(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      plugins: [
        pluginDevelop(config),
        pluginReact(),
        pluginPreact(config),
        pluginMdx(config),
        pluginImage(config),
        pluginSvgr(config),
        pluginIcon(config),
        pluginFetch(config),
        pluginPartial(config),
        pluginSearch(config),
      ],
    })
  )
  const viteServer = await createViteServer(mergedViteConfig)

  await viteServer.listen()
  viteServer.printUrls()
}

function pluginDevelop(config: ResolvedConfig): Plugin {
  const virtualModuleId = "virtual:minista-plugin-develop"
  const resolvedVirtualModuleId = "\0" + virtualModuleId

  let server: ViteDevServer

  let useVirtualModule: boolean = false
  let ssgPages: SsgPage[] = []

  let createSprites: CreateSprites = {}

  return {
    name: "minista-vite-plugin:develop",
    resolveId(id) {
      if (id === virtualModuleId) {
        useVirtualModule = true
        return resolvedVirtualModuleId
      }
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        const { moduleGraph } = server
        const module = moduleGraph.getModuleById(resolvedVirtualModuleId)!
        moduleGraph.invalidateModule(module)

        const searchObj = await transformSearch({ ssgPages, config })

        return `export const searchObj = ${JSON.stringify(searchObj)}`
      }
    },
    configureServer(_server) {
      server = _server

      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            const resolvedBase = resolveBase(config.main.base)

            let originalUrl = req.originalUrl || ""
            let url = originalUrl

            if (resolvedBase.match(/^\/.*\/$/)) {
              const reg = new RegExp(`^${resolvedBase}`)
              url = url.replace(reg, "/")
            }

            const { getSources } = (await server.ssrLoadModule(
              __dirname + "/../server/sources.js"
            )) as { getSources: GetSources }
            const { resolvedGlobal, resolvedPages } = await getSources()

            const { headTags, startTags, endTags } = transformEntryTags({
              command: "serve",
              pathname: url,
              config,
            })

            let html = transformPage({
              url,
              resolvedGlobal,
              resolvedPages,
              headTags,
              startTags,
              endTags,
            })

            let parsedHtml = parseHtml(html, { comment: true }) as NHTMLElement

            const targetAttr = "data-minista-transform-target"

            if (parsedHtml.querySelector(`[${targetAttr}="comment"]`)) {
              parsedHtml = transformComment(parsedHtml)
            }
            await transformRemotes({
              command: "serve",
              parsedData: parsedHtml,
              config,
            })
            await transformImages({
              command: "serve",
              parsedData: parsedHtml,
              config,
            })

            if (parsedHtml.querySelector(`[${targetAttr}="icon"]`)) {
              parsedHtml = await transformIcons({
                command: "serve",
                parsedHtml,
                config,
                createSprites,
                server,
              })
            }

            html = parsedHtml.toString()

            if (
              useVirtualModule ||
              parsedHtml.querySelector(`[${targetAttr}="delivery-list"]`)
            ) {
              ssgPages = await transformPages({
                resolvedGlobal,
                resolvedPages,
                config,
              })
            }

            if (parsedHtml.querySelector(`[${targetAttr}="delivery-list"]`)) {
              html = transformDelivery({ html, ssgPages, config })
            }

            html = await server.transformIndexHtml(originalUrl, html)

            const charsets = html.match(
              /<meta[^<>]*?charset=["|'](.*?)["|'].*?\/>/i
            )
            const charset = charsets ? charsets[1] : "UTF-8"

            if (charset.match(/^utf[\s-_]*8$/i)) {
              res.statusCode = 200
              res.end(html)
            } else {
              res.statusCode = 200
              res.end(transformEncode(html, charset))
            }
          } catch (e: any) {
            server.ssrFixStacktrace(e)
            next(e)
          }
        })
      }
    },
  }
}
