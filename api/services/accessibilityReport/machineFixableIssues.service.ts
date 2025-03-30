import { fetchAccessibilityReport } from './accessibilityReport.service';
import { findSite } from '~/services/allowedSites/allowedSites.service';
import knex from '~/config/database.config';

// Expanded list of machine-fixable issue codes with descriptions
const MACHINE_FIXABLE_ISSUES = {
  // Images
  'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37': {
    description: 'Missing alt attributes on images',
    fixType: 'alt',
    priority: 1,
    impact: 'high'
  },
  'WCAG2AA.Principle1.Guideline1_1.1_1_1.H67.1': {
    description: 'Image with empty alt text when it should be descriptive',
    fixType: 'alt',
    priority: 1,
    impact: 'high'
  },
  
  // Form labels
  'WCAG2AA.Principle1.Guideline1_3.1_3_1.H44.NonExistentFragment': {
    description: 'Missing labels on form controls',
    fixType: 'label',
    priority: 1,
    impact: 'high'
  },
  'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.InputText.Name': {
    description: 'Input field without proper label',
    fixType: 'label',
    priority: 1,
    impact: 'high'
  },
  
  // ARIA roles and labels
  'WCAG2AA.Principle1.Guideline1_3.1_3_1.ARIA6': {
    description: 'Missing ARIA labels',
    fixType: 'aria',
    priority: 2,
    impact: 'medium'
  },
  'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.Button.Name': {
    description: 'Button without text content or aria-label',
    fixType: 'button',
    priority: 1,
    impact: 'high'
  },
  
  // Links
  'WCAG2AA.Principle2.Guideline2_4.2_4_4.H77,H78,H79,H80,H81': {
    description: 'Link without descriptive text',
    fixType: 'link',
    priority: 2,
    impact: 'medium'
  },
  'WCAG2AA.Principle2.Guideline2_4.2_4_4.H77': {
    description: 'Link has no text content',
    fixType: 'link',
    priority: 1,
    impact: 'high'
  },
  
  // Document structure
  'WCAG2AA.Principle1.Guideline1_3.1_3_1.H42': {
    description: 'Heading elements not properly nested',
    fixType: 'heading',
    priority: 3,
    impact: 'medium'
  },
  'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2': {
    description: 'Document language not specified',
    fixType: 'lang',
    priority: 1,
    impact: 'high'
  },
  
  // Tables
  'WCAG2AA.Principle1.Guideline1_3.1_3_1.H39,H73.4': {
    description: 'Table without proper headers',
    fixType: 'table',
    priority: 2,
    impact: 'medium'
  },
  
  // Color contrast
  'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail': {
    description: 'Insufficient color contrast',
    fixType: 'contrast',
    priority: 2,
    impact: 'medium'
  }
};

function stripUrlToDomain(url: string): string {
  try {
    let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '')
    domain = domain.split('/')[0]
    return domain.toLowerCase()
  } catch (error) {
    return url
  }
}

// Generate code fixes based on issue type and context
function generateCodeFix(issue, fixType) {
  const context = issue.context?.[0] || '';
  const selector = issue.selectors?.[0] || '';
  
  switch (fixType) {
    case 'alt':
      if (context.match(/<img[^>]*>/i)) {
        const hasAlt = context.includes('alt="');
        if (!hasAlt) {
          // Missing alt attribute
          const fixed = context.replace(/<img/i, '<img alt="[Descriptive text needed]"');
          return { original: context, fixed };
        } else {
          // Empty alt when it should be descriptive
          const fixed = context.replace(/alt=""/i, 'alt="[Descriptive text needed]"');
          return { original: context, fixed };
        }
      }
      break;
      
    case 'label':
      if (context.match(/<input[^>]*>/i)) {
        const id = context.match(/id="([^"]*)"/)?.[1] || `input-${Date.now()}`;
        return {
          original: context,
          fixed: `<label for="${id}">Label text</label>\n${context.replace(/id="([^"]*)"/i, `id="${id}"`)}`
        };
      }
      break;
      
    case 'aria':
      if (!context.includes('aria-label')) {
        return {
          original: context,
          fixed: context.replace(/(<[a-z][^>]*)/i, '$1 aria-label="[Descriptive text needed]"')
        };
      }
      break;
      
    case 'button':
      if (context.match(/<button[^>]*>/i) && !context.match(/>([^<]*)</)) {
        return {
          original: context,
          fixed: context.replace(/<button([^>]*)>/i, '<button$1>Button Text</button>')
        };
      }
      break;
      
    case 'link':
      if (context.match(/<a[^>]*>/i) && !context.match(/>([^<]*)</)) {
        return {
          original: context,
          fixed: context.replace(/<a([^>]*)>/i, '<a$1>Link Text</a>')
        };
      }
      break;
      
    case 'lang':
      return {
        original: '<html>',
        fixed: '<html lang="en">'
      };
      
    default:
      return null;
  }
  
  return null;
}

