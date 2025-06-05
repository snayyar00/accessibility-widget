import { gql } from 'apollo-server-express';

export const TechStackSchema = gql`
  type CategorizedTechnology {
    category: String!
    technologies: [String!]!
  }

  type AccessibilityContext {
    platform: String
    platform_type: String
    has_cms: Boolean
    has_ecommerce: Boolean
    has_framework: Boolean
    is_spa: Boolean
  }

  type TechStack {
    technologies: [String!]!
    categorizedTechnologies: [CategorizedTechnology!]!
    confidence: String
    confidenceScores: JSON
    accessibilityContext: AccessibilityContext
    analyzedUrl: String!
    analyzedAt: String!
    source: String
  }

  extend type Query {
    fetchTechStack(url: String!): TechStack
  }
`;