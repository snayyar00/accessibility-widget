import { addAccessibilityDescription, getAccessibilityDescription } from '../../repository/accessibility.repository';
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

          Important: Return ONLY the JSON array. Do not include any additional text, markdown formatting, or code block markers.`,
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
    
    // Clean up the response by removing any markdown or code block markers
    content = content.replace(/^```[\w]*\n?/, ''); // Remove opening code block
    content = content.replace(/\n```$/, '');       // Remove closing code block
    content = content.trim();

    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(content);
      
      // Validate the structure of the parsed response
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate each item in the array has required fields
      parsed.forEach((item, index) => {
        const requiredFields = ['heading', 'description', 'recommended_action', 'affectedDisabilities', 'code'];
        const missingFields = requiredFields.filter(field => !item[field]);
        if (missingFields.length > 0) {
          throw new Error(`Item ${index} is missing required fields: ${missingFields.join(', ')}`);
        }
      });

      return {
        message: {
          content: content // Return the cleaned content
        }
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', content);
      throw new Error(`Invalid JSON in AI response: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Error getting issue description:', error);
    // Return a fallback response that's properly formatted
    return {
      message: {
        content: JSON.stringify([{
          heading: Array.isArray(issues) ? issues[0] : issues,
          description: "An accessibility issue was detected that requires attention.",
          recommended_action: "Review the element for WCAG compliance and make necessary adjustments.",
          affectedDisabilities: ["multiple"],
          code: "WCAG General"
        }])
      }
    };
  }
}

async function addAccessibilityIssuesToDB(issue: dbIssue) {
  return addAccessibilityDescription(issue);
}

const updateIssueDetails = (matchedRecords: dbIssue[], issueList: any[]) =>
  issueList.map((issue) => {
    const matchedRecord = matchedRecords.find((record) => record.heading === issue.message.replace(/Recommendation:.*$/, '').trim());
    if (matchedRecord) {
      issue.description = matchedRecord.description;
      issue.recommended_action = matchedRecord.recommended_action;
      issue.code = matchedRecord.code;
    }
    return issue;
  });

async function populateMissingDescriptions(matchedRecords: dbIssue[], issueHeadings: any, type: string) {
  // console.log(type);
  const notFoundIssues = issueHeadings.filter((message: any) => !matchedRecords.some((record) => record.heading === message));
  if (notFoundIssues.length > 0) {
    const apiResult = await getIssueDescription(notFoundIssues);
    // console.log(apiResult.finish_reason);
    const result = stringToJson(apiResult.message.content);
    await Promise.all(result.map(async (issue: any) => addAccessibilityIssuesToDB(issue)));
    return true;
  }
  return false;
}

// export async function readAccessibilityDescriptionFromDb(issues: any) {
//   try {
//     /*Sometimes the htmlcs runner returns a recommendation and that might be different for different sites so it's removed here
//         in order to increased chances of description matches in the db and thereby reduce calls to openai api. */
//     const errorHeadings = issues.errors.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());
//     const warningHeadings = issues.warnings.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());
//     const noticesHeadings = issues.notices.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());
//     const headings = [...errorHeadings, ...warningHeadings, ...noticesHeadings];
//     let matchedRecords = await getAccessibilityDescription(headings);

//     const results = await Promise.all([populateMissingDescriptions(matchedRecords, errorHeadings, 'error'), populateMissingDescriptions(matchedRecords, warningHeadings, 'warning'), populateMissingDescriptions(matchedRecords, noticesHeadings, 'notice')]);
//     const added = results.some((result) => result === true);

//     if (added) {
//       matchedRecords = await getAccessibilityDescription(headings);
//     }
//     issues.errors = updateIssueDetails(matchedRecords, issues.errors);
//     issues.warnings = updateIssueDetails(matchedRecords, issues.warnings);
//     issues.notices = updateIssueDetails(matchedRecords, issues.notices);
//     // console.log(issues.warnings);
//     return issues;
//   } catch (error) {
//     console.log(error, '\nError retrieving accessibility issue description from database.');
//   }
// }

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
            return {
              heading: result[0].heading,
              description: result[0].description,
              recommended_action: result[0].recommended_action || '',
              affectedDisabilities: result[0].affectedDisabilities || [],
              code: result[0].code || '',
            };
          }
        } catch (error) {
          console.warn(`Attempt ${attempt} failed for issue: ${heading}`, error);
        }
      }

      // If all retries fail, return a default structure
      console.error(`Failed to generate description for: ${heading} after ${retries} attempts.`);
      return {
        heading,
        description: 'No description generated.',
        recommended_action: 'No recommendation available.',
        affectedDisabilities: [],
        code: 'N/A',
      };
    }

    // **Fetch all descriptions concurrently (one by one with retry)**
    const descriptions: dbIssue[] = await Promise.all(headings.map((heading) => fetchSingleDescriptionWithRetry(heading)));

    // **Update issues object with fetched descriptions**
    issues.errors = updateIssueDetails(descriptions, issues.errors);
    issues.warnings = updateIssueDetails(descriptions, issues.warnings);
    issues.notices = updateIssueDetails(descriptions, issues.notices);

    return issues;
  } catch (error) {
    console.log(error, '\nError retrieving accessibility issue descriptions.');
    return issues;
  }
}


interface Error {
  'ErrorGuideline'?: string;
  code?: string;
  description?: string | string[];
  message?: string | string[];
  context?: string | string[];
  recommended_action?: string | string[];
  selectors?: string | string[];
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

    if (aggregatedResult[0] && aggregatedResult[1] && aggregatedResult[2]) {
      const jsonObject1 = JSON.parse(aggregatedResult[0]);
      const jsonObject2 = JSON.parse(aggregatedResult[1]);
      const jsonObject3 = JSON.parse(aggregatedResult[2]);

      mergedObject = {
        "HumanFunctionalities": [
          ...jsonObject1["HumanFunctionalities"],
          ...jsonObject2["HumanFunctionalities"],
          ...jsonObject3["HumanFunctionalities"],
        ],
      };

      const mergedData = mergedObject["HumanFunctionalities"].reduce(
        (acc: HumanFunctionality[], curr: HumanFunctionality) => {
          const existingItem = acc.find(
            (item) => item["FunctionalityName"] === curr["FunctionalityName"]
          );
          if (existingItem) {
            existingItem.Errors.push(...curr.Errors);
          } else {
            acc.push(curr);
          }
          return acc;
        },
        []
      );

      const final = {
        "HumanFunctionalities": mergedData,
      };

      mergedObject = final;
    }

    const result = JSON.parse(aggregatedResult[0]);

    return mergedObject;
  } catch (error) {
    console.error("Error occurred while querying:", error);
    throw error;
  }
};
