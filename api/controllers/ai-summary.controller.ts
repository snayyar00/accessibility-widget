import { Request, Response } from 'express';
import OpenAI from 'openai';

export const generateAiSummary = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'hello') {
      console.error('OpenAI API key not configured properly');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        summary: 'AI summary service is not configured. Please contact support.'
      });
    }

    console.log('Generating AI summary with GPT-4o...');
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use OpenAI API to generate summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful accessibility expert who explains technical issues in simple, friendly language for non-technical users. Always be encouraging and provide actionable advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';

    console.log('AI summary generated successfully');
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error generating AI summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI summary',
      summary: 'Unable to generate AI summary at this time. Please review the technical details above for specific issues that need attention.'
    });
  }
};
