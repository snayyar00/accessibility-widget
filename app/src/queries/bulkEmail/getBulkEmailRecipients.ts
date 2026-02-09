import { gql } from '@apollo/client'

export const GET_BULK_EMAIL_RECIPIENTS = gql`
  query GetBulkEmailRecipients($filter: BulkEmailRecipientsFilter) {
    bulkEmailRecipients(filter: $filter) {
      id
      username
      email
      emailSent
      createdAt
      sentAt
    }
  }
`
