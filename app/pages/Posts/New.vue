<script setup lang="ts" vapor>
import { Head, useForm } from '@inertiajs/vue3'
import Layout from '../Layout.vue'

const form = useForm({
  title: '',
  body: '',
})

const submit = () => {
  form.post('/posts')
}
</script>

<template>
  <Layout>
    <Head title="New Post" />
    <h1>New Post</h1>
    <form class="stack" @submit.prevent="submit">
      <label>
        <span>Title</span>
        <input v-model="form.title" type="text" />
        <small v-if="form.errors.title" class="error">{{ form.errors.title }}</small>
      </label>
      <label>
        <span>Body</span>
        <textarea v-model="form.body" rows="4" />
        <small v-if="form.errors.body" class="error">{{ form.errors.body }}</small>
      </label>
      <button type="submit" :disabled="form.processing">
        {{ form.processing ? 'Creating…' : 'Create' }}
      </button>
    </form>
  </Layout>
</template>
