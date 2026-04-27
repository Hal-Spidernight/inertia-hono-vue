<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import type { PageMap } from '../pages'
import Layout from './Layout.vue'

defineProps<PageMap['About']>()
</script>

<template>
  <Layout>
    <Head title="About" />
    <h1>{{ title }}</h1>
    <p>Hono + Inertia.js + Vue on Cloudflare Workers.</p>
  </Layout>
</template>
