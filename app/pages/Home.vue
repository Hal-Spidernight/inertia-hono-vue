<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import type { PageMap } from '../pages'
import Layout from './Layout.vue'

defineProps<PageMap['Home']>()
</script>

<template>
  <Layout>
    <Head title="Home" />
    <h1>{{ message }}</h1>
    <p>Try the Posts page to see forms and dynamic routes.</p>
  </Layout>
</template>
