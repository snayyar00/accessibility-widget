import { combineResolvers } from 'graphql-resolvers'
import { v4 as uuidv4 } from 'uuid'
// @ts-ignore - adm-zip doesn't have TypeScript definitions
import AdmZip from 'adm-zip'

import { JOB_EXPIRY_MS } from '../../config/env'
import { QUEUE_PRIORITY } from '../../constants/queue-priority.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import { deleteAccessibilityReportByR2Key, getAccessibilityReportByR2Key, getR2KeysByParams, insertAccessibilityReport } from '../../repository/accessibilityReports.repository'
import { findSiteByURL } from '../../repository/sites_allowed.repository'
import { fetchTechStackFromAPI } from '../../repository/techStack.repository'
import { getUserbyId } from '../../repository/user.repository'
import { checkScript } from '../../services/allowedSites/allowedSites.service'
import { fetchAccessibilityReport } from '../../services/accessibilityReport/accessibilityReport.service'
import { EmailAttachment, sendEmailWithRetries } from '../../services/email/email.service'
import { normalizeDomain } from '../../utils/domain.utils'
import { UserInputError, ValidationError } from '../../utils/graphql-errors.helper'
import { deleteReportFromR2, fetchReportFromR2, saveReportToR2 } from '../../utils/r2Storage'
import { generateSecureUnsubscribeLink, getUnsubscribeTypeForEmail } from '../../utils/secure-unsubscribe.utils'
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
    let site = null
    try {
      site = await findSiteByURL(normalizedUrl)
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

    // If this is a full site scan, send email notification when report is ready
    if (fullSiteScan && site && site.user_id) {
      // Capture variables for the async closure
      const emailReportKey = reportKey
      const emailResult = result
      const emailUrl = url
      const emailNormalizedUrl = normalizedUrl
      
      setImmediate(async () => {
        try {
          const user = await getUserbyId(site.user_id)
          if (!user || !user.email) {
            console.log(`Skipping full site scan email - user ${site.user_id} not found or has no email`)
            return
          }

          let widgetStatus: string
          let status: string
          let score: number

          // Use widget status from report (Puppeteer detection) if available, otherwise fallback to API check
          widgetStatus = (emailResult as any)?.scriptCheckResult ?? (await checkScript(emailUrl))
          status = widgetStatus === 'true' || widgetStatus === 'Web Ability' ? 'Compliant' : 'Not Compliant'
          score = emailResult.score

          // Use the same score shown in the PDF:
          // 1) Prefer processed enhanced score when available
          // 2) Otherwise, if WebAbility is active, add the 45 bonus (capped at 95)
          // 3) Otherwise, use the raw scanner score
          const enhancedFromReport = (emailResult as any)?.totalStats?.score
          const displayedScore = typeof enhancedFromReport === 'number' ? enhancedFromReport : widgetStatus === 'true' || widgetStatus === 'Web Ability' ? Math.min((score || 0) + 45, 95) : score || 0

          const complianceByScore = displayedScore >= 80 ? 'Compliant' : displayedScore >= 50 ? 'Partially Compliant' : 'Not Compliant'

          // Calculate total counts from both AXE and HTML_CS
          const errorsCount = (emailResult?.axe?.errors?.length || 0) + (emailResult?.htmlcs?.errors?.length || 0)
          const warningsCount = (emailResult?.axe?.warnings?.length || 0) + (emailResult?.htmlcs?.warnings?.length || 0)
          const noticesCount = (emailResult?.axe?.notices?.length || 0) + (emailResult?.htmlcs?.notices?.length || 0)

          const year = new Date().getFullYear()

          // Generate secure unsubscribe link for full site scan reports (using 'domain' type as it's domain-specific)
          const unsubscribeLink = generateSecureUnsubscribeLink(user.email, getUnsubscribeTypeForEmail('domain'), user.id)

          // Get frontend URL from environment (handle comma-separated values)
          const frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://app.webability.io'

          // Generate direct link to the report - use the r2_key without the "reports/" prefix for the URL path
          // The frontend will add the prefix when fetching
          const r2KeyForUrl = emailReportKey.replace(/^reports\//, '')
          const reportLink = `${frontendUrl}/reports/${r2KeyForUrl}?domain=${encodeURIComponent(emailNormalizedUrl)}`

          const template = await compileEmailTemplate({
            fileName: 'accessReport.mjml',
            data: {
              status,
              url: emailUrl,
              statusImage: emailResult.siteImg,
              statusDescription: complianceByScore,
              score: displayedScore,
              errorsCount: errorsCount,
              warningsCount: warningsCount,
              noticesCount: noticesCount,
              reportLink: reportLink,
              unsubscribeLink: unsubscribeLink,
              year,
            },
          })

          // Generate PDF and compress it into a zip file to reduce email size
          let attachments: EmailAttachment[] = []
          try {
            const pdfBlob = await generatePDF(
              {
                ...emailResult, // Pass the full report data
                score: emailResult.score,
                widgetInfo: { result: widgetStatus },
                scriptCheckResult: widgetStatus,
                url: emailUrl,
              },
              'en',
              emailUrl,
            )
            
            // Convert Blob to Buffer - handle both browser Blob and Node.js compatible formats
            let pdfBuffer: Buffer
            if (pdfBlob instanceof Buffer) {
              pdfBuffer = pdfBlob
            } else if (pdfBlob instanceof Uint8Array) {
              pdfBuffer = Buffer.from(pdfBlob)
            } else if (typeof pdfBlob === 'object' && pdfBlob !== null && typeof (pdfBlob as any).arrayBuffer === 'function') {
              pdfBuffer = Buffer.from(await (pdfBlob as any).arrayBuffer())
            } else {
              // The object from generatePDF is not a recognizable buffer or blob-like structure.
              throw new Error('PDF blob is not in a recognized format (Buffer, Uint8Array, or Blob-like with arrayBuffer method)')
            }
            
            // Validate PDF buffer has content
            if (!pdfBuffer || pdfBuffer.length === 0) {
              throw new Error('Generated PDF buffer is empty')
            }
            
            // Check PDF size and compress into zip file to reduce email size
            const pdfSizeMB = pdfBuffer.length / (1024 * 1024)
            console.log(`PDF size for full site scan ${emailUrl}: ${pdfSizeMB.toFixed(2)}MB`)
            
            // Use adm-zip to compress PDF into a zip file
            try {
              const zip = new AdmZip()
              const pdfFileName = `accessibility-report-${emailUrl.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
              
              // Add the PDF file to the zip - ensure buffer is valid
              if (pdfBuffer && pdfBuffer.length > 0) {
                zip.addFile(pdfFileName, pdfBuffer)
                
                // Verify the file was added to the zip
                const zipEntries = zip.getEntries()
                if (zipEntries.length === 0) {
                  throw new Error('No files were added to the zip')
                }
                console.log(`Added ${zipEntries.length} file(s) to zip: ${zipEntries.map((e: any) => e.entryName).join(', ')}`)
                
                const zipBuffer = zip.toBuffer()
                
                // Validate zip buffer has content
                if (!zipBuffer || zipBuffer.length === 0) {
                  throw new Error('Generated zip buffer is empty')
                }
                
                const zipSizeMB = zipBuffer.length / (1024 * 1024)
                console.log(`Zipped PDF size for full site scan ${emailUrl}: ${zipSizeMB.toFixed(2)}MB (compression: ${((1 - zipSizeMB / pdfSizeMB) * 100).toFixed(1)}%)`)
                
                // Only use zip if it's smaller than 18MB (leave some margin under 20MB email limit)
                if (zipSizeMB < 18) {
                  attachments = [
                    {
                      content: zipBuffer,
                      name: `accessibility-report-${emailUrl.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.zip`,
                    },
                  ]
                  console.log(`Successfully created zip file with ${pdfFileName} (${zipSizeMB.toFixed(2)}MB)`)
                } else {
                  console.log(`Zipped PDF still too large (${zipSizeMB.toFixed(2)}MB), skipping attachment. Report available at: ${reportLink}`)
                }
              } else {
                throw new Error('PDF buffer is empty or invalid')
              }
            } catch (zipError) {
              // If adm-zip is not installed or fails, skip attachment
              console.error(`Failed to create zip file (adm-zip may not be installed):`, zipError)
              console.log(`Skipping PDF attachment. Report available at: ${reportLink}`)
            }
          } catch (pdfError) {
            console.error(`Failed to generate PDF/ZIP for full site scan ${emailUrl}:`, pdfError)
            // Continue without attachment - the email will still have the link to view the report
          }

          await sendEmailWithRetries(user.email, template, `Full Site Accessibility Report for ${emailUrl}`, 2, 2000, attachments, 'WebAbility Reports')
          console.log(`Full site scan email successfully sent to ${user.email} for site ${emailUrl} with report key ${emailReportKey}`)
        } catch (error) {
          console.error(`Error sending full site scan email for ${emailUrl}:`, error)
        }
      })
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
          // Report not found is a user input error, not a system error
          throw new UserInputError('Report not found')
        }

        // const site = await findSiteByURL(report.url);

        // if (!site || site.user_id !== user.id) {
        //   throw new Error('User does not own this site');
        // }

        return await fetchReportFromR2(r2_key)
      } catch (error) {
        // If it's already a GraphQLError (like UserInputError), re-throw it
        if (error instanceof UserInputError || error instanceof ValidationError) {
          throw error
        }
        // For other errors (like R2 fetch failures), wrap them appropriately
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

        // Check organization_id if user has current organization
        if (user.current_organization_id && site.organization_id !== user.current_organization_id) {
          throw new Error('Site does not belong to current organization')
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
