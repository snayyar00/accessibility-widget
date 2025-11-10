import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import {
  sendQuoteRequestNotification,
  sendMeetingRequestNotification,
} from '../services/serviceRequests/serviceRequest.email.service'

export interface QuoteRequestData {
  user_id: number
  project_name: string
  project_type: string
  project_details: string
  frequency?: string
  project_links: string[]
}

export interface MeetingRequestData {
  user_id: number
  full_name: string
  email: string
  country_code: string
  phone_number: string
  requested_service: string
  message: string
}

export async function createQuoteRequest(data: QuoteRequestData) {
  const [id] = await database(TABLES.serviceQuoteRequests).insert({
    ...data,
    project_links: JSON.stringify(data.project_links),
    status: 'pending',
  })
  
  // Send email notification using MJML template
  setImmediate(async () => {
    try {
      await sendQuoteRequestNotification({
        userId: data.user_id,
        projectName: data.project_name,
        projectType: data.project_type,
        projectDetails: data.project_details,
        frequency: data.frequency,
        projectLinks: data.project_links,
      })

      console.log('✅ Quote request email notification sent')
    } catch (emailError) {
      console.error('❌ Failed to send quote request email:', emailError)
      // Don't throw error - we don't want to fail the request if email fails
    }
  })

  return id
}

export async function createMeetingRequest(data: MeetingRequestData) {
  const [id] = await database(TABLES.serviceMeetingRequests).insert({
    ...data,
    status: 'pending',
  })
  
  // Send email notification using MJML template
  setImmediate(async () => {
    try {
      await sendMeetingRequestNotification({
        userId: data.user_id,
        fullName: data.full_name,
        email: data.email,
        countryCode: data.country_code,
        phoneNumber: data.phone_number,
        requestedService: data.requested_service,
        message: data.message,
      })

      console.log('✅ Meeting request email notification sent')
    } catch (emailError) {
      console.error('❌ Failed to send meeting request email:', emailError)
      // Don't throw error - we don't want to fail the request if email fails
    }
  })

  return id
}

export async function getUserQuoteRequests(userId: number) {
  try {
    console.log('🔍 Querying quote requests for user:', userId)
    console.log('📋 Table name:', TABLES.serviceQuoteRequests)
    
    const requests = await database(TABLES.serviceQuoteRequests)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
    
    console.log('📦 Raw requests from DB:', requests?.length || 0)
    
    // Parse JSON project_links back to array
    const parsedRequests = requests.map(request => ({
      ...request,
      project_links: typeof request.project_links === 'string' 
        ? JSON.parse(request.project_links) 
        : request.project_links,
    }))
    
    return parsedRequests
  } catch (error: any) {
    console.error('❌ Database error in getUserQuoteRequests:', {
      error: error.message,
      userId,
      tableName: TABLES.serviceQuoteRequests,
    })
    throw error
  }
}

export async function getUserMeetingRequests(userId: number) {
  return database(TABLES.serviceMeetingRequests)
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
}

