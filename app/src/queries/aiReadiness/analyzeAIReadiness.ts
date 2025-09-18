import { gql } from '@apollo/client';

export const ANALYZE_AI_READINESS = gql`
  mutation AnalyzeAIReadiness($url: String!) {
    analyzeAIReadiness(url: $url) {
      success
      url
      overallScore
      checks {
        id
        label
        status
        score
        details
        recommendation
      }
      htmlContent
      metadata {
        title
        description
        analyzedAt
      }
    }
  }
`;

export default ANALYZE_AI_READINESS;
