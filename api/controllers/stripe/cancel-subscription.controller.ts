import { Request, Response } from 'express'

import { addCancelFeedback, CancelFeedbackProps } from '../../repository/cancel_feedback.repository'
import { deleteSiteWithRelatedRecords, findSiteByURL } from '../../repository/sites_allowed.repository'
import { getAnySitePlanBySiteId } from '../../repository/sites_plans.repository'
import { UserProfile } from '../../repository/user.repository'
import { deleteExpiredSitesPlan, deleteSitesPlan, deleteTrialPlan } from '../../services/allowedSites/plans-sites.service'

export async function cancelSiteSubscription(req: Request & { user: UserProfile }, res: Response) {
  const { domainId, domainUrl, status, cancelReason, otherReason, isCancel } = req.body

  let previous_plan: any[]
  let stripeCustomerId: string | null = null

  const { user } = req
  const site = await findSiteByURL(domainUrl)

  if (!site || site.user_id !== user.id) {
    return res.status(403).json({ error: 'User does not own this domain' })
  }

  try {
    previous_plan = await getAnySitePlanBySiteId(Number(domainId))

    // Get stripe customer ID for feedback recording
    if (previous_plan && previous_plan.length > 0) {
      stripeCustomerId = previous_plan[0].customerId
    }
  } catch (error) {
    console.log('err = ', error)
  }

  if (status != 'Active' && status != 'Life Time') {
    try {
      if (previous_plan && previous_plan.length > 0) {
        for (const plan of previous_plan) {
          if (plan.subscriptionId == 'Trial') {
            await deleteTrialPlan(plan.id)
          } else {
            let errorCount = 0
            try {
              await deleteExpiredSitesPlan(plan.id)
            } catch {
              errorCount++
            }

            if (errorCount == 0) {
              try {
                await deleteExpiredSitesPlan(plan.id, true)
              } catch {
                errorCount++
              }
            }

            if (errorCount == 2) {
              return res.status(500).json({ error: 'Error deleting expired sites plan' })
            }
          }
        }
      }
    } catch (error) {
      console.log('error deleting site by url', error)
      return res.status(500).json({ error: (error as Error).message })
    }
  } else {
    try {
      // Iterate through each plan in previous_plan array
      if (previous_plan && previous_plan.length > 0) {
        for (const plan of previous_plan) {
          if (plan.subscriptionId == 'Trial') {
            await deleteTrialPlan(plan.id)
          } else {
            await deleteSitesPlan(plan.id)
          }
        }
      }
    } catch (error) {
      console.log('err = ', error)
      return res.status(500).json({ error })
    }
  }

  try {
    if (!isCancel) {
      await deleteSiteWithRelatedRecords(domainUrl, user.id)
    }
  } catch (error) {
    console.error('Error deleting site:', error)
    return res.status(500).json({ error: 'Failed to delete site' })
  }

  // Record cancel feedback if provided
  if (cancelReason) {
    try {
      const feedbackData: CancelFeedbackProps = {
        user_id: Number(user.id),
        user_feedback: cancelReason === 'other' ? otherReason : cancelReason,
        site_url: domainUrl,
        stripe_customer_id: stripeCustomerId,
        site_status_on_cancel: status,
        deleted_at: new Date(),
        organization_id: user.current_organization_id,
      }

      await addCancelFeedback(feedbackData)
      console.log('Cancel feedback recorded successfully')
    } catch (feedbackError) {
      console.error('Error recording cancel feedback:', feedbackError)
    }
  }

  return res.status(200).json({ success: true })
}
