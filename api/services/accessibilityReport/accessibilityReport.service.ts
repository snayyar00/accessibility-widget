import axios from 'axios';
import logger from '~/utils/logger';

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

interface Category {
    description: string;
    count: number;
    items?: { [key: string]: CategoryItem };
}

interface WebAIMResponse {
    status: Status;
    statistics: Statistics;
    categories: { [key: string]: Category };
}



export const fetchAccessibilityReport = async (url: string, reportType: number): Promise<WebAIMResponse> => {
    try {
        const response = await axios.get(`https://wave.webaim.org/api/request?key=${process.env.WEBAIM_API}&url=${url}&reporttype=${reportType}`);
        console.log(response.data)
        return response.data; // Assuming the API response matches the structure
    } catch (error) {
        logger.error(error);
        throw new Error(`${error} Error fetching data from WebAIM API `);
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