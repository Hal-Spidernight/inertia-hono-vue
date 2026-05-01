import { type PageObject, type RootView, serializePage } from '@hono/inertia'
import { Script, ViteClient } from 'vite-ssr-components/hono'

const Document = ({ page }: { page: PageObject }) => (
  <html>
    <head>
      <meta charset='utf-8' />
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <ViteClient />
      <Script src='/src/client.ts' />
    </head>
    <body>
      <script
        data-page='app'
        type='application/json'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: serialized page payload
        dangerouslySetInnerHTML={{ __html: serializePage(page) }}
      />
      <div id='app' />
    </body>
  </html>
)

export const rootView: RootView = (page) =>
  '<!DOCTYPE html>' + Document({ page }).toString()
