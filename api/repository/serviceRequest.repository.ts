import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { sendMail } from '../services/email/email.service'

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
  
  // Send email notification
  try {
    const emailSubject = '🎯 New Quote Request Received'
    const emailHtml = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .field {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #eee;
            }
            .label {
              font-weight: bold;
              color: #667eea;
              margin-bottom: 5px;
            }
            .value {
              color: #555;
            }
            .links {
              background: #f0f4ff;
              padding: 10px;
              border-radius: 5px;
              margin-top: 10px;
            }
            .link-item {
              color: #667eea;
              text-decoration: none;
              display: block;
              margin: 5px 0;
            }
            .badge {
              display: inline-block;
              padding: 5px 10px;
              background: #ffc107;
              color: #333;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Quote Request</h1>
              <p>A new service quote request has been submitted</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">📋 Project Name:</div>
                <div class="value">${data.project_name}</div>
              </div>
              
              <div class="field">
                <div class="label">🏷️ Project Type:</div>
                <div class="value">${data.project_type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</div>
              </div>
              
              <div class="field">
                <div class="label">📝 Project Details:</div>
                <div class="value">${data.project_details}</div>
              </div>
              
              ${data.frequency ? `
              <div class="field">
                <div class="label">🔄 Frequency:</div>
                <div class="value">${data.frequency}</div>
              </div>
              ` : ''}
              
              <div class="field">
                <div class="label">🔗 Project Links:</div>
                <div class="links">
                  ${data.project_links.map(link => `<a href="${link}" class="link-item" target="_blank">${link}</a>`).join('')}
                </div>
              </div>
              
              <div class="field">
                <div class="label">👤 User ID:</div>
                <div class="value">${data.user_id}</div>
              </div>
              
              <div class="field">
                <div class="label">📊 Status:</div>
                <div class="value"><span class="badge">PENDING</span></div>
              </div>
              
              <p style="margin-top: 30px; color: #777; font-size: 12px;">
                This is an automated notification from WebAbility Service Requests system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `
    
    await sendMail('support@webability.io', emailSubject, emailHtml)
    console.log('✅ Quote request email notification sent')
  } catch (emailError) {
    console.error('❌ Failed to send quote request email:', emailError)
    // Don't throw error - we don't want to fail the request if email fails
  }
  
  return id
}

export async function createMeetingRequest(data: MeetingRequestData) {
  const [id] = await database(TABLES.serviceMeetingRequests).insert({
    ...data,
    status: 'pending',
  })
  
  // Send email notification
  try {
    const emailSubject = '📅 New Meeting Request Received'
    const emailHtml = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .field {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #eee;
            }
            .label {
              font-weight: bold;
              color: #4facfe;
              margin-bottom: 5px;
            }
            .value {
              color: #555;
            }
            .badge {
              display: inline-block;
              padding: 5px 10px;
              background: #4facfe;
              color: white;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
            }
            .contact-info {
              background: #f0f9ff;
              padding: 15px;
              border-radius: 5px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 New Meeting Request</h1>
              <p>A new meeting booking request has been submitted</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">👤 Full Name:</div>
                <div class="value">${data.full_name}</div>
              </div>
              
              <div class="field">
                <div class="label">📧 Email:</div>
                <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
              </div>
              
              <div class="field">
                <div class="label">📱 Phone Number:</div>
                <div class="value">${data.country_code} ${data.phone_number}</div>
              </div>
              
              <div class="field">
                <div class="label">🛠️ Requested Service:</div>
                <div class="value">${data.requested_service.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</div>
              </div>
              
              <div class="field">
                <div class="label">💬 Message:</div>
                <div class="value">${data.message}</div>
              </div>
              
              <div class="field">
                <div class="label">👤 User ID:</div>
                <div class="value">${data.user_id}</div>
              </div>
              
              <div class="field">
                <div class="label">📊 Status:</div>
                <div class="value"><span class="badge">PENDING</span></div>
              </div>
              
              <div class="contact-info">
                <strong>📞 Quick Contact:</strong><br>
                Email: <a href="mailto:${data.email}">${data.email}</a><br>
                Phone: <a href="tel:${data.country_code}${data.phone_number}">${data.country_code} ${data.phone_number}</a>
              </div>
              
              <p style="margin-top: 30px; color: #777; font-size: 12px;">
                This is an automated notification from WebAbility Service Requests system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `
    
    await sendMail('support@webability.io', emailSubject, emailHtml)
    console.log('✅ Meeting request email notification sent')
  } catch (emailError) {
    console.error('❌ Failed to send meeting request email:', emailError)
    // Don't throw error - we don't want to fail the request if email fails
  }
  
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

