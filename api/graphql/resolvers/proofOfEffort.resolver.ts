import { Request } from 'express'
import { GraphQLError } from 'graphql'
import { combineResolvers } from 'graphql-resolvers'

import { sendProofOfEffortToolkit } from '../../controllers/proof-of-effort.controller'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'
import { GraphQLContext } from '../types'

const proofOfEffortResolvers = {
  Mutation: {
    sendProofOfEffortToolkit: combineResolvers(
      allowedOrganization,
      isAuthenticated,
      async (_: any, args: { input: { email: string; domain: string; zipFileBase64: string; reportDate?: string } }, context: GraphQLContext) => {
        try {
          const { req, user } = context

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
          // So the controller can use org SMTP: it reads req.user.current_organization_id
          ;(req as Request & { user?: typeof user }).user = user ?? undefined

          // Call the controller function
          await sendProofOfEffortToolkit(req, mockRes)

          if (responseStatus === 200 && responseData?.success) {
            return {
              success: true,
              message: responseData.message,
            }
          } else {
            throw new GraphQLError(responseData?.message || 'Failed to send toolkit', {
              extensions: { code: 'SEND_TOOLKIT_ERROR' },
            })
          }
        } catch (error) {
          if (error instanceof GraphQLError) throw error
          console.error('Error in sendProofOfEffortToolkit resolver:', error)
          throw new GraphQLError('Failed to send proof of effort toolkit', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          })
        }
      },
    ),
  },
}

export default proofOfEffortResolvers
