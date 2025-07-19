import { Json } from 'aws-sdk/clients/robomaker'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

export async function insertAccessibilityReport({ url, allowed_sites_id, r2_key, score }: { url: string; allowed_sites_id?: number | null; r2_key: string; score?: Json }) {
  const [id] = await database(TABLES.accessibilityReports).insert({
    url,
    allowed_sites_id,
    r2_key,
    score: score ? JSON.stringify(score) : null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  // Fetch the full row after insert
  const [row] = await database(TABLES.accessibilityReports).where({ id }).select()

  return row
}

export async function getR2KeysByParams({ url, created_at, updated_at }: { url: string; created_at?: string; updated_at?: string }) {
  let query = database(TABLES.accessibilityReports).where({ url })

  if (created_at) {
    query = query.andWhere('created_at', '>=', created_at)
  }
  if (updated_at) {
    query = query.andWhere('updated_at', '<=', updated_at)
  }

  query = query.orderBy('created_at', 'desc')

  const rows = await query.select('url', 'r2_key', 'created_at', 'score')
  // Ensure score is properly formatted
  return rows.map((row: any) => ({
    ...row,
    score: typeof row.score === 'object' && row.score != null ? row.score.value : (row.score ?? 0), // Extract value if score is an object
  }))
}

export async function deleteAccessibilityReportByR2Key(r2_key: string) {
  const deleted = await database(TABLES.accessibilityReports).where({ r2_key }).del()
  return !!deleted
}

export async function getAccessibilityReportByR2Key(r2_key: string): Promise<any | null> {
  return (await database(TABLES.accessibilityReports).where({ r2_key }).first()) || null
}
