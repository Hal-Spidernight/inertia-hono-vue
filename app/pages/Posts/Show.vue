<script setup lang="ts" vapor>
import { Head, Link } from '@inertiajs/vue3'
import type { PageMap } from '../../pages'
import Layout from '../Layout.vue'

defineProps<PageMap['Posts/Show']>()
</script>

<template>
  <Layout>
    <Head :title="post.title" />
    <article>
      <h1>{{ post.title }}</h1>
      <p>{{ post.body }}</p>
    </article>
    <p>
      <Link href="/posts">← Back to posts</Link>
    </p>
  </Layout>
</template>
