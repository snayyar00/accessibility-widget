import { combineResolvers } from 'graphql-resolvers'
import { v4 as uuidv4 } from 'uuid'

import { JOB_EXPIRY_MS } from '../../config/env'
import { QUEUE_PRIORITY } from '../../constants/queue-priority.constant'
import { deleteAccessibilityReportByR2Key, getAccessibilityReportByR2Key, getR2KeysByParams, insertAccessibilityReport } from '../../repository/accessibilityReports.repository'
import { findSiteByURL } from '../../repository/sites_allowed.repository'
import { fetchTechStackFromAPI } from '../../repository/techStack.repository'
import { fetchAccessibilityReport } from '../../services/accessibilityReport/accessibilityReport.service'
import { normalizeDomain } from '../../utils/domain.utils'
import { ValidationError } from '../../utils/graphql-errors.helper'
import { deleteReportFromR2, fetchReportFromR2, saveReportToR2 } from '../../utils/r2Storage'
import { validateAccessibilityReport, validateAccessibilityReportR2Filter, validateR2Key, validateSaveAccessibilityReportInput } from '../../validations/accesability.validation'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

type AccessibilityReportJob = {
  status: 'pending' | 'done' | 'error'
  result: any
  error: string | null
  createdAt: number
  timeout: NodeJS.Timeout
}

// In-memory job store
const accessibilityReportJobs = new Map<string, AccessibilityReportJob>() // jobId -> job

function createJob(): string {
  const jobId = uuidv4()
  const job: AccessibilityReportJob = {
    status: 'pending',
    result: null,
    error: null,
    createdAt: Date.now(),
    timeout: setTimeout(() => {
      accessibilityReportJobs.delete(jobId)
    }, JOB_EXPIRY_MS),
  }
  accessibilityReportJobs.set(jobId, job)
  return jobId
}

async function processAccessibilityReportJob(jobId: string, url: string, useCache?: boolean, fullSiteScan?: boolean, priority?: number) {
  try {
    const accessibilityReport = await fetchAccessibilityReport({ url, useCache, fullSiteScan, priority })

    // Use tech stack from accessibility report if available, otherwise fetch from API
    let techStack = accessibilityReport.techStack
    if (!techStack) {
      console.log('🔧 No tech stack found in accessibility report, fetching from tech stack API as fallback')
      techStack = await fetchTechStackFromAPI(url)
    } else {
      console.log('🔧 Using tech stack from accessibility report scanner API')
    }

    const result = {
      ...accessibilityReport,
      techStack,
    }

    // --- Backend save logic ---
    const normalizedUrl = normalizeDomain(url)
    let allowed_sites_id = null
    try {
      const site = await findSiteByURL(normalizedUrl)
      allowed_sites_id = site ? site.id : null
    } catch {
      allowed_sites_id = null
    }
    // Generate a report key
    const reportKey = `reports/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.json`
    // Save to R2
    await saveReportToR2(reportKey, result)
    // Save metadata to DB
    let scoreObj
    if (result.score == null) {
      scoreObj = { value: 0 }
    } else if (typeof result.score === 'object' && result.score !== null && typeof result.score !== 'number' && !Array.isArray(result.score) && 'value' in result.score) {
      scoreObj = result.score
    } else if (typeof result.score === 'number') {
      scoreObj = { value: result.score }
    } else {
      scoreObj = { value: 0 }
    }
    const meta = await insertAccessibilityReport({
      url: normalizedUrl || '',
      allowed_sites_id,
      r2_key: reportKey,
      score: scoreObj as any,
    })
    // Store the saved report meta in the job result
    // Ensure result.score is a number for the frontend/GraphQL
    const scoreVal = result.score
    if (scoreVal == null) {
      result.score = 0
    } else if (typeof scoreVal === 'object' && scoreVal !== null && typeof scoreVal !== 'number' && !Array.isArray(scoreVal) && 'value' in scoreVal!) {
      result.score = (scoreVal! as any).value ?? 0
    } else if (typeof scoreVal !== 'number') {
      result.score = 0
    }
    const job = accessibilityReportJobs.get(jobId)
    if (job) {
      job.status = 'done'
      job.result = {
        reportData: result,
        savedReport: {
          success: true,
          key: reportKey,
          report: meta,
        },
      }
    }
  } catch (error: any) {
    const job = accessibilityReportJobs.get(jobId)
    if (job) {
      job.status = 'error'
      job.error = error.message
    }
  }
}

type AccessibilityReportJobStatusResponse = {
  status: string
  result: any | null
  error: string | null
}

