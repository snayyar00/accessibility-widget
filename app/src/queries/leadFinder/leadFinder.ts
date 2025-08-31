import { gql } from '@apollo/client';

// Lead Fragments
export const LEAD_FRAGMENT = gql`
  fragment LeadFragment on Lead {
    id
    googlePlaceId
    businessName
    website
    address
    phone
    category
    locationLat
    locationLng
    source
    createdAt
    emails {
      email
      type
      confidence
      firstName
      lastName
      status
      verified
    }
  }
`;

export const EMAIL_FRAGMENT = gql`
  fragment EmailFragment on Email {
    email
    type
    confidence
    firstName
    lastName
    status
    verified
  }
`;

// Queries
export const SEARCH_LEADS = gql`
  ${LEAD_FRAGMENT}
  query SearchLeads($input: LeadSearchInput!) {
    searchLeads(input: $input) {
      leads {
        ...LeadFragment
      }
      totalCount
      nextPageToken
      searchParams {
        category
        location
        radius
        maxResults
      }
    }
  }
`;

export const GET_USER_LEADS = gql`
  ${LEAD_FRAGMENT}
  query GetUserLeads($limit: Int, $offset: Int) {
    getUserLeads(limit: $limit, offset: $offset) {
      ...LeadFragment
    }
  }
`;

export const GET_LEAD = gql`
  ${LEAD_FRAGMENT}
  query GetLead($id: ID!) {
    getLead(id: $id) {
      ...LeadFragment
    }
  }
`;

export const GET_SEARCH_HISTORY = gql`
  query GetSearchHistory($limit: Int) {
    getSearchHistory(limit: $limit) {
      id
      category
      location
      radius
      resultsCount
      createdAt
    }
  }
`;

export const GET_SERVICE_STATUS = gql`
  query GetServiceStatus {
    getServiceStatus {
      googlePlaces
      zeroBounce
      apollo
      credits
      overallHealth
    }
  }
`;

export const GET_LEAD_COUNT_OPTIONS = gql`
  query GetLeadCountOptions {
    getLeadCountOptions {
      value
      label
      recommended
    }
  }
`;

export const SEARCH_AND_ENRICH_LEADS = gql`
  ${LEAD_FRAGMENT}
  query SearchAndEnrichLeads($input: EnrichedLeadSearchInput!) {
    searchAndEnrichLeads(input: $input) {
      enrichedLeads {
        ...LeadFragment
        apolloContacts {
          id
          firstName
          lastName
          fullName
          email
          emailStatus
          phoneNumber
          linkedinUrl
          title
          seniority
          department
          company {
            name
            domain
            industry
            size
            location
            linkedinUrl
          }
          location {
            city
            state
            country
          }
        }
        decisionMakers {
          name
          title
          email
          phone
          linkedinUrl
          seniority
          department
        }
        companySize
        industry
        linkedinUrl
        enrichmentSources
        enrichedAt
        dataConfidence
      }
      totalProcessed
      successfulEnrichments
      apolloSearches
      emailsFound
      costEstimate {
        apolloCost
        zeroBounceCredits
        totalEstimate
      }
      processingTime
    }
  }
`;

export const EXPORT_LEADS = gql`
  query ExportLeads($leadIds: [ID!]!, $format: String!) {
    exportLeads(leadIds: $leadIds, format: $format) {
      content
      filename
      mimeType
    }
  }
`;

// Mutations
export const FIND_EMAIL = gql`
  mutation FindEmail($input: EmailDiscoveryInput!) {
    findEmail(input: $input) {
      email
      type
      confidence
      status
      verified
      firstName
      lastName
    }
  }
`;

export const SAVE_LEAD = gql`
  ${LEAD_FRAGMENT}
  mutation SaveLead($input: SaveLeadInput!) {
    saveLead(input: $input) {
      ...LeadFragment
    }
  }
`;

export const UPDATE_LEAD = gql`
  ${LEAD_FRAGMENT}
  mutation UpdateLead($id: ID!, $input: SaveLeadInput!) {
    updateLead(id: $id, input: $input) {
      ...LeadFragment
    }
  }
`;

export const DELETE_LEAD = gql`
  mutation DeleteLead($id: ID!) {
    deleteLead(id: $id)
  }
`;

export const BULK_FIND_EMAILS = gql`
  mutation BulkFindEmails($input: BulkEmailDiscoveryInput!) {
    bulkFindEmails(input: $input) {
      email
      type
      confidence
      status
      verified
      firstName
      lastName
    }
  }
`;

export const GENERATE_LEAD_REPORT = gql`
  mutation GenerateLeadReport($leadId: ID!) {
    generateLeadReport(leadId: $leadId)
  }
`;

export const CLEAR_SEARCH_HISTORY = gql`
  mutation ClearSearchHistory {
    clearSearchHistory
  }
`;

// Subscriptions
export const EMAIL_DISCOVERY_PROGRESS = gql`
  subscription EmailDiscoveryProgress($userId: Int!) {
    emailDiscoveryProgress(userId: $userId) {
      email
      type
      confidence
      status
      verified
      firstName
      lastName
    }
  }
`;

export const BULK_OPERATION_PROGRESS = gql`
  subscription BulkOperationProgress($userId: Int!) {
    bulkOperationProgress(userId: $userId)
  }
`;