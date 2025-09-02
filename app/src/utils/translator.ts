import axios from 'axios';
import { getAuthenticationCookie } from './cookie';
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
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// WCAG codes that are considered compliant/fixed when WebAbility is active
export const WEBABILITY_COMPLIANT_CODES = [
  'WCAG2AA.Principle 1.Guideline 1.1',
  'WCAG2AA.Principle 2.Guideline 2.4',
  'WCAG2AA.Principle 1.Guideline 1.3',
  'WCAG2AA.Principle 1.Guideline 1.3',
  'WCAG2AA.Principle 1.Guideline 1.3',
  'WCAG2AA.Principle 1.Guideline 1.1',
  'WCAG2AA.Principle 2.Guideline 2.1',
  'WCAG2AA.Principle 1.Guideline 1.4',
] as const;

/**
 * Check if a WCAG code is considered compliant/fixed by WebAbility
 * @param code - The WCAG code to check
 * @returns true if the code is in the compliant list
 */
export const isCodeCompliant = (code: string): boolean => {
  if (!code) return false;

  // Add extra compliant codes as per instruction
  const EXTRA_COMPLIANT_CODES = [
    'WCAG2AA.1.1.1',
    'WCAG2AA.1.2.1',
    'WCAG2AA.1.2.2',
    'WCAG2AA.1.2.3',
    'WCAG2AA.1.2.4',
    'WCAG2AA.1.2.5',
    'WCAG2AA.1.3.1',
    'WCAG2AA.1.3.2',
    'WCAG2AA.1.3.3',
    'WCAG2AA.1.3.4',
    'WCAG2AA.1.3.5',
    'WCAG2AA.1.3.6',
    'WCAG2AA.1.4.1',
    'WCAG2AA.1.4.2',
    'WCAG2AA.1.4.3',
    'WCAG2AA.1.4.4',
    'WCAG2AA.1.4.5',
    'WCAG2AA.1.4.6',
    'WCAG2AA.1.4.8',
    'WCAG2AA.1.4.9',
    'WCAG2AA.1.4.10',
    'WCAG2AA.1.4.11',
    'WCAG2AA.1.4.12',
    'WCAG2AA.1.4.13',
    'WCAG2AA.2.1.1',
    'WCAG2AA.2.1.2',
    'WCAG2AA.2.1.4',
    'WCAG2AA.2.2.1',
    'WCAG2AA.2.2.2',
    'WCAG2AA.2.2.3',
    'WCAG2AA.2.2.4',
    'WCAG2AA.2.2.5',
    'WCAG2AA.2.2.6',
    'WCAG2AA.2.3.1',
    'WCAG2AA.2.3.2',
    'WCAG2AA.2.3.3',
    'WCAG2AA.2.4.1',
    'WCAG2AA.2.4.2',
    'WCAG2AA.2.4.3',
    'WCAG2AA.2.4.4',
    'WCAG2AA.2.4.5',
    'WCAG2AA.2.4.6',
    'WCAG2AA.2.4.7',
    'WCAG2AA.2.4.8',
    'WCAG2AA.2.4.9',
    'WCAG2AA.2.4.10',
    'WCAG2AA.2.4.11',
    'WCAG2AA.2.4.12',
    'WCAG2AA.2.4.13',
    'WCAG2AA.2.5.1',
    'WCAG2AA.2.5.2',
    'WCAG2AA.2.5.3',
    'WCAG2AA.2.5.4',
    'WCAG2AA.2.5.5',
    'WCAG2AA.2.5.6',
    'WCAG2AA.3.1.1',
    'WCAG2AA.3.1.2',
    'WCAG2AA.3.1.3',
    'WCAG2AA.3.1.4',
    'WCAG2AA.3.1.5',
    'WCAG2AA.3.1.6',
    'WCAG2AA.3.2.1',
    'WCAG2AA.3.2.2',
    'WCAG2AA.3.2.3',
    'WCAG2AA.3.2.4',
    'WCAG2AA.3.2.5',
    'WCAG2AA.3.2.6',
    'WCAG2AA.3.3.1',
    'WCAG2AA.3.3.2',
    'WCAG2AA.3.3.3',
    'WCAG2AA.3.3.4',
    'WCAG2AA.3.3.5',
    'WCAG2AA.3.3.6',
    'WCAG2AA.4.1.1',
    'WCAG2AA.4.1.2',
    'WCAG2AA.4.1.3',
    'WCAG2AA.2.4.11',
    'WCAG2AA.2.4.12',
    'WCAG2AA.2.4.13',
    'WCAG2AA.2.5.7',
    'WCAG2AA.2.5.8',
    'WCAG2AA.3.2.6',
    'WCAG2AA.3.3.7',
    'WCAG2AA.3.3.8',
    'WCAG AA 2.1 Criteria undefined',
  ];

  const result =
    WEBABILITY_COMPLIANT_CODES.some((compliantCode) =>
      code.startsWith(compliantCode),
    ) || EXTRA_COMPLIANT_CODES.some((extraCode) => code.startsWith(extraCode));

  return result;
};

