import { translateStatement } from '~/services/translation/translation.service';

interface TranslationContentInput {
  [key: string]: string;
}

interface TranslateStatementArgs {
  content: TranslationContentInput;
  targetLanguage: string;
  languageCode: string;
}

const resolvers = {
  Mutation: {
    translateStatement: async (
      _: unknown,
      { content, targetLanguage, languageCode }: TranslateStatementArgs
    ) => {
      try {
        const result = await translateStatement({
          content,
          targetLanguage,
          languageCode
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