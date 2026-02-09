import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

const TABLE = TABLES.bulkEmailRecipients

export interface BulkEmailRecipientRow {
  id?: number
  username: string
  email: string
  email_sent?: boolean
  created_at?: string
  sent_at?: string | null
}

/**
 * Insert multiple bulk email recipients (from CSV). Each row gets email_sent = false.
 * Returns the number of rows inserted.
 */
export async function insertBulkEmailRecipients(
  recipients: Array<{ username: string; email: string }>,
): Promise<number> {
  if (!recipients.length) return 0
  const rows: BulkEmailRecipientRow[] = recipients.map(({ username, email }) => ({
    username: username.trim(),
    email: email.trim().toLowerCase(),
    email_sent: false,
  }))
  await database(TABLE).insert(rows)
  return rows.length
}

export interface GetBulkEmailRecipientsFilter {
  emailSent?: boolean
  search?: string
}

/**
 * Fetch bulk email recipients with optional filter (email_sent, search by username/email).
 */
export async function getBulkEmailRecipients(filter?: GetBulkEmailRecipientsFilter): Promise<BulkEmailRecipientRow[]> {
  let query = database(TABLE).select('*').orderBy('id', 'asc')

  if (filter?.emailSent !== undefined) {
    query = query.where('email_sent', !!filter.emailSent)
  }
  if (filter?.search?.trim()) {
    const term = `%${filter.search.trim().toLowerCase()}%`
    query = query.where((qb) => {
      qb.whereRaw('LOWER(username) LIKE ?', [term]).orWhereRaw('LOWER(email) LIKE ?', [term])
    })
  }

  const rows = await query
  return rows as BulkEmailRecipientRow[]
}

/**
 * Fetch recipients by IDs (for sending).
 */
export async function getBulkEmailRecipientsByIds(ids: number[]): Promise<BulkEmailRecipientRow[]> {
  if (!ids.length) return []
  const rows = await database(TABLE).whereIn('id', ids).select('*')
  return rows as BulkEmailRecipientRow[]
}

/**
 * Mark recipients as email sent (email_sent = true).
 * Note: If your table has a sent_at column, run the migration to add it and we can set it here.
 */
export async function updateEmailSentByIds(ids: number[]): Promise<number> {
  if (!ids.length) return 0
  const updated = await database(TABLE)
    .whereIn('id', ids)
    .update({ email_sent: true })
  return typeof updated === 'number' ? updated : 0
}
