const bulkEmailSchema = `
  type SendBulkEmailResponse {
    success: Boolean!
    message: String!
    sentCount: Int!
    failedCount: Int!
  }

  input SendBulkEmailInput {
    recipients: [String!]!
    subject: String!
    htmlContent: String!
  }

  extend type Mutation {
    sendBulkEmail(input: SendBulkEmailInput!): SendBulkEmailResponse!
  }
`

export default bulkEmailSchema