// Curated WCAG 2.1 AA codes with short messages used in PDF reports
export const CURATED_WCAG_CODES: { code: string; message: string }[] = [
  {
    code: 'WCAG2AA.1.1.1',
    message: 'Provide text alternatives for non-text content',
  },
  {
    code: 'WCAG2AA.1.2.2',
    message: 'Provide captions for prerecorded audio content',
  },
  {
    code: 'WCAG2AA.1.3.1',
    message: 'Preserve information and relationships (semantic structure)',
  },
  {
    code: 'WCAG2AA.1.4.3',
    message: 'Ensure sufficient color contrast for text',
  },
  {
    code: 'WCAG2AA.1.4.11',
    message: 'Ensure contrast for non-text UI components and graphics',
  },
  {
    code: 'WCAG2AA.2.1.1',
    message: 'All functionality is operable via a keyboard',
  },
  {
    code: 'WCAG2AA.2.4.1',
    message: 'Provide a mechanism to bypass repeated blocks',
  },
  {
    code: 'WCAG2AA.2.4.4',
    message: 'Link purpose can be determined from its context',
  },
  {
    code: 'WCAG2AA.2.4.6',
    message: 'Headings and labels describe topic or purpose',
  },
  {
    code: 'WCAG2AA.2.5.3',
    message: 'Label in name: visible label text is in the accessible name',
  },
  {
    code: 'WCAG2AA.3.1.1',
    message: 'Specify the default human language of the page',
  },
  { code: 'WCAG2AA.3.3.1', message: 'Identify input errors clearly' },
  {
    code: 'WCAG2AA.3.3.2',
    message: 'Provide labels, instructions, and cues for inputs',
  },
  { code: 'WCAG2AA.4.1.1', message: 'Ensure valid and complete HTML/roles' },
  {
    code: 'WCAG2AA.4.1.2',
    message: 'Expose name, role, value for interactive components',
  },
];

export const translateText = async (
  issues: Issue[],
  toLang: string = 'en',
): Promise<Issue[]> => {
  if (!toLang || toLang.toLowerCase() === 'en') {
    return issues;
  }

  try {
    const token = getAuthenticationCookie();
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/translate`,
      {
        issues,
        toLang,
      },
      {
        headers,
        withCredentials: true,
      },
    );

    return response.data;
  } catch (err: any) {
    console.error('Translation failed:', err?.response?.data || err.message);
    return issues;
  }
};

export const translateSingleText = async (
  text: string,
  toLang: string = 'en',
): Promise<string> => {
  if (!text) return '';

  if (!toLang || toLang.toLowerCase() === 'en') {
    return text;
  }

  try {
    const token = getAuthenticationCookie();
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/translate-text`,
      {
        issues: [{ code: text }], // using 'code' as a generic field
        toLang,
      },
      {
        headers,
        withCredentials: true,
      },
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
  toLang: string = 'en',
): Promise<string[]> => {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  if (!toLang || toLang.toLowerCase() === 'en') {
    return texts;
  }

  // console.log("I am called 1st ", texts);

  try {
    const token = getAuthenticationCookie();
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/translate-text`,
      {
        issues: texts.map((text) => ({ code: text })),
        toLang,
      },
      {
        headers,
        withCredentials: true,
      },
    );

    // console.log("I am called 2nd ", texts);

    if (Array.isArray(response.data)) {
      return response.data.map((item: any, idx: number) =>
        typeof item?.code === 'string' ? item.code : texts[idx],
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
    const contextCount = Array.isArray(issue.contexts)
      ? issue.contexts.length
      : 0;

    if (!messageMap.has(msg)) {
      messageMap.set(msg, issue);
    } else {
      const existing = messageMap.get(msg)!;
      const existingContextCount = Array.isArray(existing.contexts)
        ? existing.contexts.length
        : 0;
      if (contextCount > existingContextCount) {
        messageMap.set(msg, issue);
      }
    }
  }

  return Array.from(messageMap.values());
}
