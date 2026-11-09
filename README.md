# Payload draft reproductions

Two small scripts for two behaviours in Payload 3.93.0 with `@payloadcms/db-sqlite`. They use the Local API only, with no Next.js app.

```bash
npm install
npm run jobs    # scheduled publish jobs are not deleted with their document
npm run trash   # trashing a published post that has a pending draft
```

Each script creates its own `repro.db` (delete it to start clean). Tested with Node.js v25.6.1 on macOS.

## `npm run jobs`

The admin UI queues a scheduled publish with `value: String(id)` (`ScheduleDrawer`). `deleteScheduledPublishJobs` then looks for `input.doc.value` equal to the raw numeric id, which never matches, so the job stays after the document is deleted. SQLite reuses the id of a deleted row, and the script shows the stale job publishing a different post.

## `npm run trash`

Trashes a published post that has a pending draft with the same request the admin UI sends (`PATCH { deletedAt }`). The main document becomes the draft content with status `draft`, and restoring it does not bring the published version back.
