// A scheduled publish and a scheduled unpublish for the same document run together: two versions end up flagged
// `latest`, and the unpublished document is still returned to an anonymous `draft: true` read.
import { getPayload } from 'payload'
import config from './payload.config.ts'

const payload = await getPayload({ config })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const trials = Number(process.env.TRIALS ?? 12)

let twoLatest = 0
let stillReadable = 0
for (let i = 0; i < trials; i++) {
  const post: any = await payload.create({ collection: 'posts', data: { title: `first-${i}`, _status: 'draft' }, draft: true })
  const queue = (type: 'publish' | 'unpublish') =>
    payload.jobs.queue({
      task: 'schedulePublish',
      input: { type, doc: { relationTo: 'posts', value: String(post.id) } } as never,
      waitUntil: new Date(Date.now() + 80),
    })
  await queue('publish')
  await queue('unpublish')
  await payload.update({ collection: 'posts', id: post.id, data: { title: `content-${i}`, _status: 'published' } })
  await sleep(250) // both jobs are now due
  await payload.jobs.run({ silent: true } as never) // runs them together, as a runner does after downtime

  const versions = await payload.findVersions({ collection: 'posts', where: { parent: { equals: post.id } }, sort: 'createdAt', limit: 20, depth: 0 })
  const latest = versions.docs.filter((v: any) => v.latest)
  const main: any = await payload.findByID({ collection: 'posts', id: post.id })
  // an anonymous caller, with the documented access rule (public users only read published documents)
  const anonymous = await payload
    .find({ collection: 'posts', draft: true, overrideAccess: false, where: { id: { equals: post.id } } })
    .then((r) => r.docs)
  if (latest.length !== 1) twoLatest++
  if (main._status !== 'published' && anonymous.length > 0) stillReadable++
  if (i === 0) {
    console.log(`first document: status ${main._status}`)
    for (const v of versions.docs as any[]) console.log(`  version ${v.id}: ${v.version._status}, updatedAt ${new Date(v.updatedAt).toISOString()}${v.latest ? '  [latest]' : ''}`)
    console.log(`  anonymous draft=true read returned: ${anonymous.map((d: any) => `${d.title}/${d._status}`).join(', ') || 'nothing'}   (expected nothing, the document is unpublished)`)
  }
}
console.log(`\n${trials} documents: ${twoLatest} have more than one version flagged latest, ${stillReadable} are unpublished but still returned to an anonymous draft=true read`)
process.exit(0)