const resolvers = {
  Query: {
    startAccessibilityReportJob: combineResolvers(allowedOrganization, async (_: any, { url, use_cache, full_site_scan }: { url: string; use_cache?: boolean; full_site_scan?: boolean }) => {
      const validateResult = validateAccessibilityReport({ url })

      if (Array.isArray(validateResult) && validateResult.length) {
        return new ValidationError(validateResult.map((it) => it.message).join(','))
      }

      const jobId = createJob()

      // Start processing in background with HIGH priority (user-initiated frontend scanner)
      processAccessibilityReportJob(jobId, url, use_cache, full_site_scan, QUEUE_PRIORITY.HIGH).catch(console.error)
      return { jobId }
    }),

    getAccessibilityReportByJobId: combineResolvers(allowedOrganization, async (_: any, { jobId }: { jobId: string }): Promise<AccessibilityReportJobStatusResponse> => {
      const job = accessibilityReportJobs.get(jobId)
      if (!job) {
        return { status: 'not_found', result: null, error: 'Error generating report please try agian' }
      }
      if (job.status === 'done' || job.status === 'error') {
        clearTimeout(job.timeout)
        accessibilityReportJobs.delete(jobId)
      }
      return {
        status: job.status,
        result: job.result,
        error: job.error,
      }
    }),

    getAccessibilityReport: async (_: any, { url }: { url: string }) => {
      const validateResult = validateAccessibilityReport({ url })

      if (Array.isArray(validateResult) && validateResult.length) {
        return new ValidationError(validateResult.map((it) => it.message).join(','))
      }

      try {
        const accessibilityReport = await fetchAccessibilityReport({ url })

        // Use tech stack from accessibility report if available, otherwise fetch from API
        let techStack = accessibilityReport.techStack
        if (!techStack) {
          console.log('🔧 No tech stack found in accessibility report, fetching from tech stack API as fallback')
          techStack = await fetchTechStackFromAPI(url)
        } else {
          console.log('🔧 Using tech stack from accessibility report scanner API')
        }

        return {
          ...accessibilityReport,
          techStack,
        }
      } catch (error) {
        throw new Error(`Failed to fetch accessibility report: ${error.message}`)
      }
    },

    fetchAccessibilityReportFromR2: combineResolvers(allowedOrganization, isAuthenticated, async (_: any, { url, created_at, updated_at }: any) => {
      const validateResult = validateAccessibilityReportR2Filter({ url, created_at, updated_at })

      if (Array.isArray(validateResult) && validateResult.length) {
        return new ValidationError(validateResult.map((it) => it.message).join(','))
      }

      try {
        // const site = await findSiteByURL(url);

        // if (!site || site.user_id !== user.id) {
        //   throw new Error('User does not own this site');
        // }

        const rows = await getR2KeysByParams({ url, created_at, updated_at })
        // Ensure score is properly formatted
        const formattedRows = rows.map((row: any) => {
          console.log(typeof row.score, row.score)
          return {
            ...row,
            score: row.score != null && typeof row.score === 'object' ? row.score.value : (row.score ?? 0), // Extract value if score is an object
          }
        })

        return formattedRows
      } catch (error) {
        throw new Error(`Failed to fetch reports from R2: ${error.message}`)
      }
    }),

    fetchReportByR2Key: combineResolvers(allowedOrganization, isAuthenticated, async (_: any, { r2_key }: any) => {
      const validateResult = validateR2Key(r2_key)

      if (Array.isArray(validateResult) && validateResult.length) {
        return new ValidationError(validateResult.map((it) => it.message).join(','))
      }

      try {
        const report = await getAccessibilityReportByR2Key(r2_key)

        if (!report || !report?.url) {
          throw new Error('Report not found')
        }

        // const site = await findSiteByURL(report.url);

        // if (!site || site.user_id !== user.id) {
        //   throw new Error('User does not own this site');
        // }

        return await fetchReportFromR2(r2_key)
      } catch (error) {
        throw new Error(`Failed to fetch report by R2 key: ${error.message}`)
      }
    }),
  },
  Mutation: {
    saveAccessibilityReport: combineResolvers(allowedOrganization, isAuthenticated, async (_: any, { report, url, allowed_sites_id, key, score }: any) => {
      const validateResult = validateSaveAccessibilityReportInput({ report, url, allowed_sites_id, key, score })

      if (Array.isArray(validateResult) && validateResult.length) {
        return new ValidationError(validateResult.map((it) => it.message).join(','))
      }

      try {
        // const site = await findSiteByURL(url);

        // if (!site || site.user_id !== user.id) {
        //   throw new Error('User does not own this site');
        // }

        const reportKey = key || `reports/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.json`

        await saveReportToR2(reportKey, report)

        const meta = await insertAccessibilityReport({
          url,
          allowed_sites_id,
          r2_key: reportKey,
          score: typeof score === 'object' ? score : { value: score },
        })

        return { success: true, key: reportKey, report: meta }
      } catch (error) {
        throw new Error(`Failed to save accessibility report: ${error.message}`)
      }
    }),

    deleteAccessibilityReport: combineResolvers(allowedOrganization, isAuthenticated, async (_: any, { r2_key }: any, { user }) => {
      const validateResult = validateR2Key(r2_key)

      if (Array.isArray(validateResult) && validateResult.length) {
        return new ValidationError(validateResult.map((it) => it.message).join(','))
      }

      try {
        const report = await getAccessibilityReportByR2Key(r2_key)

        if (!report || !report.url) {
          throw new Error('Report not found')
        }

        const site = await findSiteByURL(report.url)

        if (!site || site.user_id !== user.id) {
          throw new Error('User does not own this site')
        }

        const result = await deleteAccessibilityReportByR2Key(r2_key)
        await deleteReportFromR2(r2_key)

        return result
      } catch (error) {
        throw new Error(`Failed to delete accessibility report: ${error.message}`)
      }
    }),
  },
}

export default resolvers
