import { Request, Response } from 'express';
import axios from 'axios';

const subscriptionKey = process.env.AZURE_API_KEY;
const endpoint = process.env.AZURE_ENDPOINT;
const region = process.env.AZURE_REGION;

interface Issue {
  [key: string]: any;
}

export async function translateIssues(req: Request, res: Response) {
  const { issues, toLang = 'en' } = req.body;

  if (!Array.isArray(issues)) {
    return res.status(400).json({ error: 'Invalid or missing "issues" array' });
  }

  const fieldsToTranslate = ['code', 'message', 'recommended_action'];
  const textsToTranslate: { issueIndex: number; field: string; text: string }[] = [];

  issues.forEach((issue: Issue, idx: number) => {
    fieldsToTranslate.forEach((field) => {
      if (issue[field]) {
        textsToTranslate.push({ issueIndex: idx, field, text: issue[field] });
      }
    });
  });

  // Skip translation if language is English
  if (!toLang || toLang.toLowerCase() === 'en') {
    return res.json(issues);
  }

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
      },
    );

    const translatedIssues = issues.map((issue) => ({ ...issue }));

    response.data.forEach((translation: any, idx: number) => {
      const { issueIndex, field } = textsToTranslate[idx];
      translatedIssues[issueIndex][field] = translation.translations[0].text;
    });

    return res.json(translatedIssues);
  } catch (err: any) {
    console.error('Translation error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Translation failed' });
  }
}

export async function translateText(req: Request, res: Response) {
  try {
    const { issues, toLang = 'en' } = req.body;

    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing "issues" array' });
    }

    if (!toLang || toLang.toLowerCase() === 'en') {
      // No translation needed — return original input format
      return res.json(issues);
    }

    // Extract texts from the `code` field
    const texts = issues.map((item: { code: string }) => item.code);

    // Send to Microsoft Translator
    const response = await axios.post(
      `${endpoint}translate?api-version=3.0&to=${toLang}`,
      texts.map((text) => ({ Text: text })),
      {
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json',
        },
      },
    );

    const translated = response.data.map((item: any) => ({
      code: item.translations[0].text,
    }));

    return res.json(translated);
  } catch (err: any) {
    console.error('Translation failed:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Translation failed' });
  }
}
