import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { siteColumns } from './sites_allowed.repository'

const TABLE = TABLES.problemReports

export const problemReportsColumns = {
  id: 'problem_reports.id',
  site_id: 'problem_reports.site_id',
  issue_type: 'problem_reports.issue_type',
  description: 'problem_reports.description',
  reporter_email: 'problem_reports.reporter_email',
  created_at: 'problem_reports.created_at',
  fixed: 'problem_reports.fixed',
}

export type problemReportProps = {
  site_id: number
  issue_type: 'bug' | 'accessibility'
  description: string
  reporter_email: string
}

export async function addProblemReport(problem: problemReportProps) {
  return database(TABLE).insert(problem)
}

export async function getProblemReportsBySiteId(site_id: number) {
  return database(TABLE).join(TABLES.allowed_sites, problemReportsColumns.site_id, siteColumns.id).select(problemReportsColumns, `${siteColumns.url} as site_url`).where('site_id', site_id)
}

export async function toggleProblemReportFixedStatus(id: number) {
  return database(TABLE)
    .where('id', id)
    .update({
      fixed: database.raw('NOT fixed'),
    })
}

export async function getProblemReportsBySiteIds(site_ids: number[]) {
  if (site_ids.length === 0) {
    return []
  }

  return database(TABLE).join(TABLES.allowed_sites, problemReportsColumns.site_id, siteColumns.id).select(problemReportsColumns, `${siteColumns.url} as site_url`).whereIn('site_id', site_ids)
}
