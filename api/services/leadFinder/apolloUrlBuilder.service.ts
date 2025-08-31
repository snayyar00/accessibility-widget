import logger from '../../utils/logger';

export interface ApolloSearchParams {
  // Company filters
  companyName?: string;
  industry?: string[];
  keywords?: string[];
  companySize?: ('1-10' | '11-50' | '51-200' | '201-1000' | '1001-5000' | '5001-10000' | '10000+')[];
  location?: string;
  country?: string[];
  state?: string[];
  city?: string[];
  
  // Contact filters
  jobTitles?: string[];
  seniority?: ('individual_contributor' | 'manager' | 'director' | 'vp' | 'c_level' | 'owner' | 'founder')[];
  department?: ('accounting' | 'administrative' | 'arts_and_design' | 'business_development' | 'community_and_social_services' | 'consulting' | 'education' | 'engineering' | 'entrepreneurship' | 'finance' | 'healthcare_services' | 'human_resources' | 'information_technology' | 'legal' | 'marketing' | 'media_and_communications' | 'military_and_protective_services' | 'operations' | 'product_management' | 'program_and_project_management' | 'purchasing' | 'quality_assurance' | 'real_estate' | 'research' | 'sales' | 'support')[];
  
  // Advanced contact filters
  personName?: string;
  contactLocation?: string[];
  emailStatus?: ('verified' | 'guessed' | 'unavailable')[];
  phoneStatus?: ('verified' | 'guessed' | 'unavailable')[];
  
  // Company characteristics
  revenue?: ('$0-1M' | '$1M-10M' | '$10M-50M' | '$50M-200M' | '$200M-1B' | '$1B+')[];
  fundingStage?: ('pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'series_e_and_later' | 'ipo' | 'acquired' | 'private_equity')[];
  yearFounded?: {
    min?: number;
    max?: number;
  };
  
  // Technical and Business Intelligence
  technologies?: string[];
  techCategories?: ('analytics' | 'advertising' | 'business_intelligence' | 'crm' | 'customer_support' | 'ecommerce' | 'email_marketing' | 'finance' | 'hr' | 'marketing_automation' | 'project_management' | 'sales' | 'social_media' | 'web_hosting')[];
  companyType?: ('public' | 'private' | 'partnership' | 'educational' | 'government' | 'non_profit')[];
  
  // Exclusion filters
  excludeCompanies?: string[];
  excludeIndustries?: string[];
  excludeLocations?: string[];
  excludeJobTitles?: string[];
  
  // Intent and Behavioral filters
  companyNews?: boolean; // Companies in the news
  recentHiring?: boolean; // Companies hiring recently
  jobChanges?: boolean; // People who changed jobs recently
  
  // Search configuration
  maxResults?: number;
  includeEmails?: boolean;
  includePhoneNumbers?: boolean;
  includeLinkedIn?: boolean;
  onlyVerifiedEmails?: boolean;
  
  // Advanced options
  similarCompanies?: string[]; // Find similar companies to these
  competitorAnalysis?: boolean;
  prospectingLists?: string[]; // Use existing Apollo lists
}

export interface ApolloUrlResult {
  url: string;
  searchParams: ApolloSearchParams;
  estimatedResults?: number;
  searchId: string;
}

class ApolloUrlBuilderService {
  private baseUrl = 'https://app.apollo.io';

