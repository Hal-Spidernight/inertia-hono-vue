# inertia-hono-vue

Hono + Inertia.js + Vue (Vapor) を Cloudflare Workers 上で動かす構成。
[`yusukebe/hono-inertia-example`](https://github.com/yusukebe/hono-inertia-example) (React 版) を参考に Vue へ移植 + Vapor 対応 + 型自動化を加えた。

## 構成

| レイヤ | 採用 |
| --- | --- |
| サーバ | Hono (Cloudflare Workers) |
| ルーティング | サーバ駆動 (Inertia プロトコル) |
| クライアント | Vue 3.6 beta + Vapor mode |
| ページ橋渡し | Inertia.js (`@inertiajs/vue3`) |
| ビルド | Vite 8 + `@cloudflare/vite-plugin` |
| 型抽出 | ts-morph (自作 Vite plugin) |

```
app/
  server.ts          Hono ルート (source of truth)
  types.ts           共有ドメイン型
  pages.gen.ts       AUTO-GENERATED — PageMap
  pages/
    Layout.vue
    Home.vue / About.vue / Posts/{Index,New,Show}.vue
src/
  client.ts          Vue + Inertia + vaporInteropPlugin
  renderer.tsx       Hono JSX で Document シェル + Inertia middleware
  vite-plugin.ts     ts-morph で PageMap 自動生成
  style.css
vite.config.ts       vue() + inertiaPagesPlugin() + cloudflare() + ssrPlugin()
wrangler.jsonc       CF Workers entry: app/server.ts
```

リクエストの流れ:

1. ブラウザが `/posts` を GET
2. Hono の `c.render('Posts/Index', { posts })` が走る
3. `renderer` middleware が `X-Inertia` ヘッダの有無で分岐
   - 無 (初回ロード) → HTML シェルに `<script type="application/json" data-page>` で page object を埋め込み返す
   - 有 (SPA ナビゲーション) → page object を JSON で返す
4. クライアントは `<div id="app">` に Vue (Vapor) ページを mount

## 独自実装

参考リポジトリにも対応物はあるが、Vue + Vapor の都合で手を入れた箇所をまとめる。

### 1. `src/renderer.tsx` — Inertia 用 Hono middleware

- `c.setRenderer()` を上書きし、`c.render(component, props)` の挙動を Inertia プロトコルに合わせる
- `X-Inertia` ヘッダで HTML / JSON を切り替え
- Hono の `ContextRenderer` 型を `PageMap` (生成物) で augment し、`c.render` のコンポーネント名 / props 型を静的検査
- 引数省略形 (`c.render('Posts/New')`) と props あり形を、`{} extends PageMap[C]` で判定する可変長 overload で表現
- Document シェルは Hono JSX (`hono/jsx` runtime)。`vite-ssr-components/hono` の `<ViteClient>` / `<Script>` / `<Link>` で dev / prod のアセット解決を任せる
- React は使っていない (`hono/jsx` は Hono 独自の JSX runtime)

### 2. `src/vite-plugin.ts` — `inertiaPagesPlugin`

`app/pages.gen.ts` を生成する Vite plugin。ts-morph で `app/server.ts` を AST 解析し、すべての `c.render(name, props)` 呼び出しから flat な `PageMap` を吐き出す。

- 第1引数 (string literal) → PageMap キー
- 第2引数 → TypeScript の型解決を通して props 型を抽出
- 同じ component に複数ルートが当たる場合 (例: `Posts/New` の引数省略版とエラー時) は union を生成
- 外部モジュールから import された型 (`Post` など) は `import("...").T` 形式で出力 → import 文を再構築 + 型は bare 名に書き換え
- `buildStart` で初回生成、dev 中は `app/server.ts` の変更を watch して再生成

**なぜ必要か**: Vue SFC コンパイラ (`@vue/compiler-sfc`) の `defineProps<T>()` 型解決器は `infer` キーワードや複雑な conditional type をサポートしないため、Hono の `ExtractSchema` / `InferResponseType` を直接 SFC で使うと "Unresolvable type" エラーになる。
ts-morph で **flat な interface に展開してから書き出す** ことで SFC resolver でも処理可能になり、サーバ↔ページ間の型同期が完全自動化される。

### 3. `src/client.ts` — Vapor / VDOM interop

- `createInertiaApp` の `setup` で `createApp` (VDOM) を作る
- Inertia の `<App>` 自体は VDOM ベースなので top-level は VDOM のまま
- `vaporInteropPlugin` (from `@vue/runtime-vapor`) を `app.use` で登録 → 子の Vapor SFC が VDOM ツリーの中で正常に描画される
- 各ページは `<script setup lang="ts" vapor>` で Vapor コンパイル(出力に `defineVaporComponent` / `createComponent` / `template` 等のみが現れる)

### 4. `app/pages.gen.ts` の使い方

```vue
<script setup lang="ts" vapor>
import type { PageMap } from '../pages.gen'

defineProps<PageMap['Home']>()
</script>
```

ジェネリック越し (`PageProps<C>`) ではなく **literal index access** (`PageMap['Home']`) で書く。SFC resolver が型エイリアス越しのジェネリック置換を完全には扱えないため。

## 設計上の制約

- **Vapor + JSX/TSX は現時点で組み合わせ不可**: Vue 3.6 beta 時点で `@vue/babel-plugin-jsx` も `@vue/compiler-vapor` も JSX → Vapor の変換パスを持たない。Vapor を使うなら SFC + `<script setup vapor>` 一択
- **pnpm overrides**: `'vue': 'beta'` のような dist-tag は pnpm の overrides で解決されないため、`pnpm-workspace.yaml` では `'^3.6.0-beta.10'` のように明示バージョンを指定している
- **`pages.gen.ts` の bootstrap**: 初回 clone 時の TS チェックを通すため、空の interface を持った最小ファイルとしてリポジトリに commit している(plugin が dev/build 時に上書き再生成する)

## 開発 / ビルド

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm type-check   # vue-tsc --build
pnpm build        # Cloudflare Workers 向けビルド
pnpm deploy       # build + wrangler deploy
```

## 型自動同期の動作確認

`app/server.ts` のルート prop を編集すると、`app/pages.gen.ts` が即時再生成される。
SFC 側の `defineProps<PageMap['X']>()` は新しい型を読むので、prop の不一致は dev 中の型チェックで検出できる。
