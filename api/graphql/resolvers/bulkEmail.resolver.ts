import { Request } from 'express'
import { GraphQLError } from 'graphql'

import { sendBulkEmail } from '../../controllers/bulk-email.controller'

const bulkEmailResolvers = {
  Mutation: {
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
  },
}

export default bulkEmailResolvers

