// Scheduled publish jobs are not deleted when their document is deleted (numeric ids, SQLite).
import { getPayload } from 'payload'
import config from './payload.config.ts'

const payload = await getPayload({ config })

const pendingFor = async (id: number | string) =>
  (
    await payload.find({
      collection: 'payload-jobs',
      where: { and: [{ taskSlug: { equals: 'schedulePublish' } }, { completedAt: { exists: false } }] },
      limit: 100,
      depth: 0,
    } as never)
  ).docs.filter((j: any) => String(j.input?.doc?.value) === String(id))

// The admin UI queues the job with value: String(id) (packages/ui ScheduleDrawer), so the stored value is a string.
const queuePublish = (id: number | string) =>
  payload.jobs.queue({
    task: 'schedulePublish',
    input: { type: 'publish', doc: { relationTo: 'posts', value: String(id) } } as never,
    waitUntil: new Date(Date.now() + 3600_000),
  })

// 1. A draft post with a scheduled publish, then the post is deleted.
const a: any = await payload.create({ collection: 'posts', data: { title: 'a', _status: 'draft' }, draft: true })
await queuePublish(a.id)
console.log(`post id ${a.id} (${typeof a.id}); pending scheduled jobs for it: ${(await pendingFor(a.id)).length}`)
await payload.delete({ collection: 'posts', id: a.id, trash: true })
console.log(`after deleting the post: it exists = ${Boolean(await payload.findByID({ collection: 'posts', id: a.id, trash: true }).catch(() => null))}`)
console.log(`after deleting the post: pending scheduled jobs for it = ${(await pendingFor(a.id)).length}   (expected 0)`)

// 2. Why: the stored value is a string, the cleanup query compares it with the numeric id.
const asNumber = await payload.find({ collection: 'payload-jobs', where: { 'input.doc.value': { equals: a.id } }, limit: 5, depth: 0 } as never)
const asString = await payload.find({ collection: 'payload-jobs', where: { 'input.doc.value': { equals: String(a.id) } }, limit: 5, depth: 0 } as never)
console.log(`query input.doc.value equals ${a.id} (number): ${asNumber.docs.length} jobs`)
console.log(`query input.doc.value equals "${a.id}" (string): ${asString.docs.length} jobs`)

// 3. SQLite reuses the id of a deleted row: the next post can inherit the stale job.
const b: any = await payload.create({ collection: 'posts', data: { title: 'b', _status: 'draft' }, draft: true })
console.log(`new post id ${b.id}; pending scheduled jobs for it before scheduling anything: ${(await pendingFor(b.id)).length}   (expected 0)`)
// 4. The consequence: a stale job publishes the wrong document.
const c: any = await payload.create({ collection: 'posts', data: { title: 'c', _status: 'draft' }, draft: true })
await payload.jobs.queue({
  task: 'schedulePublish',
  input: { type: 'publish', doc: { relationTo: 'posts', value: String(c.id) } } as never,
  waitUntil: new Date(Date.now() + 200),
})
await payload.delete({ collection: 'posts', id: c.id, trash: true })
const d: any = await payload.create({ collection: 'posts', data: { title: 'd, never meant to be published', _status: 'draft' }, draft: true })
console.log(`post c (id ${c.id}) was deleted, post d got id ${d.id}`)
await new Promise((r) => setTimeout(r, 400))
await payload.jobs.run({ silent: true } as never)
const after: any = await payload.findByID({ collection: 'posts', id: d.id, draft: false })
console.log(`after the stale job ran: post d status = ${after._status}   (expected draft)`)
process.exit(0)
