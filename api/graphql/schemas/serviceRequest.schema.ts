const serviceRequestSchema = `
  type QuoteRequest {
    id: Int!
    user_id: Int!
    project_name: String!
    project_type: String!
    project_details: String!
    frequency: String
    project_links: [String!]!
    report_link: String
    status: String!
    created_at: Date!
    updated_at: Date!
  }

  type MeetingRequest {
    id: Int!
    user_id: Int!
    full_name: String!
    email: String!
    country_code: String!
    phone_number: String!
    requested_service: String!
    message: String!
    status: String!
    meeting_scheduled_at: Date
    meeting_notes: String
    created_at: Date!
    updated_at: Date!
  }

  type ServiceRequestResponse {
    success: Boolean!
    message: String!
  }

  input CreateQuoteRequestInput {
    projectName: String!
    projectType: String!
    projectDetails: String!
    frequency: String
    projectLinks: [String!]!
  }

  input CreateMeetingRequestInput {
    fullName: String!
    email: String!
    countryCode: String!
    phoneNumber: String!
    requestedService: String!
    message: String!
  }

  extend type Query {
    getUserQuoteRequests: [QuoteRequest!]!
    getUserMeetingRequests: [MeetingRequest!]!
  }

  extend type Mutation {
    createQuoteRequest(input: CreateQuoteRequestInput!): ServiceRequestResponse!
    createMeetingRequest(input: CreateMeetingRequestInput!): ServiceRequestResponse!
  }
`

export default serviceRequestSchema

