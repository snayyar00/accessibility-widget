import { aiReadinessService } from '../../services/ai-readiness.service'

export const aiReadinessResolvers = {
  Mutation: {
    analyzeAIReadiness: async (_: any, { url }: { url: string }) => {
      try {
        const result = await aiReadinessService.analyzeWebsite(url)
        return result
      } catch (error) {
        console.error('GraphQL AI Readiness analysis error:', error)

        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            throw new Error('Website took too long to load. Please try a different website or try again later.')
          } else if (error.message.includes('Failed to navigate')) {
            throw new Error('Unable to access the website. Please check if the URL is correct and accessible.')
          } else if (error.message.includes('Invalid URL')) {
            throw new Error('Invalid URL format. Please enter a valid website URL.')
          }
        }

        throw new Error('Failed to analyze website for AI readiness. Please try again later.')
      }
    },
  },
}
