import { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

const TABLE = TABLES.accessibilityIssues

export const accessibilityIssuesColumns = {
  id: 'accessibility_issues.id',
  urlid: 'accessibility_issues.urlid',
  url: 'accessibility_issues.url',
  issue: 'accessibility_issues.issue',
  fix: 'accessibility_issues.fix',
  isApplied: 'accessibility_issues.is_applied',
  kindOfChange: 'accessibility_issues.kind_of_change',
  createdAt: 'accessibility_issues.created_at',
  updatedAt: 'accessibility_issues.updated_at',
}

export type AccessibilityIssue = {
  id?: string
  urlid: string
  url: string
  issue: string
  fix: string
  is_applied?: boolean
  kind_of_change?: 'add' | 'update' | 'review'
  created_at?: Date | string
  updated_at?: Date | string
}

export type AccessibilityIssueStats = {
  total_issues: number
  applied_issues: number
  unapplied_issues: number
  by_kind_of_change: Record<string, number>
  unique_urls: number
  unique_sessions: number
}

/**
 * Insert a single accessibility issue into the database.
 */
export async function insertAccessibilityIssue(data: Omit<AccessibilityIssue, 'id' | 'created_at' | 'updated_at'>, trx?: Knex.Transaction): Promise<string> {
  const issueId = uuidv4()

  const issueData = {
    id: issueId,
    urlid: data.urlid,
    url: data.url,
    issue: data.issue,
    fix: data.fix,
    is_applied: data.is_applied ?? false,
    kind_of_change: data.kind_of_change ?? 'add',
  }

  const query = database(TABLE).insert(issueData)

  if (trx) {
    await query.transacting(trx)
  } else {
    await query
  }

  return issueId
}

/**
 * Insert multiple accessibility issues in bulk.
 */
export async function insertAccessibilityIssuesBulk(issues: Array<Omit<AccessibilityIssue, 'id' | 'created_at' | 'updated_at'>>, trx?: Knex.Transaction): Promise<string[]> {
  const issueIds: string[] = []
  const records = issues.map((issue) => {
    const issueId = uuidv4()
    issueIds.push(issueId)

    return {
      id: issueId,
      urlid: issue.urlid,
      url: issue.url,
      issue: issue.issue,
      fix: issue.fix,
      is_applied: issue.is_applied ?? false,
      kind_of_change: issue.kind_of_change ?? 'add',
    }
  })

  const query = database(TABLE).insert(records)

  if (trx) {
    await query.transacting(trx)
  } else {
    await query
  }

  return issueIds
}

/**
 * Update the is_applied status of an issue.
 */
export async function updateAccessibilityIssueStatus(issueId: string, isApplied: boolean, trx?: Knex.Transaction): Promise<boolean> {
  const query = database(TABLE).where({ id: issueId }).update({
    is_applied: isApplied,
    updated_at: database.fn.now(),
  })

  const rowsAffected = trx ? await query.transacting(trx) : await query

  return rowsAffected > 0
}

/**
 * Retrieve all issues for a specific URL test session.
 */
export async function getAccessibilityIssuesBySession(urlid: string): Promise<AccessibilityIssue[]> {
  return database(TABLE).where({ urlid }).orderBy('created_at', 'desc').select('*')
}

/**
 * Retrieve all issues for a specific URL.
 */
export async function getAccessibilityIssuesByUrl(url: string): Promise<AccessibilityIssue[]> {
  return database(TABLE).where({ url }).orderBy('created_at', 'desc').select('*')
}

/**
 * Retrieve all issues that haven't been applied yet.
 */
export async function getUnappliedAccessibilityIssues(urlid?: string): Promise<AccessibilityIssue[]> {
  const query = database(TABLE).where({ is_applied: false })

  if (urlid) {
    query.andWhere({ urlid })
  }

  return query.orderBy('created_at', 'desc').select('*')
}

/**
 * Get a single issue by ID.
 */
export async function getAccessibilityIssueById(id: string): Promise<AccessibilityIssue | undefined> {
  return database(TABLE).where({ id }).first()
}

/**
 * Get statistics about the accessibility issues in database.
 */
export async function getAccessibilityDatabaseStats(): Promise<AccessibilityIssueStats> {
  // Total issues
  const totalResult = await database(TABLE).count('* as count').first()
  const totalIssues = Number(totalResult?.count || 0)

  // Applied vs unapplied
  const appliedResult = await database(TABLE).where({ is_applied: true }).count('* as count').first()
  const appliedCount = Number(appliedResult?.count || 0)

  const unappliedResult = await database(TABLE).where({ is_applied: false }).count('* as count').first()
  const unappliedCount = Number(unappliedResult?.count || 0)

  // By kind of change
  const byKindResults = await database(TABLE).select('kind_of_change').count('* as count').groupBy('kind_of_change')

  const byKind: Record<string, number> = {}
  byKindResults.forEach((row: any) => {
    if (row.kind_of_change) {
      byKind[row.kind_of_change] = Number(row.count)
    }
  })

  // Unique URLs
  const uniqueUrlsResult = await database(TABLE).countDistinct('url as count').first()
  const uniqueUrls = Number(uniqueUrlsResult?.count || 0)

  // Unique URL sessions
  const uniqueSessionsResult = await database(TABLE).countDistinct('urlid as count').first()
  const uniqueSessions = Number(uniqueSessionsResult?.count || 0)

  return {
    total_issues: totalIssues,
    applied_issues: appliedCount,
    unapplied_issues: unappliedCount,
    by_kind_of_change: byKind,
    unique_urls: uniqueUrls,
    unique_sessions: uniqueSessions,
  }
}

/**
 * Delete all issues for a specific URL test session.
 */
export async function deleteAccessibilityIssuesBySession(urlid: string, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ urlid }).del()

  return trx ? query.transacting(trx) : query
}

