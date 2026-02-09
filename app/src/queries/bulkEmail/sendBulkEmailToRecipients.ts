import { gql } from '@apollo/client'

export const SEND_BULK_EMAIL_TO_RECIPIENTS = gql`
  mutation SendBulkEmailToRecipients(
    $recipientIds: [Int!]!
    $subject: String!
    $htmlContent: String!
  ) {
    sendBulkEmailToRecipients(
      recipientIds: $recipientIds
      subject: $subject
      htmlContent: $htmlContent
    ) {
      success
      message
      sentCount
      failedCount
    }
  }
`
