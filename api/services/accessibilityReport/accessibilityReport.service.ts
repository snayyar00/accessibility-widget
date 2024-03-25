import axios from 'axios';
import { getAccessibilityInformationPally } from '~/helpers/accessibility.helper';
import logger from '~/utils/logger';
const { GraphQLJSON } = require('graphql-type-json');
const puppeteer = require('puppeteer');

interface Status {
    success: boolean;
    httpstatuscode: number;
}

interface Statistics {
    pagetitle: string;
    pageurl: string;
    time: number;
    creditsremaining: number;
    allitemcount: number;
    totalelements: number;
    waveurl: string;
}

interface CategoryItem {
    id: string;
    description: string;
    count: number;
    xpaths?: string[];
    contrastdata?: (number | string | boolean)[][];
    selectors?: string[];
}

// interface Category {
//     description: string;
//     count: number;
//     items?: { [key: string]: CategoryItem };
// }

interface Status {
    success: boolean;
    httpstatuscode: number;
  }
  
  interface Statistics {
    pagetitle: string;
    pageurl: string;
    time: number;
    creditsremaining: number;
    allitemcount: number;
    totalelements: number;
    waveurl: string;
  }
  
  interface CategoryItem {
    id: string;
    description: string;
    count: number;
    xpaths?: string[];
    contrastdata?: (number | string | boolean)[][];
    selectors?: string[];
  }
  
  // Use an index signature for the items within a category
  interface Category {
    description: string;
    count: number;
    items: { [key: string]: CategoryItem };
  }
  
  // Use an index signature for the categories themselves
  interface Categories {
    [key: string]: Category;
  }
  
  interface WebAIMResponse {
    status: Status;
    statistics: Statistics;
    categories: Categories;
  }
  

interface WebAIMResponse {
    status: Status;
    statistics: Statistics;
    categories: { [key: string]: Category };
}

function calculateAccessibilityScore(data: any) {
    const weights = {
        'error': 1, // High severity
        'contrast': 0.75, // Medium severity
        'alert': 0.5, // Low severity
    };

    const defaultWeight = 0.35
    let issueSum = 0;
    let totalIssues = 0;

    for (const category in data.categories) {
        if (data.categories.hasOwnProperty(category)) {
            const categoryData = data.categories[category];
            const weight = weights[category as keyof typeof weights] || defaultWeight;
            console.log(`${data.categories[category]}, ${categoryData.count}`)
            issueSum += categoryData.count * weight;
            console.log('issueSum: ', issueSum);
            totalIssues += categoryData.count;
        }
    }

    const maxScore = 100;
    const score = Math.ceil( maxScore - issueSum);
    return {
        score: Math.max(30, score), // Ensure score doesn't go below 0
        totalIssues: totalIssues
    };
}


export const fetchAccessibilityReport = async (url: string) => {
    try {
        const result = await getAccessibilityInformationPally(url);
        
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
          url = 'https://' + url;
        }
        const siteImg = await fetchSitePreview(url);
        if(siteImg)
        {
            result.siteImg = siteImg;
        }
        

        return result;

    } catch (error) {
        logger.error(error);
        throw new Error(`${error} Error fetching data from WebAIM API `);
    }
};

export const fetchSitePreview = async (url:string) => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920, 
            height: 1080
        });
        await page.goto(url);
        const screenshotBuffer = await page.screenshot({ encoding: 'base64' });
        await browser.close();

        // Create Data URL from the screenshot buffer
        const dataUrl = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
        return dataUrl;
    } catch (error) {
        console.error('Error generating screenshot:', error);
        return null;
    }
};

// example usage:

// query GetAccessibilityReport {
//     getAccessibilityReport(url: "https://example.com") {
//       status {
//         success
//         httpstatuscode
//       }
//       statistics {
//         pagetitle
//         pageurl
//         time
//         creditsremaining
//         allitemcount
//         totalelements
//         waveurl
//       }
//       categories {
//         description
//         count
//         items {
//           id
//           description
//           count
//           xpaths
//           contrastdata
//           selectors
//         }
//       }
//     }
//   }