  /**
   * Build Apollo.io search URL with specified parameters
   */
  buildSearchUrl(params: ApolloSearchParams): ApolloUrlResult {
    try {
      logger.info('Building Apollo.io search URL with params:', params);

      // Set default maxResults to 10 if not specified
      const searchParams = {
        ...params,
        maxResults: params.maxResults || 10
      };

      // Build URL parameters for Apollo.io search
      const urlParams = new URLSearchParams();

      // Company filters
      if (searchParams.companyName) {
        urlParams.append('companyName', searchParams.companyName);
      }

      if (searchParams.industry) {
        urlParams.append('industry', searchParams.industry);
      }

      if (searchParams.keywords && searchParams.keywords.length > 0) {
        urlParams.append('keywords', searchParams.keywords.join(','));
      }

      if (searchParams.companySize) {
        const sizeMapping = {
          startup: '1-10',
          small: '11-50',
          medium: '51-200',
          large: '201-1000',
          enterprise: '1000+'
        };
        urlParams.append('companySize', sizeMapping[searchParams.companySize]);
      }

      if (searchParams.location) {
        urlParams.append('location', searchParams.location);
      }

      if (searchParams.country) {
        urlParams.append('country', searchParams.country);
      }

      // Contact filters
      if (searchParams.jobTitles && searchParams.jobTitles.length > 0) {
        urlParams.append('jobTitles', searchParams.jobTitles.join(','));
      }

      if (searchParams.seniority) {
        const seniorityMapping = {
          individual_contributor: 'individual-contributor',
          manager: 'manager',
          director: 'director',
          vp: 'vp',
          c_level: 'c-level'
        };
        urlParams.append('seniority', seniorityMapping[searchParams.seniority]);
      }

      if (searchParams.department && searchParams.department.length > 0) {
        urlParams.append('departments', searchParams.department.join(','));
      }

      // Search configuration
      urlParams.append('limit', searchParams.maxResults.toString());

      if (searchParams.includeEmails) {
        urlParams.append('includeEmails', 'true');
      }

      if (searchParams.includePhoneNumbers) {
        urlParams.append('includePhones', 'true');
      }

      // Technical filters
      if (searchParams.technologies && searchParams.technologies.length > 0) {
        urlParams.append('technologies', searchParams.technologies.join(','));
      }

      if (searchParams.fundingStage) {
        urlParams.append('fundingStage', searchParams.fundingStage);
      }

      if (searchParams.revenue) {
        urlParams.append('revenue', searchParams.revenue);
      }

      // Build the final URL
      const searchUrl = `${this.baseUrl}/search/people?${urlParams.toString()}`;
      const searchId = this.generateSearchId(searchParams);

      logger.info(`Generated Apollo URL: ${searchUrl}`);

      return {
        url: searchUrl,
        searchParams,
        searchId,
        estimatedResults: this.estimateResults(searchParams)
      };

    } catch (error) {
      logger.error('Apollo URL building error:', error);
      throw new Error(`Failed to build Apollo URL: ${error.message}`);
    }
  }

  /**
   * Build people search URL specifically
   */
  buildPeopleSearchUrl(params: ApolloSearchParams): ApolloUrlResult {
    return this.buildSearchUrl({
      ...params,
      includeEmails: true,
      includePhoneNumbers: true
    });
  }

  /**
   * Build company search URL
   */
  buildCompanySearchUrl(params: ApolloSearchParams): ApolloUrlResult {
    const companyParams = { ...params };
    delete companyParams.jobTitles;
    delete companyParams.seniority;
    delete companyParams.department;

    const urlParams = new URLSearchParams();

    if (companyParams.companyName) {
      urlParams.append('name', companyParams.companyName);
    }

    if (companyParams.industry) {
      urlParams.append('industry', companyParams.industry);
    }

    if (companyParams.location) {
      urlParams.append('location', companyParams.location);
    }

    if (companyParams.companySize) {
      const sizeMapping = {
        startup: '1-10',
        small: '11-50',
        medium: '51-200',
        large: '201-1000',
        enterprise: '1000+'
      };
      urlParams.append('size', sizeMapping[companyParams.companySize]);
    }

    urlParams.append('limit', (companyParams.maxResults || 10).toString());

    const searchUrl = `${this.baseUrl}/search/companies?${urlParams.toString()}`;
    const searchId = this.generateSearchId(companyParams);

    return {
      url: searchUrl,
      searchParams: companyParams,
      searchId,
      estimatedResults: this.estimateResults(companyParams)
    };
  }

