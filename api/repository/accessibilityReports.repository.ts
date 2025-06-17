import database from '../config/database.config';
import { TABLES } from '../constants/database.constant';

export async function insertAccessibilityReport({
  url,
  allowed_sites_id,
  r2_key,
}: {
  url: string;
  allowed_sites_id?: number;
  r2_key: string;
}) {
  const [id] = await database(TABLES.accessibilityReports).insert({
    url,
    allowed_sites_id,
    r2_key,
    created_at: new Date(),
    updated_at: new Date(),
  });
  // Fetch the full row after insert
  const [row] = await database(TABLES.accessibilityReports)
    .where({ id })
    .select();

  return row;
}

export async function getR2KeysByParams({
  url,
  created_at,
  updated_at,
}: {
  url: string;
  created_at?: string;
  updated_at?: string;
}) {
  let query = database(TABLES.accessibilityReports).where({ url });

  if (created_at) {
    query = query.andWhere('created_at', '>=', created_at);
  }
  if (updated_at) {
    query = query.andWhere('updated_at', '<=', updated_at);
  }

  // If no optional params, order by created_at desc and limit 1 (latest)
  if (!created_at && !updated_at) {
    query = query.orderBy('created_at', 'desc').limit(1);
  }

  const rows = await query.select('r2_key');
  return rows.map(row => row.r2_key);
}

export async function deleteAccessibilityReportByR2Key(r2_key: string) {
  const deleted = await database(TABLES.accessibilityReports)
    .where({ r2_key })
    .del();
  return !!deleted;
}