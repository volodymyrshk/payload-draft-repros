import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

export default buildConfig({
  secret: 'repro-secret',
  editor: lexicalEditor(),
  db: sqliteAdapter({ client: { url: process.env.DB_URL || 'file:./repro.db' }, push: true }),
  collections: [
    {
      slug: 'posts',
      trash: true,
      // the documented pattern: logged-in users read everything, the public only reads published documents
      access: { read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }) },
      fields: [{ name: 'title', type: 'text', required: true }],
      versions: { drafts: { schedulePublish: true } },
    },
  ],
  typescript: { autoGenerate: false },
})
