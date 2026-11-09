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
      fields: [{ name: 'title', type: 'text', required: true }],
      versions: { drafts: { schedulePublish: true } },
    },
  ],
  typescript: { autoGenerate: false },
})
