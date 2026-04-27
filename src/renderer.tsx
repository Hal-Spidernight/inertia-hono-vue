import type { MiddlewareHandler, TypedResponse } from 'hono'
import { Link, Script, ViteClient } from 'vite-ssr-components/hono'
import type { PageMap, PageName } from '../app/pages'

type PageObject = {
  component: string
  props: Record<string, unknown>
  url: string
  version: string | null
}

type RenderArgs<C extends PageName> = {} extends PageMap[C]
  ? [component: C, props?: PageMap[C]]
  : [component: C, props: PageMap[C]]

declare module 'hono' {
  interface ContextRenderer {
    <C extends PageName>(
      ...args: RenderArgs<C>
    ): Response & TypedResponse<{ component: C; props: PageMap[C] }, 200, 'html'>
  }
  interface NotFoundResponse extends Response, TypedResponse<string, 404, 'text'> {}
}

const serializePage = (page: PageObject) => JSON.stringify(page).replace(/</g, '\\u003c')

const Document = ({ page }: { page: PageObject }) => (
  <html>
    <head>
      <ViteClient />
      <Script src='/src/client.ts' />
      <Link href='/src/style.css' rel='stylesheet' />
    </head>
    <body>
      <script
        type='application/json'
        data-page='app'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: serialized page payload
        dangerouslySetInnerHTML={{ __html: serializePage(page) }}
      />
      <div id='app' />
    </body>
  </html>
)

export const renderer = (options: { version?: string | null } = {}): MiddlewareHandler => {
  return async (c, next) => {
    c.setRenderer(((component: string, props: Record<string, unknown> = {}) => {
      const url = new URL(c.req.url)
      const page: PageObject = {
        component,
        props,
        url: url.pathname + url.search,
        version: options.version ?? null,
      }

      if (c.req.header('X-Inertia')) {
        c.header('X-Inertia', 'true')
        c.header('Vary', 'X-Inertia')
        return c.json(page)
      }

      return c.html(<Document page={page} />)
    }) as Parameters<typeof c.setRenderer>[0])
    await next()
  }
}
