import axios from 'axios';

const subscriptionKey ='3pjm769AhqdF7XJKthww8mhhZDamPWpX1emM1yDkFKXJA4qDD7qSJQQJ99BGACi5YpzXJ3w3AAAbACOGG2Nw';
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

  
  console.log(".................",getBrowserLanguage());

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