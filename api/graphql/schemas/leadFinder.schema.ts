export const leadFinderTypeDefs = `#graphql
  # Lead Finder Types
  type Lead {
    id: ID!
    googlePlaceId: String
    businessName: String!
    website: String
    address: String
    phone: String
    category: String
    locationLat: Float
    locationLng: Float
    emails: [Email!]
    source: String!
    userId: Int!
    organizationId: Int
    createdAt: String
    updatedAt: String
    # Apollo.io enrichment data
    apolloContacts: [ApolloContact]
    decisionMakers: [DecisionMaker]
    companySize: String
    industry: String
    linkedinUrl: String
    # Enrichment metadata
    enrichmentSources: [String!]
    enrichedAt: String
    dataConfidence: Float
  }

  type Email {
    email: String!
    type: EmailType!
    confidence: Float!
    firstName: String
    lastName: String
    status: EmailStatus
    verified: Boolean
    source: String
  }

  type ApolloContact {
    id: String!
    firstName: String!
    lastName: String!
    fullName: String!
    email: String
    emailStatus: String
    phoneNumber: String
    linkedinUrl: String
    title: String!
    seniority: String
    department: String
    company: ApolloCompany!
    location: ContactLocation
  }

  type ApolloCompany {
    name: String!
    domain: String
    industry: String
    size: String
    location: String
    linkedinUrl: String
  }

  type ContactLocation {
    city: String
    state: String
    country: String
  }

  type DecisionMaker {
    name: String!
    title: String!
    email: String
    phone: String
    linkedinUrl: String
    seniority: String
    department: String
  }

  enum EmailType {
    PERSONAL
    GENERIC
  }

  enum EmailStatus {
    VALID
    INVALID
    CATCH_ALL
    UNKNOWN
    SPAMTRAP
    ABUSE
    DO_NOT_MAIL
  }

  type LeadSearchResult {
    leads: [Lead!]!
    totalCount: Int!
    nextPageToken: String
    searchParams: SearchParams!
  }

  type SearchParams {
    category: String!
    location: String!
    radius: Int
    maxResults: Int
  }

  type EmailDiscoveryResult {
    email: String!
    type: EmailType!
    confidence: Float!
    status: EmailStatus!
    verified: Boolean!
    firstName: String
    lastName: String
  }

  type LeadSearchHistory {
    id: ID!
    category: String!
    location: String!
    radius: Int
    resultsCount: Int!
    createdAt: String!
  }

  type ServiceStatus {
    googlePlaces: Boolean!
    zeroBounce: Boolean!
    apollo: Boolean!
    credits: Int
    overallHealth: Boolean!
  }

  type EnrichmentResult {
    enrichedLeads: [Lead!]!
    totalProcessed: Int!
    successfulEnrichments: Int!
    apolloSearches: Int!
    emailsFound: Int!
    costEstimate: CostEstimate!
    processingTime: Int!
  }

  type CostEstimate {
    apolloCost: Float!
    zeroBounceCredits: Int!
    totalEstimate: Float!
  }

  type LeadCountOption {
    value: Int!
    label: String!
    recommended: Boolean
  }

  type ExportResult {
    content: String!
    filename: String!
    mimeType: String!
  }

  # Input Types
  input LeadSearchInput {
    category: String!
    location: String!
    radius: Int
    maxResults: Int
  }

  input EnrichedLeadSearchInput {
    category: String!
    location: String!
    radius: Int
    maxResults: Int
    includeApolloData: Boolean
    includeEmailDiscovery: Boolean
    maxContactsPerLead: Int
    targetJobTitles: [String!]
    minConfidence: Int
  }

  input EnrichmentOptionsInput {
    includeApolloData: Boolean
    includeEmailDiscovery: Boolean
    apolloOnly: Boolean # If true, skip ZeroBounce to save costs
    maxContactsPerLead: Int
    targetJobTitles: [String!]
    minConfidence: Int
  }

  input EmailDiscoveryInput {
    domain: String!
    firstName: String
    lastName: String
  }

  input SaveLeadInput {
    googlePlaceId: String
    businessName: String!
    website: String
    address: String
    phone: String
    category: String
    locationLat: Float
    locationLng: Float
    emails: [EmailInput!]
  }

  input EmailInput {
    email: String!
    type: EmailType!
    confidence: Float!
    firstName: String
    lastName: String
  }

  input BulkEmailDiscoveryInput {
    leads: [LeadEmailDiscoveryInput!]!
  }

  input LeadEmailDiscoveryInput {
    leadId: ID!
    domain: String!
    firstName: String
    lastName: String
  }

  # Queries
  extend type Query {
    # Search for businesses/leads
    searchLeads(input: LeadSearchInput!): LeadSearchResult!
    
    # Get saved leads for current user
    getUserLeads(limit: Int, offset: Int): [Lead!]!
    
    # Get lead by ID
    getLead(id: ID!): Lead
    
    # Get search history
    getSearchHistory(limit: Int): [LeadSearchHistory!]!
    
    # Check service status
    getServiceStatus: ServiceStatus!
    
    # Export leads
    exportLeads(leadIds: [ID!]!, format: String!): ExportResult!
    
    # Get lead count options for UI
    getLeadCountOptions: [LeadCountOption!]!
    
    # Enhanced search with enrichment
    searchAndEnrichLeads(input: EnrichedLeadSearchInput!): EnrichmentResult!
  }

  # Mutations
  extend type Mutation {
    # Find email for a domain
    findEmail(input: EmailDiscoveryInput!): EmailDiscoveryResult
    
    # Save a lead
    saveLead(input: SaveLeadInput!): Lead!
    
    # Update lead
    updateLead(id: ID!, input: SaveLeadInput!): Lead!
    
    # Delete lead
    deleteLead(id: ID!): Boolean!
    
    # Bulk email discovery
    bulkFindEmails(input: BulkEmailDiscoveryInput!): [EmailDiscoveryResult!]!
    
    # Generate accessibility report for lead
    generateLeadReport(leadId: ID!): String!
    
    # Clear search history
    clearSearchHistory: Boolean!
    
    # Enrich existing leads
    enrichLeads(leadIds: [ID!]!, options: EnrichmentOptionsInput): EnrichmentResult!
    
    # Estimate enrichment cost
    estimateEnrichmentCost(leadCount: Int!, options: EnrichmentOptionsInput): CostEstimate!
  }

  # Subscriptions (for real-time updates)
  extend type Subscription {
    # Email discovery progress
    emailDiscoveryProgress(userId: Int!): EmailDiscoveryResult!
    
    # Bulk operation progress
    bulkOperationProgress(userId: Int!): String!
  }
`;