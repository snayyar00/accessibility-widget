import { gql } from 'apollo-server-express';

export const TranslationSchema = gql`
  input TranslationContentInput {
    title: String!
    general: String!
    measures: String!
    conformance: String!
    technical: String!
    assessment: String!
    widget: String!
    profiles: String!
    features: String!
    feedback: String!
    compatibility: String!
    limitations: String!
    compliance: String!
    approval: String!
    generated: String!
    commitment: String!
    belief: String!
    accessible: String!
    orgMeasures: String!
    techMeasures: String!
    aboutStatement: String!
    takesComprehensive: String!
    orgMeasuresList: String!
    techMeasuresList: String!
    techIntro: String!
    techList: String!
    techNote: String!
    assessmentIntro: String!
    assessmentBy: String!
    automatedTesting: String!
    automatedList: String!
    manualTesting: String!
    manualList: String!
    userTesting: String!
    userList: String!
    widgetIntro: String!
    profilesIntro: String!
    profilesList: String!
    featuresIntro: String!
    featuresList: String!
    feedbackIntro: String!
    feedbackNote: String!
    contactInfo: String!
    contactList: String!
    responseTime: String!
    compatibilityIntro: String!
    wcagDescription: String!
    fullyConformant: String!
    complianceList: String!
  }

  type TranslationContent {
    title: String!
    general: String!
    measures: String!
    conformance: String!
    technical: String!
    assessment: String!
    widget: String!
    profiles: String!
    features: String!
    feedback: String!
    compatibility: String!
    limitations: String!
    compliance: String!
    approval: String!
    generated: String!
    commitment: String!
    belief: String!
    accessible: String!
    orgMeasures: String!
    techMeasures: String!
    aboutStatement: String!
    takesComprehensive: String!
    orgMeasuresList: String!
    techMeasuresList: String!
    techIntro: String!
    techList: String!
    techNote: String!
    assessmentIntro: String!
    assessmentBy: String!
    automatedTesting: String!
    automatedList: String!
    manualTesting: String!
    manualList: String!
    userTesting: String!
    userList: String!
    widgetIntro: String!
    profilesIntro: String!
    profilesList: String!
    featuresIntro: String!
    featuresList: String!
    feedbackIntro: String!
    feedbackNote: String!
    contactInfo: String!
    contactList: String!
    responseTime: String!
    compatibilityIntro: String!
    wcagDescription: String!
    fullyConformant: String!
    complianceList: String!
  }

  type TranslationResponse {
    success: Boolean!
    translatedContent: String
    error: String
    languageCode: String!
  }

  extend type Mutation {
    translateStatement(
      content: String!
      targetLanguage: String!
      languageCode: String!
      context: String
    ): TranslationResponse!
  }
`;