import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  canonicalPath: text('canonical_path').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