/**
 * Delete a specific issue by ID.
 */
export async function deleteAccessibilityIssueById(id: string, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ id }).del()

  return trx ? query.transacting(trx) : query
}

/**
 * Parse accessibility API response and store all issues in the database.
 *
 * This function should be called after an accessibility test completes.
 */
export async function parseAndStoreAccessibilityResults(apiResponse: any, urlid: string, url: string): Promise<{ total_issues: number; stored_count: number; categories: Record<string, number> }> {
  const issuesToInsert: Array<Omit<AccessibilityIssue, 'id' | 'created_at' | 'updated_at'>> = []
  const stats = {
    total_issues: 0,
    stored_count: 0,
    categories: {} as Record<string, number>,
  }

  // Navigate through the API response structure
  if (apiResponse && typeof apiResponse === 'object' && 'results' in apiResponse) {
    const results = apiResponse.results

    // Process each category of checks
    for (const [category, checks] of Object.entries(results)) {
      if (!checks || typeof checks !== 'object') {
        continue
      }

      let categoryCount = 0

      for (const [checkName, checkData] of Object.entries(checks)) {
        if (!checkData || typeof checkData !== 'object') {
          continue
        }

        // Handle different response structures
        let issuesList: any[] = []

        // Check for 'issues' key
        if ('issues' in checkData && Array.isArray(checkData.issues)) {
          issuesList = checkData.issues
        }
        // Check for 'violations' key
        else if ('violations' in checkData && Array.isArray(checkData.violations)) {
          issuesList = checkData.violations
        }
        // Check for direct issue data
        else if ('issue' in checkData) {
          issuesList = [checkData]
        }

        // Process each issue
        for (const issueItem of issuesList) {
          if (typeof issueItem !== 'object' || !issueItem) {
            continue
          }

          // Extract issue and fix information
          const issueText = issueItem.issue || issueItem.description || issueItem.message || ''
          const fixText = issueItem.fix || issueItem.recommendation || issueItem.how_to_fix || ''

          // Determine kind of change based on severity or type
          let kind: 'add' | 'update' | 'review' = 'review'
          if (issueItem.severity) {
            const severity = issueItem.severity.toLowerCase()
            if (['critical', 'serious', 'high'].includes(severity)) {
              kind = 'add'
            } else if (['moderate', 'medium'].includes(severity)) {
              kind = 'update'
            }
          }

          if (issueText && fixText) {
            issuesToInsert.push({
              urlid,
              url,
              issue: `[${category} - ${checkName}] ${issueText}`,
              fix: fixText,
              kind_of_change: kind,
              is_applied: false,
            })
            categoryCount++
          }
        }
      }

      if (categoryCount > 0) {
        stats.categories[category] = categoryCount
      }
    }
  }

  // Insert all issues in bulk
  if (issuesToInsert.length > 0) {
    const insertedIds = await insertAccessibilityIssuesBulk(issuesToInsert)
    stats.stored_count = insertedIds.length
    stats.total_issues = issuesToInsert.length
  }

  return stats
}
