import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { renderer } from '../src/renderer'
import type { Post } from './pages'

const posts: Post[] = [
  { id: 1, title: 'Hello, Hono', body: 'Hono is a small, fast web framework.' },
  { id: 2, title: 'Inertia on the Edge', body: 'SPA feel without the API boilerplate.' },
]
let nextId = 3

const required = (message: string) =>
  z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string().trim().min(1, message))

const postSchema = z.object({
  title: required('Title is required'),
  body: required('Body is required'),
})

const app = new Hono()

app.use(renderer())

const routes = app
  .get('/', (c) => c.render('Home', { message: 'Hono x Inertia x Vue' }))
  .get('/about', (c) => c.render('About', { title: 'About' }))
  .get('/posts', (c) => c.render('Posts/Index', { posts }))
  .get('/posts/new', (c) => c.render('Posts/New'))
  .post(
    '/posts',
    zValidator('json', postSchema, (result, c) => {
      if (result.success) {
        return
      }
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !errors[key]) errors[key] = issue.message
      }
      c.status(422)
      return c.render('Posts/New', { errors })
    }),
    (c) => {
      const { title, body } = c.req.valid('json')
      const post = { id: nextId++, title, body }
      posts.push(post)
      return c.redirect(`/posts/${post.id}`, 303)
    }
  )
  .get('/posts/:id', (c) => {
    const id = Number(c.req.param('id'))
    const post = posts.find((p) => p.id === id)
    if (!post) {
      return c.notFound()
    }
    return c.render('Posts/Show', { post })
  })

export default routes
