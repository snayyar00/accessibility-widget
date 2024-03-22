import { addAccessibilityDescription, getAccessibilityDescription } from '../../repository/accessibility.repository';
import OpenAI from 'openai';
import { stringToJson } from '../../helpers/stringToJSON.helper';
import dotenv from 'dotenv';
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API });

interface dbIssue {
  heading: string;
  description: string;
  // recommendedAction?: string,
  recommended_action?: string;
  affectedDisabilities?: string[];
  code: string;
}

async function getIssueDescription(issues: any) {
  const res = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You a writer that is well versed in accessibility issues, wcag and ada guidelines. 
        You can provide details on which disability users will be impacted by the issue the most.
        Now you will be provided with a list of issues that were found on a website and you will return to me with details about the issue.
        these are the details I want and in this format:

        [{
            heading: fill this with the value of the message in the provided json, make sure to include the entire message here. You may extra spaces if you want to, but don't trim the content!
            description: string that you will generate. a couple of sentence detailing what the issue is and what impact it has on the users. Maybe add an example of alleviating the issue, but make the example general purpose,
            recommended_action: How can one fix this issue. General purpose recommendation,
            affectedDisabilities: [people with which disabilities will be impacted by this e.g blind,deaf],
            code: The WCAG code number and it's description based on the WCAG code provided to you e.g 1.4.3 Contrast (Minimum)
            
        }]
        Try to return in ascending order of code.
        remember to just return a json with this information only. No introduction or conclusion paragraphs are required, just the json. Remember to cover all the issues.
        `,
      },
      { role: 'user', content: JSON.stringify(issues) },
    ],
    model: 'gpt-4-turbo-preview',
  });
  return res.choices[0];
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
  console.log(type);
  const notFoundIssues = issueHeadings.filter((message: any) => !matchedRecords.some((record) => record.heading === message));
  if (notFoundIssues.length > 0) {
    const apiResult = await getIssueDescription(notFoundIssues);
    console.log(apiResult.finish_reason);
    const result = stringToJson(apiResult.message.content);
    await Promise.all(result.map(async (issue: any) => addAccessibilityIssuesToDB(issue)));
    return true;
  }
  return false;
}

export async function readAccessibilityDescriptionFromDb(issues: any) {
  try {
    /*Sometimes the htmlcs runner returns a recommendation and that might be different for different sites so it's removed here
        in order to increased chances of description matches in the db and thereby reduce calls to openai api. */
    const errorHeadings = issues.errors.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());
    const warningHeadings = issues.warnings.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());
    const noticesHeadings = issues.notices.map((issue: any) => issue.message.replace(/Recommendation:.*$/, '').trim());
    const headings = [...errorHeadings, ...warningHeadings, ...noticesHeadings];
    let matchedRecords = await getAccessibilityDescription(headings);

    const results = await Promise.all([populateMissingDescriptions(matchedRecords, errorHeadings, 'error'), populateMissingDescriptions(matchedRecords, warningHeadings, 'warning'), populateMissingDescriptions(matchedRecords, noticesHeadings, 'notice')]);
    const added = results.some((result) => result === true);

    if (added) {
      matchedRecords = await getAccessibilityDescription(headings);
    }
    issues.errors = updateIssueDetails(matchedRecords, issues.errors);
    issues.warnings = updateIssueDetails(matchedRecords, issues.warnings);
    issues.notices = updateIssueDetails(matchedRecords, issues.notices);
    console.log(issues.warnings);
    return issues;
  } catch (error) {
    console.log(error, '\nError retrieving accessibility issue description from database.');
  }
}
