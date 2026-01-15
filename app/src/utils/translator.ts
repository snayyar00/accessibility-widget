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
 * @param code - The WCAG code to check (supports both "WCAG AA 2.1 Criteria 1.3.1" and "WCAG2AA.1.3.1" formats)
 * @returns true if the code is in the compliant list or in CURATED_WCAG_CODES
 */
export const isCodeCompliant = (code: string): boolean => {
  if (!code) return false;

  // Add extra compliant codes as per instruction (in both formats)
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
  ];

  // First, check if the code is in CURATED_WCAG_CODES (all curated codes are considered compliant)
  // CURATED_WCAG_CODES is defined below, but we can reference it in the function
  const isInCuratedCodes = CURATED_WCAG_CODES.some(
    (curated) => curated.code === code
  );
  if (isInCuratedCodes) return true;

  // Extract criteria number from both formats:
  // "WCAG AA 2.1 Criteria 1.3.1" -> "1.3.1"
  // "WCAG2AA.1.3.1" -> "1.3.1"
  let criteriaNumber = '';
  if (code.includes('Criteria')) {
    // New format: "WCAG AA 2.1 Criteria 1.3.1"
    const match = code.match(/Criteria\s+(\d+\.\d+(?:\.\d+)?)/);
    if (match) {
      criteriaNumber = match[1];
    }
  } else {
    // Old format: "WCAG2AA.1.3.1" or "WCAG2AA.Principle 1.Guideline 1.3"
    const match = code.match(/WCAG[^.]*\.(\d+\.\d+(?:\.\d+)?)/);
    if (match) {
      criteriaNumber = match[1];
    }
  }

  // If we couldn't extract criteria number, check against old format directly
  if (!criteriaNumber) {
    const result =
      WEBABILITY_COMPLIANT_CODES.some((compliantCode) =>
        code.startsWith(compliantCode),
      ) ||
      EXTRA_COMPLIANT_CODES.some((extraCode) => code.startsWith(extraCode));
    return result;
  }

  // Check against compliant codes using criteria number
  // Convert criteria number to old format for comparison
  const oldFormatCode = `WCAG2AA.${criteriaNumber}`;
  const newFormatCode = `WCAG AA 2.1 Criteria ${criteriaNumber}`;

  const EXTRA_COMPLIANT_CODES_NEW_FORMAT = EXTRA_COMPLIANT_CODES.map(
    (code) => {
      const match = code.match(/WCAG2AA\.(\d+\.\d+(?:\.\d+)?)/);
      return match ? `WCAG AA 2.1 Criteria ${match[1]}` : code;
    }
  );

  // Check against both old and new format compliant codes
  const isInExtraCompliant =
    EXTRA_COMPLIANT_CODES.includes(oldFormatCode) ||
    EXTRA_COMPLIANT_CODES_NEW_FORMAT.includes(newFormatCode);

  // Check against WEBABILITY_COMPLIANT_CODES (these are guideline-level, so check if criteria starts with the guideline)
  const isInWebAbilityCompliant = WEBABILITY_COMPLIANT_CODES.some(
    (compliantCode) => {
      // Extract guideline number from compliant code (e.g., "Guideline 1.3" -> "1.3")
      const guidelineMatch = compliantCode.match(/Guideline\s+(\d+\.\d+)/);
      if (guidelineMatch) {
        const guidelineNum = guidelineMatch[1];
        return criteriaNumber.startsWith(guidelineNum);
      }
      return code.startsWith(compliantCode);
    }
  );

  return isInExtraCompliant || isInWebAbilityCompliant;
};

// Curated WCAG 2.1 AA codes with short messages used in PDF reports
export const CURATED_WCAG_CODES: { code: string; message: string }[] = [
  {
    code: 'WCAG AA 2.1 Criteria 1.1.1',
    message: 'Provide text alternatives for non-text content',
  },
  {
    code: 'WCAG AA 2.1 Criteria 1.2.2',
    message: 'Provide captions for prerecorded audio content',
  },
  {
    code: 'WCAG AA 2.1 Criteria 1.3.1',
    message: 'Preserve information and relationships (semantic structure)',
  },
  {
    code: 'WCAG AA 2.1 Criteria 1.4.3',
    message: 'Ensure sufficient color contrast for text',
  },
  {
    code: 'WCAG AA 2.1 Criteria 1.4.11',
    message: 'Ensure contrast for non-text UI components and graphics',
  },
  {
    code: 'WCAG AA 2.1 Criteria 2.1.1',
    message: 'All functionality is operable via a keyboard',
  },
  {
    code: 'WCAG AA 2.1 Criteria 2.4.1',
    message: 'Provide a mechanism to bypass repeated blocks',
  },
  {
    code: 'WCAG AA 2.1 Criteria 2.4.4',
    message: 'Link purpose can be determined from its context',
  },
  {
    code: 'WCAG AA 2.1 Criteria 2.4.6',
    message: 'Headings and labels describe topic or purpose',
  },
  {
    code: 'WCAG AA 2.1 Criteria 2.5.3',
    message: 'Label in name: visible label text is in the accessible name',
  },
  {
    code: 'WCAG AA 2.1 Criteria 3.1.1',
    message: 'Specify the default human language of the page',
  },
  { code: 'WCAG AA 2.1 Criteria 3.3.1', message: 'Identify input errors clearly' },
  {
    code: 'WCAG AA 2.1 Criteria 3.3.2',
    message: 'Provide labels, instructions, and cues for inputs',
  },
  { code: 'WCAG AA 2.1 Criteria 4.1.1', message: 'Ensure valid and complete HTML/roles' },
  {
    code: 'WCAG AA 2.1 Criteria 4.1.2',
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

    return response.data as Issue[];
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
    return (response.data as any)?.[0]?.code || text;
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
