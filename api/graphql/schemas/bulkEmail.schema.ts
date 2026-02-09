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

  type SaveBulkEmailRecipientsResponse {
    success: Boolean!
    message: String!
    insertedCount: Int!
  }

  input BulkEmailRecipientInput {
    username: String!
    email: String!
  }

  type BulkEmailRecipient {
    id: Int!
    username: String!
    email: String!
    emailSent: Boolean!
    createdAt: String
    sentAt: String
  }

  input BulkEmailRecipientsFilter {
    emailSent: Boolean
    search: String
  }

  extend type Query {
    bulkEmailRecipients(filter: BulkEmailRecipientsFilter): [BulkEmailRecipient!]!
  }

  extend type Mutation {
    sendBulkEmail(input: SendBulkEmailInput!): SendBulkEmailResponse!
    saveBulkEmailRecipients(recipients: [BulkEmailRecipientInput!]!): SaveBulkEmailRecipientsResponse!
    sendBulkEmailToRecipients(recipientIds: [Int!]!, subject: String!, htmlContent: String!): SendBulkEmailResponse!
  }
`

export default bulkEmailSchema

