import axios from 'axios';
import logger from '../../utils/logger';
import apolloUrlBuilderService, { ApolloSearchParams, ApolloUrlResult } from './apolloUrlBuilder.service';

export interface ApifyRunInput {
  url: string;
  maxResults?: number;
  includeEmails?: boolean;
  includePhoneNumbers?: boolean;
  proxyConfiguration?: {
    useApifyProxy: boolean;
  };
}

export interface ApolloContact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  emailStatus?: 'verified' | 'guessed' | 'unavailable';
  phoneNumber?: string;
  linkedinUrl?: string;
  title: string;
  seniority?: string;
  department?: string;
  company: {
    name: string;
    domain?: string;
    industry?: string;
    size?: string;
    location?: string;
    linkedinUrl?: string;
  };
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface ApifyRunResponse {
  id: string;
  actId: string;
  userId: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT';
  startedAt: string;
  finishedAt?: string;
  buildId: string;
  exitCode?: number;
  defaultDatasetId: string;
  defaultKeyValueStoreId: string;
  defaultRequestQueueId: string;
  stats: {
    inputBodyLen: number;
    restartCount: number;
    resurrectCount: number;
    memAvgBytes?: number;
    memMaxBytes?: number;
    memCurrentBytes?: number;
    cpuAvgUsage?: number;
    cpuMaxUsage?: number;
    cpuCurrentUsage?: number;
    netRxBytes?: number;
    netTxBytes?: number;
    durationMillis?: number;
    runTimeSecs?: number;
    metamorph?: number;
  };
}

export interface ApifyDatasetItem extends ApolloContact {}

export interface ApolloSearchResult {
  contacts: ApolloContact[];
  totalCount: number;
  searchParams: ApolloSearchParams;
  runId: string;
  status: 'running' | 'completed' | 'failed';
  costUsed?: number;
}

class ApolloService {
  private apiKey: string;
  private baseUrl = 'https://api.apify.com/v2';
  private actorId = 'code_crafter~apollo-io-scraper';

