import { combineResolvers } from 'graphql-resolvers'
import { GraphQLError } from 'graphql'

import { 
  createQuoteRequest, 
  createMeetingRequest,
  getUserQuoteRequests,
  getUserMeetingRequests,
  QuoteRequestData,
  MeetingRequestData
} from '../../repository/serviceRequest.repository'
import { isAuthenticated } from './authorization.resolver'

type CreateQuoteRequestInput = {
  input: {
    projectName: string
    projectType: string
    projectDetails: string
    frequency?: string
    projectLinks: string[]
  }
}

type CreateMeetingRequestInput = {
  input: {
    fullName: string
    email: string
    countryCode: string
    phoneNumber: string
    requestedService: string
    message: string
  }
}

const serviceRequestResolvers = {
  Query: {
    getUserQuoteRequests: combineResolvers(
      isAuthenticated,
      async (_: unknown, __: unknown, { user }) => {
        try {
          console.log('📊 Fetching quote requests for user:', user?.id)
          
          if (!user || !user.id) {
            throw new GraphQLError('User not authenticated', {
              extensions: { code: 'UNAUTHENTICATED' },
            })
          }
          
          const requests = await getUserQuoteRequests(user.id)
          console.log('✅ Successfully fetched quote requests:', requests?.length || 0)
          return requests
        } catch (error: any) {
          console.error('❌ Error fetching quote requests:', {
            message: error.message,
            stack: error.stack,
            userId: user?.id,
          })
          throw new GraphQLError(error.message || 'Failed to fetch quote requests', {
            extensions: { 
              code: 'FETCH_QUOTE_REQUESTS_ERROR',
              originalError: error.message,
            },
          })
        }
      }
    ),
    
    getUserMeetingRequests: combineResolvers(
      isAuthenticated,
      async (_: unknown, __: unknown, { user }) => {
        try {
          return await getUserMeetingRequests(user.id)
        } catch (error) {
          console.error('Error fetching meeting requests:', error)
          throw new GraphQLError('Failed to fetch meeting requests', {
            extensions: { code: 'FETCH_MEETING_REQUESTS_ERROR' },
          })
        }
      }
    ),
  },

  Mutation: {
    createQuoteRequest: combineResolvers(
      isAuthenticated,
      async (_: unknown, { input }: CreateQuoteRequestInput, { user }) => {
        try {
          const quoteData: QuoteRequestData = {
            user_id: user.id,
            project_name: input.projectName,
            project_type: input.projectType,
            project_details: input.projectDetails,
            frequency: input.frequency,
            project_links: input.projectLinks,
          }

          await createQuoteRequest(quoteData)

          return {
            success: true,
            message: 'Quote request submitted successfully! We will review it and get back to you soon.',
          }
        } catch (error) {
          console.error('Error creating quote request:', error)
          throw new GraphQLError('Failed to submit quote request', {
            extensions: { code: 'CREATE_QUOTE_REQUEST_ERROR' },
          })
        }
      }
    ),

    createMeetingRequest: combineResolvers(
      isAuthenticated,
      async (_: unknown, { input }: CreateMeetingRequestInput, { user }) => {
        try {
          const meetingData: MeetingRequestData = {
            user_id: user.id,
            full_name: input.fullName,
            email: input.email,
            country_code: input.countryCode,
            phone_number: input.phoneNumber,
            requested_service: input.requestedService,
            message: input.message,
          }

          await createMeetingRequest(meetingData)

          return {
            success: true,
            message: 'Meeting request submitted successfully! We will contact you soon to schedule a meeting.',
          }
        } catch (error) {
          console.error('Error creating meeting request:', error)
          throw new GraphQLError('Failed to submit meeting request', {
            extensions: { code: 'CREATE_MEETING_REQUEST_ERROR' },
          })
        }
      }
    ),
  },
}

export default serviceRequestResolvers

