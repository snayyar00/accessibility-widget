import { gql } from '@apollo/client'

export const SEND_BULK_EMAIL = gql`
  mutation SendBulkEmail($input: SendBulkEmailInput!) {
    sendBulkEmail(input: $input) {
      success
      message
      sentCount
      failedCount
    }
  }
`

