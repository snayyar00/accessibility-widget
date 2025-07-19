import { combineResolvers } from 'graphql-resolvers'

import { translateStatement } from '../../services/translation/translation.service'
import { validateTranslateStatement } from '../../validations/translateStatement.validation'
import { isAuthenticated } from './authorization.resolver'

interface TranslationContentInput {
  [key: string]: string
}

interface TranslateStatementArgs {
  content: TranslationContentInput | string
  targetLanguage: string
  languageCode: string
  context?: string
}

const resolvers = {
  Mutation: {
    translateStatement: combineResolvers(isAuthenticated, async (_: unknown, { content, targetLanguage, languageCode, context }: TranslateStatementArgs) => {
      const validateResult = validateTranslateStatement({ content, targetLanguage, languageCode, context })

      if (Array.isArray(validateResult) && validateResult.length) {
        throw new Error(validateResult.map((it) => it.message).join(','))
      }

      try {
        const result = await translateStatement({
          content,
          targetLanguage,
          languageCode,
          context,
        })

        return result
      } catch (error) {
        console.error('Translation resolver error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Translation failed',
          languageCode,
        }
      }
    }),
  },
}

export default resolvers
