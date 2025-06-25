import { gql } from '@apollo/client';

export default gql`
  mutation TranslateStatement(
    $content: TranslationContentInput!
    $targetLanguage: String!
    $languageCode: String!
  ) {
    translateStatement(
      content: $content
      targetLanguage: $targetLanguage
      languageCode: $languageCode
    ) {
      success
      translatedContent {
        title
        general
        measures
        conformance
        technical
        assessment
        widget
        profiles
        features
        feedback
        compatibility
        limitations
        compliance
        approval
        generated
        commitment
        belief
        accessible
        orgMeasures
        techMeasures
        aboutStatement
        takesComprehensive
        orgMeasuresList
        techMeasuresList
        techIntro
        techList
        techNote
        assessmentIntro
        assessmentBy
        automatedTesting
        automatedList
        manualTesting
        manualList
        userTesting
        userList
        widgetIntro
        profilesIntro
        profilesList
        featuresIntro
        featuresList
        feedbackIntro
        feedbackNote
        contactInfo
        contactList
        responseTime
        compatibilityIntro
        wcagDescription
        fullyConformant
        complianceList
      }
      error
      languageCode
      cached
    }
  }
`;