  /**
   * Convert Lead Finder search to Apollo search parameters
   */
  convertFromLeadFinderSearch(category: string, location: string, maxResults = 10): ApolloSearchParams {
    logger.info(`Converting Lead Finder search to Apollo params: ${category} in ${location}`);

    // Map common business categories to Apollo industries/keywords
    const industryMappings = {
      'restaurants': { industry: 'Food & Beverages', keywords: ['restaurant', 'dining', 'food service'] },
      'retail stores': { industry: 'Retail', keywords: ['retail', 'store', 'shop'] },
      'consulting services': { industry: 'Consulting', keywords: ['consulting', 'advisory', 'professional services'] },
      'real estate agencies': { industry: 'Real Estate', keywords: ['real estate', 'property', 'realty'] },
      'accounting firms': { industry: 'Accounting', keywords: ['accounting', 'bookkeeping', 'tax'] },
      'law firms': { industry: 'Legal Services', keywords: ['law', 'legal', 'attorney'] },
      'medical practices': { industry: 'Healthcare', keywords: ['medical', 'healthcare', 'clinic'] },
      'hair salons': { industry: 'Personal Care Services', keywords: ['salon', 'beauty', 'hair'] },
      'auto repair shops': { industry: 'Automotive', keywords: ['auto repair', 'automotive', 'mechanic'] },
      'fitness centers': { industry: 'Fitness', keywords: ['fitness', 'gym', 'wellness'] }
    };

    const categoryLower = category.toLowerCase();
    const mapping = industryMappings[categoryLower];

    const apolloParams: ApolloSearchParams = {
      maxResults,
      includeEmails: true,
      includePhoneNumbers: true
    };

    if (mapping) {
      apolloParams.industry = mapping.industry;
      apolloParams.keywords = mapping.keywords;
    } else {
      // Fallback: use category as keywords
      apolloParams.keywords = [category];
    }

    // Handle location
    if (location && location !== '' && location !== 'Global (Worldwide)') {
      // Check if it's a country or city
      const countries = [
        'United States', 'Canada', 'United Kingdom', 'Germany', 
        'France', 'Australia', 'India', 'Singapore', 'Netherlands', 
        'Sweden', 'Japan'
      ];
      
      if (countries.includes(location)) {
        apolloParams.country = location;
      } else {
        apolloParams.location = location;
      }
    }

    // Default job titles for business owners/decision makers
    apolloParams.jobTitles = [
      'CEO', 'Founder', 'Owner', 'President', 'Director', 
      'Manager', 'VP', 'Chief', 'Principal'
    ];
    
    apolloParams.seniority = 'c_level';

    logger.info('Converted Apollo params:', apolloParams);

    return apolloParams;
  }

  /**
   * Generate lead count options for UI
   */
  getLeadCountOptions(): Array<{ value: number; label: string; recommended?: boolean }> {
    return [
      { value: 10, label: '10 leads', recommended: true },
      { value: 25, label: '25 leads' },
      { value: 50, label: '50 leads' },
      { value: 100, label: '100 leads' },
      { value: 250, label: '250 leads' },
      { value: 500, label: '500 leads' }
    ];
  }

  /**
   * Validate search parameters
   */
  validateSearchParams(params: ApolloSearchParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if at least one search criterion is provided
    if (!params.companyName && !params.industry && !params.keywords && !params.jobTitles) {
      errors.push('At least one search criterion must be provided (company name, industry, keywords, or job titles)');
    }

    // Validate maxResults
    if (params.maxResults && (params.maxResults < 1 || params.maxResults > 1000)) {
      errors.push('maxResults must be between 1 and 1000');
    }

    // Validate arrays are not empty
    if (params.keywords && params.keywords.length === 0) {
      errors.push('Keywords array cannot be empty');
    }

    if (params.jobTitles && params.jobTitles.length === 0) {
      errors.push('Job titles array cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique search ID for tracking
   */
  private generateSearchId(params: ApolloSearchParams): string {
    const timestamp = Date.now();
    const hash = this.hashObject(params);
    return `apollo_search_${timestamp}_${hash}`;
  }

  /**
   * Simple object hash function
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Estimate result count based on parameters
   */
  private estimateResults(params: ApolloSearchParams): number {
    let estimate = 10000; // Base estimate

    // Reduce estimate based on specificity
    if (params.companyName) estimate *= 0.1;
    if (params.industry) estimate *= 0.3;
    if (params.location) estimate *= 0.4;
    if (params.jobTitles && params.jobTitles.length > 0) estimate *= 0.5;
    if (params.seniority) estimate *= 0.6;
    if (params.companySize) estimate *= 0.7;

    // Ensure minimum and maximum bounds
    const result = Math.max(50, Math.min(50000, Math.round(estimate)));
    
    // Don't exceed maxResults
    return params.maxResults ? Math.min(result, params.maxResults) : result;
  }
}

export default new ApolloUrlBuilderService();