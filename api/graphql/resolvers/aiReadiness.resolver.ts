import { aiReadinessService } from '../../services/ai-readiness.service'

export const aiReadinessResolvers = {
  Mutation: {
    analyzeAIReadiness: async (_: any, { url }: { url: string }) => {
      try {
        const result = await aiReadinessService.analyzeWebsite(url)
        return result
      } catch (error) {
        console.error('GraphQL AI Readiness analysis error:', error)
        throw new Error('Failed to analyze website for AI readiness')
      }
    },
  },
}
