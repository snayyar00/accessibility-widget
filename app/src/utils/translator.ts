import axios from 'axios';
interface Issue {
  [key: string]: any;
}


export const LANGUAGES = {
  // en: { code: 'en', name: 'English', nativeName: 'English' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  no: { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  ro: { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  // pl: { code: 'pl', name: 'Polish', nativeName: 'Polski' }
  // ru: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  // ja: { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  // ko: { code: 'ko', name: 'Korean', nativeName: '한국어' },
  // zh: { code: 'zh', name: 'Chinese', nativeName: '中文' },
  // ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  // hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  // th: { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  // vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  // tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' }

} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export const translateText = async (issues: Issue[], toLang: string = 'en'): Promise<Issue[]> => {
  if (!toLang || toLang.toLowerCase() === 'en') {
    return issues;
  }

  try {
    const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/translate`, {
      issues,
      toLang,
    }, {
        withCredentials: true
      });

    return response.data;
  } catch (err: any) {
    console.error('Translation failed:', err?.response?.data || err.message);
    return issues;
  }
};




export const translateSingleText = async (
  text: string,
  toLang: string = 'en'
): Promise<string> => {
  if (!text) return '';

  if (!toLang || toLang.toLowerCase() === 'en') {
    return text;
  }

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/translate-text`,
      {
        issues: [{ code: text }], // using 'code' as a generic field
        toLang,
      },
      {
        withCredentials: true
      }
    );
    // The backend returns an array of issues, so we extract the translated 'code' field
    return response.data?.[0]?.code || text;
  } catch (error: any) {
    console.error('Translation error:', error?.response?.data || error.message);
    return text; // return original text as fallback
  }
};

export const translateMultipleTexts = async (
  texts: string[],
  toLang: string = 'en'
): Promise<string[]> => {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  if (!toLang || toLang.toLowerCase() === 'en') {
    return texts;
  }

  console.log("I am called 1st ", texts);

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/translate-text`,
      {
        issues: texts.map(text => ({ code: text })),
        toLang,
      },
      {
        withCredentials: true
      }
    );

    console.log("I am called 2nd ", texts);

    if (Array.isArray(response.data)) {
      return response.data.map((item: any, idx: number) =>
        typeof item?.code === 'string' ? item.code : texts[idx]
      );
    }

    return texts;
  } catch (error: any) {
    console.error('Translation error:', error?.response?.data || error.message);
    return texts;
  }
};

/**
 * Removes duplicate issues by message, keeping the one with the most contexts.
 * @param issues Array of issues, each with a 'message' and 'contexts' property.
 * @returns Filtered array of issues.
 */
export function deduplicateIssuesByMessage(issues: Issue[]): Issue[] {
  const messageMap = new Map<string, Issue>();

  for (const issue of issues) {
    const msg = issue.message;
    const contextCount = Array.isArray(issue.contexts) ? issue.contexts.length : 0;

    if (!messageMap.has(msg)) {
      messageMap.set(msg, issue);
    } else {
      const existing = messageMap.get(msg)!;
      const existingContextCount = Array.isArray(existing.contexts) ? existing.contexts.length : 0;
      if (contextCount > existingContextCount) {
        messageMap.set(msg, issue);
      }
    }
  }

  return Array.from(messageMap.values());
}
