import { translateStatement } from '~/services/translation/translation.service';

interface TranslationContentInput {
  [key: string]: string;
}

interface TranslateStatementArgs {
  content: TranslationContentInput | string;
  targetLanguage: string;
  languageCode: string;
  context?: string;
}

const resolvers = {
  Mutation: {
    translateStatement: async (
      _: unknown,
      { content, targetLanguage, languageCode, context }: TranslateStatementArgs
    ) => {
      try {
        const result = await translateStatement({
          content,
          targetLanguage,
          languageCode,
          context
        });

        return result;
      } catch (error) {
        console.error('Translation resolver error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Translation failed',
          languageCode,
          cached: false
        };
      }
    }
  }
};

export default resolvers;