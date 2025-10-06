import compileEmailTemplate from '../../helpers/compile-email-template'
import { addProblemReport } from '../../repository/problem_reports.repository'
import { FindAllowedSitesProps, findSiteByURL } from '../../repository/sites_allowed.repository'
import { findUserNotificationByUserId, getUserbyId } from '../../repository/user.repository'
import { getRootDomain } from '../../utils/domain.utils'
import { ValidationError } from '../../utils/graphql-errors.helper'
import { generateSecureUnsubscribeLink, getUnsubscribeTypeForEmail } from '../../utils/secure-unsubscribe.utils'
import { validateReportProblem } from '../../validations/reportProblem.validation'
import { sendMail } from '../email/email.service'

export async function handleReportProblem(site_url: string, issue_type: string, description: string, reporter_email: string): Promise<string> {
  const validateResult = validateReportProblem({ site_url, issue_type, description, reporter_email })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  try {
    const year = new Date().getFullYear()
    const domain = getRootDomain(site_url)
    const site: FindAllowedSitesProps = await findSiteByURL(domain)

    if (!site) {
      return 'Site not found'
    }

    const problem = {
      // site_url,
      issue_type: issue_type as 'bug' | 'accessibility',
      description,
      reporter_email,
      site_id: site.id,
      created_at: new Date(),
    }

    await addProblemReport(problem)

    let user = null
    try {
      user = await getUserbyId(site.user_id)
    } catch {
      console.log(`User not found for site ${site_url}, skipping notification check`)
    }
    if (user) {
      const notification = (await findUserNotificationByUserId(user.id, user.current_organization_id)) as { issue_reported_flag?: boolean } | null
      if (!notification || !notification.issue_reported_flag) {
        console.log(`Skipping issue report email for user ${user.email} (no notification flag)`)
        return 'Problem reported successfully (notification skipped)'
      }
    }

    const template = await compileEmailTemplate({
      fileName: 'reportProblem.mjml',
      data: {
        issue_type: problem.issue_type,
        description: problem.description,
        year,
      },
    })
    // Generate unsubscribe link for the domain owner (if user exists)
    let unsubscribeLink = ''
    if (user) {
      unsubscribeLink = generateSecureUnsubscribeLink(user.email, getUnsubscribeTypeForEmail('issue_reports'), user.id)
    }

    const template1 = await compileEmailTemplate({
      fileName: 'problemReported.mjml',
      data: {
        issue_type: problem.issue_type,
        description: problem.description,
        year,
        domain,
        unsubscribeLink,
      },
    })

    sendMail(problem.reporter_email, 'Problem reported', template)
      .then(() => console.log('Mail sent successfully'))
      .catch((mailError) => console.error('Error sending mail:', mailError))

    // Send email to the domain owner if possible
    if (site.user_id) {
      const owner = await getUserbyId(site.user_id)
      if (owner && owner.email) {
        sendMail(owner.email, 'A problem was reported for your site', template1)
          .then(() => console.log('Owner mail sent successfully'))
          .catch((mailError) => console.error('Error sending owner mail:', mailError))
      }
    }

    return 'Problem reported successfully'
  } catch (error) {
    console.error('Error reporting problem:', error)
    return 'Cannot report problem'
  }
}
