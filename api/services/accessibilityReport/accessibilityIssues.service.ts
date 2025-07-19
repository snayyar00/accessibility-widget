import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'Webability.io',
    'X-Title': 'Webability.io - Accesbility Compliance Solution',
  },
})

const updateIssueDetails = (issueList: any[]) => issueList.map((issue) => issue)

export async function readAccessibilityDescriptionFromDb(issues: any) {
  try {
    // Update issue details with matched records
    issues.errors = updateIssueDetails(issues.errors)
    issues.warnings = updateIssueDetails(issues.warnings)
    issues.notices = updateIssueDetails(issues.notices)

    return issues
  } catch (error) {
    console.error('Error retrieving accessibility issue description from database:', error)
    return issues // Return original issues if processing fails
  }
}

// Interface definitions for GPT functionality grouping
interface Error {
  'Error Guideline'?: string
  code?: string
  description?: string | string[]
  message?: string | string[]
  context?: string | string[]
  recommended_action?: string | string[]
  selectors?: string | string[]
  screenshotUrl?: string
}

interface HumanFunctionality {
  FunctionalityName: string
  Errors: Error[]
}

interface GPTData {
  HumanFunctionalities: HumanFunctionality[]
}

export const GPTChunks = async (errorCodes: string[]) => {
  const chunkSize = Math.ceil(errorCodes.length / 3)
  const errorChunks: string[][] = []
  for (let i = 0; i < errorCodes.length; i += chunkSize) {
    errorChunks.push(errorCodes.slice(i, i + chunkSize))
  }
  // Making API calls and aggregating the results
  const promises = errorChunks.map(async (chunk) => {
    const completion = await openai.chat.completions.create({
      seed: chunk.length,
      messages: [
        {
          role: 'system',
          content:
            "You are a website accessibility report expert. You are given a List of WCGA Guideline Error Codes. You must group the error codes based on human functionality e.g 'deaf', 'blind',' Mobility','Low vision','Cognitive' and other such functionality.Remeber to group all of the given error codes. Donot Group One error code under more than one Human Functionality .Always provide the result in JSON format.",
        },
        {
          role: 'user',
          content: `These are WCGA error Codes give JSON Object where each error code is mapped to a human functionality : [${chunk.join(' , ')}]`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'map_errorcodes',
            parameters: {
              type: 'object',
              properties: {
                HumanFunctionalities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      FunctionalityName: {
                        type: 'string',
                        description: 'Name of the human functionality',
                      },
                      Errors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            ErrorGuideline: {
                              type: 'string',
                              description: 'WCGA Error Codes',
                            },
                          },
                          required: ['ErrorGuideline'], // Ensure these properties are required
                        },
                        description: 'Errors related to this functionality',
                      },
                    },
                    required: ['FunctionalityName', 'Errors'], // Ensure these properties are required
                  },
                },
              },
            },
          },
        },
      ],
      model: 'google/gemini-2.5-flash-preview-05-20',
    })
    return completion.choices[0].message.tool_calls?.[0].function.arguments
  })

  try {
    // Wait for all promises to resolve
    const results = await Promise.all(promises)

    // Flatten the array of arrays into a single array
    const aggregatedResult = results.flat()
    const mergedObject: GPTData = {
      HumanFunctionalities: [],
    }

    aggregatedResult.forEach((result) => {
      try {
        const parsedObject = JSON.parse(result)
        if (parsedObject && parsedObject.HumanFunctionalities) {
          mergedObject.HumanFunctionalities.push(...parsedObject.HumanFunctionalities)
        }
      } catch (parseError) {
        console.error('Error parsing GPT chunk result:', parseError)
      }
    })

    return mergedObject
  } catch (error) {
    console.error('Error in GPTChunks:', error)
    // Return a default structure if all fails
    return {
      HumanFunctionalities: [],
    }
  }
}
