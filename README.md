# inertia-hono-vue

Hono + Inertia.js + Vue (Vapor) を Cloudflare Workers 上で動かすサンプル。
[`yusukebe/hono-inertia-example`](https://github.com/yusukebe/hono-inertia-example) (React 版) を Vue + Vapor 用に書き直し、`@hono/inertia` 採用と型の自動同期を加えた構成。

## スタック

| レイヤ | 採用 |
| --- | --- |
| サーバ | Hono on Cloudflare Workers |
| Inertia アダプタ | [`@hono/inertia`](https://www.npmjs.com/package/@hono/inertia) |
| クライアント | Vue 3.6 beta + Vapor (`@inertiajs/vue3`) |
| ビルド | Vite 8 + `@cloudflare/vite-plugin` + `vite-ssr-components` |
| 型生成 | ts-morph 自作 Vite plugin |

```
app/
  server.ts          Hono ルート ─ source of truth
  root-view.tsx      Document シェル + rootView (Hono JSX)
  pages/             Vue Vapor SFC
  pages.gen.ts       AUTO ─ PageMap + @hono/inertia 用 augment
  types.ts           共有ドメイン型
src/
  client.ts          createInertiaApp + vaporInteropPlugin
  vite-plugin.ts     ts-morph で c.render(...) を解析
  style.css
vite.config.ts       vue() + inertiaPagesPlugin() + cloudflare() + ssrPlugin()
wrangler.jsonc       worker entry: app/server.ts
```

## リクエストフロー

`c.render('Home', { message })` を `@hono/inertia` middleware が Inertia プロトコルで返り分け:

| リクエスト | レスポンス |
| --- | --- |
| 通常 GET | `rootView()` の HTML シェル + 埋め込み JSON |
| `X-Inertia: true` | page object JSON (SPA ナビゲーション) |
| `Accept: application/json` | props のみ JSON |
| `X-Inertia-Version` 不一致 | 409 + `X-Inertia-Location` (フルリロード誘導) |

ブラウザは `/src/client.ts` を読み込んで Vue (Vapor) を `<div id="app">` に mount する。

## 自作している部分は 2 つだけ

### `app/root-view.tsx` — Document シェル

`@hono/inertia` の `defaultRootView` は client bundle / CSS をロードしないので独自に定義。Hono JSX + `vite-ssr-components/hono` の `<ViteClient>` / `<Script>` で dev/prod のアセット URL 解決を委譲する。CSS は `src/client.ts` 側で `import './style.css'` しているので link タグ不要。

### `src/vite-plugin.ts` — `c.render` 解析で `PageMap` 生成

公式の `@hono/inertia/vite` plugin は **ファイル名 → `PageName` union** + `infer` ベースの `PageProps<C>` を提供する。**Vue SFC コンパイラの型 resolver は `infer` を解決できない**ため、`defineProps<PageProps<'Home'>>()` は `Unresolvable type` エラーで通らない。

代替として ts-morph で `app/server.ts` を AST 解析し、`c.render(name, props)` ごとに **flat な interface** を生成する:

```ts
// app/pages.gen.ts (auto)
import type app from './server'
import type { Post } from './types'

export interface PageMap {
  'Home': { message: string }
  'Posts/Show': { post: Post }
  ...
}

declare module '@hono/inertia' {
  interface AppRegistry { app: typeof app }
  interface InertiaPages { 'Home': PageMap['Home']; ... }
}
```

ページ側はジェネリック越しではなく **literal index access** で読む(SFC resolver はこの形なら処理できる):

```vue
<script setup lang="ts" vapor>
import type { PageMap } from '../pages.gen'
defineProps<PageMap['Home']>()
</script>
```

dev 中は `app/server.ts` の保存ごとに再生成。サーバの prop 形と template の参照のズレは vue-tsc が即検出する。

## 設計メモ

- **Vapor は SFC のみ**: Vue 3.6 beta 時点で JSX → Vapor の変換パスが存在しない (`@vue/babel-plugin-jsx` / `@vue/compiler-vapor` どちらも非対応)。`<script setup vapor>` 一択。
- **`vaporInteropPlugin`**: `@inertiajs/vue3` の `<App>` は VDOM 実装。VDOM ルートで Vapor 子コンポーネントを描画するための互換層を `client.ts` で `app.use` する。
- **pnpm overrides**: `'vue': 'beta'` のような dist-tag は pnpm overrides で解決されないので、`pnpm-workspace.yaml` に明示版 `'^3.6.0-beta.10'` を書いている。
- **prod build の既知問題**: `vite-ssr-components@0.5.2` × Vite 8 の SSR 環境契約不整合で `pnpm build` が SSR フェーズで失敗する (dev は問題なし)。

## コマンド

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm type-check   # vue-tsc --build
```
