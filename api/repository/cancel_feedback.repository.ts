import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

export interface CancelFeedbackProps {
  user_id: number
  user_feedback: string
  site_url: string
  stripe_customer_id?: string
  site_status_on_cancel: string
  organization_id: number
  deleted_at?: Date
}

export const addCancelFeedback = async (feedbackData: CancelFeedbackProps): Promise<void> => {
  try {
    await database(TABLES.cancelFeedback).insert({
      organization_id: feedbackData.organization_id,
      user_id: feedbackData.user_id,
      user_feedback: feedbackData.user_feedback,
      site_url: feedbackData.site_url,
      stripe_customer_id: feedbackData.stripe_customer_id,
      site_status_on_cancel: feedbackData.site_status_on_cancel,
      deleted_at: feedbackData.deleted_at || new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
  } catch (error) {
    console.error('Error adding cancel feedback:', error)
    throw error
  }
}
