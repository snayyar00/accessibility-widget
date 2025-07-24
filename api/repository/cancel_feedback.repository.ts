import database from '../config/database.config'

export interface CancelFeedbackProps {
  user_id: number
  user_feedback: string
  site_url: string
  stripe_customer_id?: string
  site_status_on_cancel: string
  deleted_at?: Date
}

export const addCancelFeedback = async (feedbackData: CancelFeedbackProps): Promise<void> => {
  try {
    await database('cancel_feedback').insert({
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

export const getCancelFeedbackByUserId = async (userId: number) => {
  try {
    return await database('cancel_feedback').where('user_id', userId).orderBy('created_at', 'desc')
  } catch (error) {
    console.error('Error fetching cancel feedback:', error)
    throw error
  }
}

export const getAllCancelFeedback = async () => {
  try {
    return await database('cancel_feedback').orderBy('created_at', 'desc')
  } catch (error) {
    console.error('Error fetching all cancel feedback:', error)
    throw error
  }
}
