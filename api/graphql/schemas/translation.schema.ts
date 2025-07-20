export const TranslationSchema = `
  type TranslationResponse {
    success: Boolean!
    translatedContent: String
    error: String
    languageCode: String!
  }

  extend type Mutation {
    translateStatement(content: String!, targetLanguage: String!, languageCode: String!, context: String): TranslationResponse! @rateLimit(limit: 5, duration: 60, message: "Too many translateStatement requests. Please try again later.")
  }
`
