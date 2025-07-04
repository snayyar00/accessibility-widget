import axios from 'axios';

const subscriptionKey = process.env.REACT_APP_AZURE_API_KEY;
const endpoint = 'https://api.cognitive.microsofttranslator.com/';
const region = 'northeurope'; // e.g., 'eastus'
interface Issue {
  [key: string]: any;
}
const getBrowserLanguage = () => {
    const lang = navigator.language  // e.g., "en-US", "fr-CA"
    return lang.split('-')[0]; // return "en", "fr", etc.
  };


export const translateText = async (issues: Issue[], toLang: string = 'en'): Promise<Issue[]> => {
  const fieldsToTranslate = ['code', 'message', 'recommended_action'];

  // Prepare texts with reference to issue index and field name
  const textsToTranslate: { issueIndex: number; field: string; text: string }[] = [];

  issues.forEach((issue, idx) => {
    fieldsToTranslate.forEach((field) => {
      if (issue[field]) {
        textsToTranslate.push({ issueIndex: idx, field, text: issue[field] });
      }
    });
  });

  

  try {
    const response = await axios.post(
      `${endpoint}translate?api-version=3.0&to=${toLang}`,
      textsToTranslate.map((item) => ({ Text: item.text })),
      {
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json',
        },
      }
    );

    const translatedIssues = issues.map((issue) => ({ ...issue })); // shallow copy

    response.data.forEach((translation: any, idx: number) => {
      const { issueIndex, field } = textsToTranslate[idx];
      translatedIssues[issueIndex][field] = translation.translations[0].text;
    });

    return translatedIssues;
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
  
    try {
      const response = await axios.post(
        `${endpoint}translate?api-version=3.0&to=${toLang}`,
        [{ Text: text }],
        {
          headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json',
          },
        }
      );
  
      return response.data[0]?.translations[0]?.text || text;
    } catch (error: any) {
      console.error('Translation error:', error?.response?.data || error.message);
      return text; // return original text as fallback
    }
  };