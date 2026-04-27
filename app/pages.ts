export type Post = {
  id: number
  title: string
  body: string
}

export interface PageMap {
  Home: { message: string }
  About: { title: string }
  'Posts/Index': { posts: Post[] }
  'Posts/New': { errors?: Record<string, string> }
  'Posts/Show': { post: Post }
}

export type PageName = keyof PageMap
export type PageProps<C extends PageName> = PageMap[C]
