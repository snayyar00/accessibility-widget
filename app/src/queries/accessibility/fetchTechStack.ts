import { gql } from 'graphql.macro';

const FETCH_TECH_STACK = gql`
  query fetchTechStack($url: String!) {
    fetchTechStack(url: $url) {
      technologies
      categorizedTechnologies {
        category
        technologies
      }
      confidence
      accessibilityContext {
        platform
        platform_type
      }
      analyzedUrl
      analyzedAt
    }
  }
`;

export default FETCH_TECH_STACK;