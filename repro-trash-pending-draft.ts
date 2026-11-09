// Trashing a published post that has a pending draft replaces the live content with the draft and sets it to draft.
// Uses the same request the admin UI sends to trash a document: PATCH { deletedAt }.
import { getPayload } from 'payload'
import config from './payload.config.ts'

const payload = await getPayload({ config })

const show = async (label: string, id: number | string) => {
  const main: any = await payload.findByID({ collection: 'posts', id, trash: true })
  const draft: any = await payload.findByID({ collection: 'posts', id, trash: true, draft: true })
  console.log(`${label.padEnd(24)} main: "${main.title}" (${main._status})   latest version: "${draft.title}" (${draft._status})   trashed: ${Boolean(main.deletedAt)}`)
}

const post: any = await payload.create({ collection: 'posts', data: { title: 'published-v1', _status: 'published' } })
await show('published', post.id)

await payload.update({ collection: 'posts', id: post.id, data: { title: 'draft-v2' }, draft: true })
await show('pending draft saved', post.id)

await payload.update({ collection: 'posts', id: post.id, data: { deletedAt: new Date().toISOString() } })
await show('trashed', post.id)

await payload.update({ collection: 'posts', id: post.id, trash: true, data: { deletedAt: null } })
await show('restored', post.id)
console.log('expected after restore: main "published-v1" (published), with "draft-v2" still pending')
process.exit(0)
