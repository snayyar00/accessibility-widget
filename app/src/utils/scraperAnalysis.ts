import { getAuthenticationCookie } from '@/utils/cookie';

export interface AutoFix {
  selector: string;
  action: string;
  attributes: {
    [key: string]: string;
  };
  issue_type: string;
}

export interface ScraperAnalysisResponse {
  status: string;
  url: string;
  timestamp: string;
  analysis: {
    status: string;
    auto_fixes: AutoFix[]; // Already filtered (deleted fixes removed)
    summary: {
      total_fixes: number;
      by_type: {
        [key: string]: number;
      };
    };
    timestamp: string;
  };
  mode: string;
  correlation_id: string;
}

export interface AutoFixesRecord {
  id: number;
  url: string;
  deleted_fixes: AutoFix[];
  created_at: string;
  updated_at: string;
}

/**
 * Fetch scraper analysis for a given URL
 * @param url - The URL to analyze
 * @returns Promise<ScraperAnalysisResponse>
 */
export const fetchScraperAnalysis = async (
  url: string
): Promise<ScraperAnalysisResponse> => {
  const backendUrl = `${process.env.REACT_APP_BACKEND_URL}/analyze`;
  const token = getAuthenticationCookie();

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ScraperAnalysisResponse;
  } catch (error) {
    console.error('Error fetching scraper analysis:', error);
    throw error;
  }
};

/**
 * Get deleted fixes for a URL
 */
export const getDeletedFixes = async (url: string): Promise<AutoFix[]> => {
  const backendUrl = `${process.env.REACT_APP_BACKEND_URL}/deleted-fixes?url=${encodeURIComponent(url)}`;
  const token = getAuthenticationCookie();

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data?.deleted_fixes || [];
  } catch (error) {
    console.error('Error fetching deleted fixes:', error);
    throw error;
  }
};


/**
 * Update deleted fixes
 */
export const updateDeletedFixes = async (
  url: string,
  deletedFixes: AutoFix[]
): Promise<AutoFixesRecord> => {
  const backendUrl = `${process.env.REACT_APP_BACKEND_URL}/deleted-fixes`;
  const token = getAuthenticationCookie();

  try {
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url, deleted_fixes: deletedFixes }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data as AutoFixesRecord;
  } catch (error) {
    console.error('Error updating deleted fixes:', error);
    throw error;
  }
};
