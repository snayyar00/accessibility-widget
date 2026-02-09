import { Request } from 'express'
import { GraphQLError } from 'graphql'

import { sendBulkEmail, sendBulkEmailToRecipients } from '../../controllers/bulk-email.controller'
import {
  insertBulkEmailRecipients,
  getBulkEmailRecipients,
} from '../../repository/bulk_email_recipients.repository'

const bulkEmailResolvers = {
  Query: {
    bulkEmailRecipients: async (
      _: any,
      args: { filter?: { emailSent?: boolean; search?: string } },
    ) => {
      try {
        const filter = args.filter
          ? {
              emailSent: args.filter.emailSent,
              search: args.filter.search ?? undefined,
            }
          : undefined
        const rows = await getBulkEmailRecipients(filter)
        return rows.map((r) => ({
          id: r.id,
          username: r.username,
          email: r.email,
          emailSent: !!r.email_sent,
          createdAt: r.created_at ?? null,
          sentAt: r.sent_at ?? null,
        }))
      } catch (error: any) {
        console.error('Error in bulkEmailRecipients query:', error)
        throw new GraphQLError(error?.message || 'Failed to fetch bulk email recipients', {
          extensions: { code: 'BULK_EMAIL_RECIPIENTS_ERROR' },
        })
      }
    },
  },
  Mutation: {
    saveBulkEmailRecipients: async (
      _: any,
      args: { recipients: Array<{ username: string; email: string }> },
    ) => {
      try {
        const { recipients } = args
        if (!recipients?.length) {
          return {
            success: false,
            message: 'No recipients provided',
            insertedCount: 0,
          }
        }
        const insertedCount = await insertBulkEmailRecipients(recipients)
        return {
          success: true,
          message: `Saved ${insertedCount} recipient(s) to the database`,
          insertedCount,
        }
      } catch (error: any) {
        console.error('Error in saveBulkEmailRecipients resolver:', error)
        throw new GraphQLError(error?.message || 'Failed to save bulk email recipients', {
          extensions: { code: 'SAVE_BULK_EMAIL_RECIPIENTS_ERROR' },
        })
      }
    },
    sendBulkEmail: async (
      _: any,
      args: { input: { recipients: string[]; subject: string; htmlContent: string } },
      context: { req: Request },
    ) => {
      try {
        const { req } = context

        // Create a mock response object for the controller
        let responseData: any = null
        let responseStatus = 200

        const mockRes = {
          status: (code: number) => {
            responseStatus = code
            return mockRes
          },
          json: (data: any) => {
            responseData = data
            return mockRes
          },
        } as any

        // Set the request body with the input data
        req.body = args.input

        // Call the controller function
        await sendBulkEmail(req, mockRes)

        if (responseStatus === 200 && responseData?.success) {
          return {
            success: true,
            message: responseData.message,
            sentCount: responseData.sentCount,
            failedCount: responseData.failedCount,
          }
        } else {
          throw new GraphQLError(responseData?.message || 'Failed to send bulk email', {
            extensions: { code: 'SEND_BULK_EMAIL_ERROR' },
          })
        }
      } catch (error: any) {
        console.error('Error in sendBulkEmail resolver:', error)
        if (error instanceof GraphQLError) {
          throw error
        }
        throw new GraphQLError('Failed to send bulk email', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }
    },
    sendBulkEmailToRecipients: async (
      _: any,
      args: { recipientIds: number[]; subject: string; htmlContent: string },
      context: { req: Request },
    ) => {
      try {
        const { req } = context
        let responseData: any = null
        let responseStatus = 200
        const mockRes = {
          status: (code: number) => {
            responseStatus = code
            return mockRes
          },
          json: (data: any) => {
            responseData = data
            return mockRes
          },
        } as any
        req.body = {
          recipientIds: args.recipientIds,
          subject: args.subject,
          htmlContent: args.htmlContent,
        }
        await sendBulkEmailToRecipients(req, mockRes)
        if (responseStatus === 200 && responseData?.success) {
          return {
            success: true,
            message: responseData.message,
            sentCount: responseData.sentCount,
            failedCount: responseData.failedCount,
          }
        }
        throw new GraphQLError(responseData?.message || 'Failed to send emails to recipients', {
          extensions: { code: 'SEND_BULK_EMAIL_TO_RECIPIENTS_ERROR' },
        })
      } catch (error: any) {
        console.error('Error in sendBulkEmailToRecipients resolver:', error)
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError(error?.message || 'Failed to send emails to recipients', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }
    },
  },
}

export default bulkEmailResolvers

