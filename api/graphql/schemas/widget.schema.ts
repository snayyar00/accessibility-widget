export const widgetTypeDefs = `#graphql
  type WidgetInstallationResponse {
    success: Boolean!
    message: String!
  }

  input SendWidgetInstallationInput {
    email: String!
    code: String!
    position: String!
    language: String!
    languageName: String!
  }

  extend type Mutation {
    sendWidgetInstallationInstructions(
      email: String!
      code: String!
      position: String!
      language: String!
      languageName: String!
    ): WidgetInstallationResponse! @rateLimit(limit: 5, duration: 3600, message: "Too many widget installation email requests. Please try again later.")
  }
` 