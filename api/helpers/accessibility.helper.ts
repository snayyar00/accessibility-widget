import { readAccessibilityDescriptionFromDb } from '../services/accessibilityReport/accessibilityIssues.service';

const pa11y = require('pa11y');

interface axeOutput {
  message: string;
  context: string[];
  selectors: string[];
  impact: string;
  description: string;
  help: string;
}

interface htmlcsOutput {
  code: string;
  message: string;
  context: string[];
  selectors: string[];
}

interface finalOutput {
  axe: {
    errors: axeOutput[];
    notices: axeOutput[];
    warnings: axeOutput[];
  };
  htmlcs: {
    errors: htmlcsOutput[];
    notices: htmlcsOutput[];
    warnings: htmlcsOutput[];
  };
  score?: number;
  totalElements: number;
}

function createAxeArrayObj(message: string, issue: any) {
  const obj: axeOutput = {
    message: message,
    context: [issue.context],
    selectors: [issue.selector],
    impact: issue.runnerExtras.impact,
    description: issue.runnerExtras.description,
    help: issue.runnerExtras.help,
  };
  return obj;
}
function createHtmlcsArrayObj(issue: any) {
  const obj: htmlcsOutput = {
    code: issue.code,
    message: issue.message,
    context: [issue.context],
    selectors: [issue.selector],
  };
  return obj;
}

function calculateAccessibilityScore(issues: { errors: axeOutput[]; warnings: axeOutput[]; notices: axeOutput[] }) {
  let score = 0;
  const issueWeights: Record<string, number> = { error: 3, warning: 2, notice: 1 };
  const impactWeights: Record<string, number> = { critical: 4, serious: 3, moderate: 2, minor: 1 };

  issues.errors.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0;
    score += issueWeights.error * impactWeight;
  });

  issues.warnings.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0;
    score += issueWeights.warning * impactWeight;
  });

  issues.notices.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0;
    score += issueWeights.notice * impactWeight;
  });
  // Normalize the score to a maximum of 70%
  const maxScore = 70;
  return Math.min(Math.floor(score), maxScore);
}

export async function getAccessibilityInformationPally(domain: string) {
  const output: finalOutput = {
    axe: {
      errors: [],
      notices: [],
      warnings: [],
    },
    htmlcs: {
      errors: [],
      notices: [],
      warnings: [],
    },
    totalElements: 0,
  };

  const results = await pa11y(domain, {
    includeNotices: true,
    includeWarnings: true,
    runners: ['axe', 'htmlcs'],
    // screenCapture: `${__dirname}/pallycaptures/${domain}.png`
  });

  results.issues.forEach((issue: any) => {
    if (issue.runner === 'axe') {
      const message = issue.message.replace(/\s*\(.*$/, '');
      if (issue.type === 'error') {
        const errorIndex = output.axe.errors.findIndex((error) => error.message === message);
        if (errorIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(message, issue);
          output.axe.errors.push(obj);
        } else {
          output.axe.errors[errorIndex].context.push(issue.context);
          output.axe.errors[errorIndex].selectors.push(issue.selector);
        }
      } else if (issue.type === 'notice') {
        const noticeIndex = output.axe.notices.findIndex((notice) => notice.message === message);
        if (noticeIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(message, issue);
          output.axe.notices.push(obj);
        } else {
          output.axe.notices[noticeIndex].context.push(issue.context);
          output.axe.notices[noticeIndex].selectors.push(issue.selector);
        }
      } else if (issue.type === 'warning') {
        const warningIndex = output.axe.warnings.findIndex((warning) => warning.message === message);
        if (warningIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(message, issue);
          output.axe.warnings.push(obj);
        } else {
          output.axe.warnings[warningIndex].context.push(issue.context);
          output.axe.warnings[warningIndex].selectors.push(issue.selector);
        }
      }
      output.totalElements += 1;
    } else if (issue.runner === 'htmlcs') {
      if (issue.type === 'error') {
        const message = issue.message;
        const errorIndex = output.htmlcs.errors.findIndex((error) => error.message === message);
        if (errorIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
          output.htmlcs.errors.push(obj);
        } else {
          output.htmlcs.errors[errorIndex].context.push(issue.context);
          output.htmlcs.errors[errorIndex].selectors.push(issue.selector);
        }
      } else if (issue.type === 'notice') {
        const noticeIndex = output.htmlcs.notices.findIndex((notice) => notice.message === issue.message);
        if (noticeIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
          output.htmlcs.notices.push(obj);
        } else {
          output.htmlcs.notices[noticeIndex].context.push(issue.context);
          output.htmlcs.notices[noticeIndex].selectors.push(issue.selector);
        }
      } else if (issue.type === 'warning') {
        const warningIndex = output.htmlcs.warnings.findIndex((warning) => warning.message === issue.message);
        if (warningIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
          output.htmlcs.warnings.push(obj);
        } else {
          output.htmlcs.warnings[warningIndex].context.push(issue.context);
          output.htmlcs.warnings[warningIndex].selectors.push(issue.selector);
        }
      }
    }
  });
  output.score = calculateAccessibilityScore(output.axe);
  const result = await readAccessibilityDescriptionFromDb(output.htmlcs);
  output.htmlcs = result;
  return output;
}
