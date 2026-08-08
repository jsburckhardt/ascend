import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

const client = createClient({
  url: process.env.ASCEND_DATABASE_URL ?? 'file:ascend.db',
})

export const database = drizzle(client)