  constructor() {
    this.apiKey = process.env.APPIFY_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('Apify API key not found in environment variables');
    }
  }

  /**
   * Search for contacts using Apollo.io via Apify
   */
  async searchContacts(params: ApolloSearchParams): Promise<ApolloSearchResult> {
    try {
      logger.info('Starting Apollo.io contact search via Apify:', params);

      if (!this.apiKey) {
        throw new Error('Apify API key not configured');
      }

      // Build Apollo URL using our URL builder service
      const urlResult = apolloUrlBuilderService.buildPeopleSearchUrl(params);
      
      // Prepare Apify run input
      const runInput: ApifyRunInput = {
        url: urlResult.url,
        maxResults: params.maxResults || 10,
        includeEmails: params.includeEmails !== false,
        includePhoneNumbers: params.includePhoneNumbers !== false,
        proxyConfiguration: {
          useApifyProxy: true
        }
      };

      logger.info(`Starting Apify run with URL: ${urlResult.url}`);

      // Start the Apify Actor run
      const runResponse = await this.startApifyRun(runInput);
      
      if (!runResponse) {
        throw new Error('Failed to start Apify run');
      }

      logger.info(`Apify run started with ID: ${runResponse.id}`);

      // Wait for completion and get results
      const results = await this.waitForRunCompletion(runResponse.id);

      return {
        contacts: results,
        totalCount: results.length,
        searchParams: params,
        runId: runResponse.id,
        status: 'completed',
        costUsed: this.calculateCost(results.length)
      };

    } catch (error) {
      logger.error('Apollo.io search error:', error);
      throw new Error(`Failed to search Apollo.io contacts: ${error.message}`);
    }
  }

  /**
   * Start an Apify Actor run
   */
  private async startApifyRun(input: ApifyRunInput): Promise<ApifyRunResponse | null> {
    try {
      const url = `${this.baseUrl}/acts/${this.actorId}/runs`;
      
      const response = await axios.post(url, input, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.data;

    } catch (error) {
      logger.error('Failed to start Apify run:', error);
      if (error.response) {
        logger.error('Apify API error:', error.response.data);
      }
      return null;
    }
  }

  /**
   * Wait for Apify run to complete and return results
   */
  private async waitForRunCompletion(runId: string, maxWaitTime = 300000): Promise<ApolloContact[]> {
    const startTime = Date.now();
    const pollInterval = 5000; // Poll every 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check run status
        const runStatus = await this.getRunStatus(runId);
        
        if (!runStatus) {
          throw new Error('Failed to get run status');
        }

        logger.info(`Apify run ${runId} status: ${runStatus.status}`);

        if (runStatus.status === 'SUCCEEDED') {
          // Get results from dataset
          return await this.getRunResults(runId);
        }

        if (runStatus.status === 'FAILED' || runStatus.status === 'ABORTED' || runStatus.status === 'TIMED-OUT') {
          throw new Error(`Apify run failed with status: ${runStatus.status}`);
        }

        // Continue waiting if still running
        if (runStatus.status === 'RUNNING' || runStatus.status === 'READY') {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

      } catch (error) {
        logger.error('Error waiting for run completion:', error);
        throw error;
      }
    }

    throw new Error('Apollo.io search timed out');
  }

  /**
   * Get run status from Apify
   */
  private async getRunStatus(runId: string): Promise<ApifyRunResponse | null> {
    try {
      const url = `${this.baseUrl}/actor-runs/${runId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data.data;

    } catch (error) {
      logger.error('Failed to get run status:', error);
      return null;
    }
  }

  /**
   * Get results from Apify run dataset
   */
  private async getRunResults(runId: string): Promise<ApolloContact[]> {
    try {
      // First get the run details to get dataset ID
      const runDetails = await this.getRunStatus(runId);
      
      if (!runDetails || !runDetails.defaultDatasetId) {
        throw new Error('No dataset ID found for run');
      }

      const url = `${this.baseUrl}/datasets/${runDetails.defaultDatasetId}/items`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params: {
          format: 'json'
        }
      });

      const rawResults = response.data;
      
      if (!Array.isArray(rawResults)) {
        logger.warn('Unexpected dataset format, returning empty results');
        return [];
      }

      // Transform raw results to our contact format
      return rawResults.map(item => this.transformApifyResult(item));

    } catch (error) {
      logger.error('Failed to get run results:', error);
      return [];
    }
  }

  /**
   * Transform raw Apify result to our ApolloContact format
   */
  private transformApifyResult(item: any): ApolloContact {
    // Handle different possible data structures from the scraper
    return {
      id: item.id || item.apolloId || `apollo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      firstName: item.firstName || item.first_name || '',
      lastName: item.lastName || item.last_name || '',
      fullName: item.fullName || item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      email: item.email || item.emailAddress || undefined,
      emailStatus: item.emailStatus || (item.email ? 'verified' : 'unavailable'),
      phoneNumber: item.phoneNumber || item.phone || undefined,
      linkedinUrl: item.linkedinUrl || item.linkedin_url || undefined,
      title: item.title || item.jobTitle || item.position || 'Unknown',
      seniority: item.seniority || undefined,
      department: item.department || undefined,
      company: {
        name: item.companyName || item.company?.name || 'Unknown Company',
        domain: item.companyDomain || item.company?.domain || undefined,
        industry: item.companyIndustry || item.company?.industry || undefined,
        size: item.companySize || item.company?.size || undefined,
        location: item.companyLocation || item.company?.location || undefined,
        linkedinUrl: item.companyLinkedinUrl || item.company?.linkedinUrl || undefined
      },
      location: {
        city: item.city || item.location?.city || undefined,
        state: item.state || item.location?.state || undefined,
        country: item.country || item.location?.country || undefined
      }
    };
  }

  /**
   * Calculate estimated cost based on number of results
   * Apollo scraper costs $1.20 per 1,000 leads
   */
  private calculateCost(resultCount: number): number {
    const costPer1000 = 1.20;
    return Math.ceil(resultCount / 1000) * costPer1000;
  }

  /**
   * Get account usage and limits
   */
  async getUsageInfo(): Promise<{
    currentUsage: number;
    monthlyLimit?: number;
    remainingCredits?: number;
  }> {
    try {
      const url = `${this.baseUrl}/users/me`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const userData = response.data.data;

      return {
        currentUsage: userData.usageCurrentMonth?.platformUsageUsd || 0,
        monthlyLimit: userData.plan?.monthlyUsageLimit,
        remainingCredits: userData.plan?.availableCredits
      };

    } catch (error) {
      logger.error('Failed to get usage info:', error);
      return {
        currentUsage: 0
      };
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getUsageInfo();
      return true;
    } catch (error) {
      logger.error('Apollo service connection test failed:', error);
      return false;
    }
  }

  /**
   * Cancel a running Apify run
   */
  async cancelRun(runId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/actor-runs/${runId}/abort`;
      
      await axios.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return true;

    } catch (error) {
      logger.error('Failed to cancel run:', error);
      return false;
    }
  }

  /**
   * Get run logs for debugging
   */
  async getRunLogs(runId: string): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/actor-runs/${runId}/log`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      // Parse log entries from response
      const logText = response.data;
      return logText.split('\n').filter(line => line.trim());

    } catch (error) {
      logger.error('Failed to get run logs:', error);
      return [];
    }
  }
}

export default new ApolloService();