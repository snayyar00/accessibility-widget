import { gql } from '@apollo/client'

export const SAVE_BULK_EMAIL_RECIPIENTS = gql`
  mutation SaveBulkEmailRecipients($recipients: [BulkEmailRecipientInput!]!) {
    saveBulkEmailRecipients(recipients: $recipients) {
      success
      message
      insertedCount
    }
  }
`
