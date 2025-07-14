import OpenAI from 'openai';
import { stringToJson } from '../../helpers/stringToJSON.helper';
import dotenv from 'dotenv';
dotenv.config();
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "Webability.io",
    "X-Title": "Webability.io - Accesbility Compliance Solution",
  },
});

interface dbIssue {
  heading: string;
  description: string;
  // recommendedAction?: string,
  recommended_action?: string;
  affectedDisabilities?: string[];
  code: string;
}

// Robust JSON sanitization function to fix common AI response issues
function sanitizeJsonResponse(content: string): string {
  // Remove markdown code block formatting
  content = content.replace(/^```[\w]*\n?/, ''); // Remove opening code block
  content = content.replace(/\n```$/, '');       // Remove closing code block
  content = content.trim();
  
  // Fix line breaks within string arrays that break JSON formatting
  // Pattern: "Dyslexia"\n", "Mobility Impairment" -> "Dyslexia", "Mobility Impairment"
  content = content.replace(/"([^"]*)"[\s\n]*",[\s\n]*"([^"]*)/g, '"$1", "$2');
  
  // Fix multiple quotes patterns - handle various quote malformations
  content = content.replace(/"([^"]*)""+/g, '"$1"');  // Remove extra trailing quotes
  content = content.replace(/"+([^"]*)""/g, '"$1"');  // Remove extra leading quotes
  content = content.replace(/"",\s*"/g, '", "');      // Fix empty string artifacts
  
  // Fix specific pattern: "text"\n", "other" -> "text", "other"
  content = content.replace(/"([^"]*)"[\s\n]*",[\s\n]*"([^"]*)/g, '"$1", "$2');
  
  // Handle newlines breaking array formatting
  content = content.replace(/"\s*\n\s*,\s*"/g, '", "');
  content = content.replace(/",\s*\n\s*"/g, '", "');
  
  // Fix malformed array elements with extra quotes
  // Pattern: "item"", "next" -> "item", "next"
  content = content.replace(/("([^"]*)")"\s*,\s*"/g, '$1, "');
  
  // Fix trailing commas in arrays and objects
  content = content.replace(/,\s*]/g, ']');
  content = content.replace(/,\s*}/g, '}');
  
  // Fix missing commas between array elements (space separated strings)
  content = content.replace(/"\s+"([^"\s])/g, '", "$1');
  
  // Clean up whitespace around JSON structural elements
  content = content.replace(/\s*:\s*/g, ': ');
  content = content.replace(/\s*,\s*/g, ', ');
  
  // Fix escaped quotes that shouldn't be escaped in JSON strings
  content = content.replace(/\\"/g, '"');
  
  // Remove any remaining line breaks within JSON structures
  content = content.replace(/\n(?=[^"]*"[^"]*:)/g, ' ');
  content = content.replace(/\n(?=[^"]*"[^"]*,)/g, ' ');
  
  return content;
}

async function getIssueDescription(issues: any) {
  try {
    const res = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a writer that is well versed in accessibility issues, WCAG and ADA guidelines. 
          You can provide details on which disability users will be impacted by the issue the most.
          Now you will be provided with a list of issues that were found on a website and you must return valid JSON with details about each issue.
          The response must be a valid JSON array with this exact structure:

          [{
              "heading": "The exact message from the provided issue",
              "description": "A couple of sentences detailing what the issue is and its impact on users",
              "recommended_action": "How to fix this issue - general purpose recommendation",
              "affectedDisabilities": ["list", "of", "affected", "disabilities"],
              "code": "WCAG code number and description e.g 1.4.3 Contrast (Minimum)"
          }]

          Important: The response must be a valid JSON array that can be parsed. Do not include any additional text.
          Ensure proper JSON formatting with quotes around all string values.
          Make sure all array elements are properly separated by commas without extra quotes.`,
        },
        { role: 'user', content: JSON.stringify(issues) },
      ],
      model: "google/gemini-2.5-flash-preview-05-20",
    });

    // Validate that we have a response
    if (!res?.choices?.[0]?.message?.content) {
      throw new Error('Invalid or empty response from AI model');
    }

    let content = res.choices[0].message.content.trim();
    
    // Sanitize the JSON response to fix common formatting issues
    content = sanitizeJsonResponse(content);
    
    // Try to parse the JSON response with multiple fallback strategies
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.warn('Initial JSON parse failed, attempting to fix common issues...');
      console.warn('Parse error:', parseError.message);
      console.warn('Content:', content);
      
      // Try additional sanitization for specific patterns
      let fixedContent = content;
      
      // Fix specific pattern from the error: "Dyslexia"\n", "Mobility Impairment"
      // Handle various combinations of quotes, line breaks, and commas
      fixedContent = fixedContent.replace(/"([^"]*)"[\s\n]*"[\s\n]*,[\s\n]*"([^"]*)/g, '"$1", "$2');
      fixedContent = fixedContent.replace(/"([^"]*)"[\s\n]*",[\s\n]*"([^"]*)"/g, '"$1", "$2"');
      fixedContent = fixedContent.replace(/"([^"]*)""\s*,\s*"([^"]*)"/g, '"$1", "$2"');
      
      // Fix cases where there might be malformed quotes in arrays
      fixedContent = fixedContent.replace(/("[\w\s&-]+)""\s*,/g, '"$1",');
      fixedContent = fixedContent.replace(/""([\w\s&-]+)"/g, '"$1"');
      
      // Fix line breaks and spacing issues within arrays
      fixedContent = fixedContent.replace(/"\s*\n\s*"/g, '", "');
      fixedContent = fixedContent.replace(/",\s*\n\s*"/g, '", "');
      fixedContent = fixedContent.replace(/"\s*\n\s*,/g, '",');
      
      // Fix missing quotes around values
      fixedContent = fixedContent.replace(/:\s*([^"\[\{,\s][^,\]\}]*[^",\]\}\s])/g, ': "$1"');
      
      // Normalize whitespace
      fixedContent = fixedContent.replace(/\s+/g, ' ').trim();
      
      try {
        parsed = JSON.parse(fixedContent);
        console.log('Successfully parsed after sanitization');
      } catch (secondError) {
        console.error('Second parse attempt failed:', secondError.message);
        
        // Final fallback: try to extract JSON using regex if it's wrapped in other text
        const jsonMatch = fixedContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted and parsed JSON from response');
          } catch (thirdError) {
            console.error('Failed to parse extracted JSON:', thirdError.message);
            throw new Error(`Unable to parse AI response after multiple attempts: ${thirdError.message}`);
          }
        } else {
          throw new Error(`No valid JSON array found in response: ${secondError.message}`);
        }
      }
    }
    
    // Validate the structure of the parsed response
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    // Validate each item in the array has required fields
    parsed.forEach((item, index) => {
      const requiredFields = ['heading', 'description', 'recommended_action', 'affectedDisabilities', 'code'];
      const missingFields = requiredFields.filter(field => !item[field]);
      if (missingFields.length > 0) {
        console.warn(`Item ${index} is missing required fields: ${missingFields.join(', ')}, using defaults`);
        // Fill in missing fields with defaults
        if (!item.heading) item.heading = issues[index] || 'Unknown issue';
        if (!item.description) item.description = 'An accessibility issue was detected';
        if (!item.recommended_action) item.recommended_action = 'Review for WCAG compliance';
        if (!item.affectedDisabilities) item.affectedDisabilities = ['multiple'];
        if (!item.code) item.code = 'WCAG General';
      }
    });

    return res.choices[0];
  } catch (error) {
    console.error('Error getting issue description:', error);
    // Return a fallback response
    return {
      message: {
        content: JSON.stringify([{
          heading: issues[0],
          description: "An accessibility issue was detected that requires attention.",
          recommended_action: "Review the element for WCAG compliance and make necessary adjustments.",
          affectedDisabilities: ["multiple"],
          code: "WCAG General"
        }])
      }
    };
  }
}

const updateIssueDetails = (issueList: any[]) =>
  issueList.map((issue) => {
    return issue;
  });

async function populateMissingDescriptions(matchedRecords: dbIssue[], issueHeadings: any, type: string) {
  // console.log(type);
  const notFoundIssues = issueHeadings.filter((message: any) => !matchedRecords.some((record) => record.heading === message));
  if (notFoundIssues.length > 0) {
    // console.log(apiResult.finish_reason);
    return true;
  }
  return false;
}

export async function readAccessibilityDescriptionFromDb(issues: any) {
  try {
    /* Sometimes the htmlcs runner returns a recommendation, and that might be different for different sites. 
       It's removed here in order to increase chances of description matches in OpenAI results. */
    const errorHeadings = issues.errors.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());
    const warningHeadings = issues.warnings.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());
    const noticesHeadings = issues.notices.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());

    const headings = [...errorHeadings, ...warningHeadings, ...noticesHeadings];

    // Function to fetch a description with retries
    async function fetchSingleDescriptionWithRetry(heading: string, retries = 3): Promise<dbIssue> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const apiResult = await getIssueDescription([heading]); // Send only one issue at a time
          const result:any = stringToJson(apiResult.message.content);

          if (result.length > 0 && result[0].description.trim() !== '') {
            // Add the single issue to the database
            return result[0];
          } else {
            throw new Error('Empty description received');
          }
        } catch (error) {
          console.error(`Attempt ${attempt} failed for heading: ${heading}`, error.message);
          if (attempt === retries) {
            // After all retries failed, create a default entry
            const defaultIssue: dbIssue = {
              heading: heading,
              description: 'An accessibility issue was detected. Please review for WCAG compliance.',
              recommended_action: 'Review the element and ensure it meets accessibility standards.',
              code: 'WCAG General'
            };
            return defaultIssue;
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Update issue details with matched records
    issues.errors = updateIssueDetails(issues.errors);
    issues.warnings = updateIssueDetails(issues.warnings);
    issues.notices = updateIssueDetails(issues.notices);
    
    return issues;
  } catch (error) {
    console.error('Error retrieving accessibility issue description from database:', error);
    return issues; // Return original issues if processing fails
  }
}

// Interface definitions for GPT functionality grouping
interface Error {
  'Error Guideline'?: string;
  code?: string;
  description?: string | string[];
  message?: string | string[];
  context?: string | string[];
  recommended_action?: string | string[];
  selectors?: string | string[];
  screenshotUrl?: string;
}

interface HumanFunctionality {
  'FunctionalityName': string;
  Errors: Error[];
}

interface GPTData {
  'HumanFunctionalities': HumanFunctionality[];
}

export const GPTChunks = async (errorCodes: string[]) => {
  const chunkSize = Math.ceil(errorCodes.length / 3);
  const errorChunks: string[][] = [];
  for (let i = 0; i < errorCodes.length; i += chunkSize) {
    errorChunks.push(errorCodes.slice(i, i + chunkSize));
  }
  // Making API calls and aggregating the results
  const promises = errorChunks.map(async (chunk) => {
    const completion = await openai.chat.completions.create({
      seed: chunk.length,
      messages: [
        {
          role: "system",
          content:
            "You are a website accessibility report expert. You are given a List of WCGA Guideline Error Codes. You must group the error codes based on human functionality e.g 'deaf', 'blind',' Mobility','Low vision','Cognitive' and other such functionality.Remeber to group all of the given error codes. Donot Group One error code under more than one Human Functionality .Always provide the result in JSON format.",
        },
        {
          role: "user",
          content:
            "These are WCGA error Codes give JSON Object where each error code is mapped to a human functionality : [" +
            chunk.join(" , ") +
            "]",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "map_errorcodes",
            parameters: {
              type: "object",
              properties: {
                "HumanFunctionalities": {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      "FunctionalityName": {
                        type: "string",
                        description: "Name of the human functionality",
                      },
                      Errors: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            "ErrorGuideline": {
                              type: "string",
                              description: "WCGA Error Codes",
                            },
                          },
                          required: ["ErrorGuideline"], // Ensure these properties are required
                        },
                        description: "Errors related to this functionality",
                      },
                    },
                    required: ["FunctionalityName", "Errors"], // Ensure these properties are required
                  },
                },
              },
            },
          },
        },
      ],
      model: "google/gemini-2.5-flash-preview-05-20",
    });
    return completion.choices[0].message.tool_calls?.[0].function.arguments;
  });

  try {
    // Wait for all promises to resolve
    const results = await Promise.all(promises);

    // Flatten the array of arrays into a single array
    const aggregatedResult = results.flat();
    let mergedObject: GPTData = {
      "HumanFunctionalities": [],
    };
    
    aggregatedResult.forEach((result) => {
      try {
        const parsedObject = JSON.parse(result);
        if (parsedObject && parsedObject.HumanFunctionalities) {
          mergedObject.HumanFunctionalities.push(...parsedObject.HumanFunctionalities);
        }
      } catch (parseError) {
        console.error('Error parsing GPT chunk result:', parseError);
      }
    });

    return mergedObject;
  } catch (error) {
    console.error('Error in GPTChunks:', error);
    // Return a default structure if all fails
    return {
      "HumanFunctionalities": []
    };
  }
};
