import { gql } from '@apollo/client';

export default gql`
  mutation TranslateStatement(
    $content: String!
    $targetLanguage: String!
    $languageCode: String!
    $context: String
  ) {
    translateStatement(
      content: $content
      targetLanguage: $targetLanguage
      languageCode: $languageCode
      context: $context
    ) {
      success
      translatedContent
      error
      languageCode
      cached
    }
  }
`;