// More sophisticated scoring algorithm
function calculatePotentialImprovement(fixableIssues) {
  // Base score impact by priority
  const priorityWeights = {
    1: 3,  // High priority issues have most impact
    2: 2,  // Medium priority  
    3: 1   // Low priority
  };
  
  // Impact multipliers
  const impactMultipliers = {
    'high': 1.5,
    'medium': 1.0,
    'low': 0.5
  };
  
  // Calculate weighted improvement score
  let improvementScore = 0;
  
  fixableIssues.forEach(issue => {
    const priorityWeight = priorityWeights[issue.priority] || 1;
    const impactMultiplier = impactMultipliers[issue.impact] || 1.0;
    
    improvementScore += priorityWeight * impactMultiplier;
  });
  
  // Cap the maximum improvement at 40 points
  return Math.min(40, Math.round(improvementScore));
}

export const getMachineFixableIssues = async (url: string) => {
  try {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      url = 'https://' + url;
    }

    const domain = stripUrlToDomain(url);
    
    // Find site in allowed sites
    const site = await findSite(domain);
    if (!site) {
      throw new Error(`Site not found for domain: ${domain}`);
    }
    
    // Get the full accessibility report
    const fullReport = await fetchAccessibilityReport(url);
    
    // Extract machine-fixable issues
    const fixableIssues = [];
    let totalIssueCount = 0;
    
    // Process htmlcs errors, warnings, and notices
    if (fullReport.htmlcs) {
      for (const issueType of ['errors', 'warnings', 'notices']) {
        if (Array.isArray(fullReport.htmlcs[issueType])) {
          totalIssueCount += fullReport.htmlcs[issueType].length;
          
          for (const issue of fullReport.htmlcs[issueType]) {
            const issueCode = issue.code;
            const fixableInfo = MACHINE_FIXABLE_ISSUES[issueCode];
            
            if (fixableInfo) {
              const codeFix = generateCodeFix(issue, fixableInfo.fixType);
              
              fixableIssues.push({
                code: issueCode,
                element: issue.context ? issue.context[0] : '',
                selector: issue.selectors ? issue.selectors[0] : '',
                issue: issue.message || issue.description || fixableInfo.description,
                fix: issue.recommended_action || `Fix the ${fixableInfo.description.toLowerCase()}`,
                impact: fixableInfo.impact,
                priority: fixableInfo.priority,
                codeFix: codeFix
              });
            }
          }
        }
      }
    }
    
    // Sort issues by priority (highest first)
    fixableIssues.sort((a, b) => a.priority - b.priority);
    
    // Calculate potential score improvement
    const potentialImprovement = calculatePotentialImprovement(fixableIssues);
    
    return {
      url: domain,
      totalIssues: totalIssueCount,
      fixableIssues: fixableIssues,
      potentialScoreImprovement: potentialImprovement
    };
    
  } catch (error) {
    console.error('Error fetching machine fixable issues:', error);
    throw new Error(`Error processing machine fixable issues: ${error.message}`);
  }
}; 