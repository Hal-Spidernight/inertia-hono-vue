import { createInertiaApp } from '@inertiajs/vue3'
import { vaporInteropPlugin } from '@vue/runtime-vapor'
import type { DefineComponent } from 'vue'
import { createApp, h } from 'vue'
import './style.css'

createInertiaApp({
  resolve: async (name) => {
    const pages = import.meta.glob<{ default: DefineComponent }>('../app/pages/**/*.vue')
    const loader = pages[`../app/pages/${name}.vue`]
    if (!loader) {
      throw new Error(`Page not found: ${name}`)
    }
    const page = await loader()
    return page.default
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .use(vaporInteropPlugin)
      .mount(el)
  },
})
