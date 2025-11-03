const proofOfEffortSchema = `
  type SendToolkitResponse {
    success: Boolean!
    message: String!
  }

  input SendToolkitInput {
    email: String!
    domain: String!
    zipFileBase64: String!
    reportDate: String
  }

  extend type Mutation {
    sendProofOfEffortToolkit(input: SendToolkitInput!): SendToolkitResponse!
  }
`

export default proofOfEffortSchema
