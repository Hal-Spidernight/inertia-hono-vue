<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import type { PageProps } from '../../pages.gen'
import Layout from '../Layout.vue'

defineProps<PageProps<'Posts/Index'>>()
</script>

<template>
  <Layout>
    <Head title="Posts" />
    <h1>Posts</h1>
    <p>
      <Link href="/posts/new">+ New post</Link>
    </p>
    <ul>
      <li v-for="post in posts" :key="post.id">
        <Link :href="`/posts/${post.id}`">{{ post.title }}</Link>
      </li>
    </ul>
  </Layout>
</template>
