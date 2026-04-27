import type { ExtractSchema } from 'hono/types'

export interface AppRegistry {}

type RegisteredApp = AppRegistry extends { app: infer A } ? A : never

type Distribute<T> = T extends infer U ? U : never

type AllOutputs<App> = Distribute<
  {
    [Path in keyof ExtractSchema<App> & string]: {
      [Method in keyof ExtractSchema<App>[Path] & string]: ExtractSchema<App>[Path][Method] extends {
        output: infer O
      }
        ? Distribute<O>
        : never
    }[keyof ExtractSchema<App>[Path] & string]
  }[keyof ExtractSchema<App> & string]
>

type RenderOutput<App> = AllOutputs<App> extends infer U
  ? U extends { component: string; props: unknown }
    ? U
    : never
  : never

export type PageProps<
  C extends RenderOutput<RegisteredApp>['component'] = RenderOutput<RegisteredApp>['component']
> = Extract<RenderOutput<RegisteredApp>, { component: C }>['props']
