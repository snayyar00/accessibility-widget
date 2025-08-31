import axios from 'axios';
import logger from '../../utils/logger';

export interface EmailFinderRequest {
  first_name?: string;
  last_name?: string;
  domain: string;
  company_name?: string;
}

export interface DomainSearchResponse {
  domain: string;
  company_name?: string;
  format: string;
  confidence: 'high' | 'medium' | 'low';
  other_domain_formats?: Array<{
    format: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

export interface EmailFinderResponse {
  email?: string;
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse' | 'do_not_mail';
  sub_status?: string;
  confidence: number;
  first_name?: string;
  last_name?: string;
  domain: string;
  mx_found: boolean;
  mx_record?: string;
  smtp_provider?: string;
  did_you_mean?: string;
}

export interface GenericEmailResponse {
  emails: Array<{
    email: string;
    confidence: number;
    type: 'generic' | 'personal';
  }>;
  domain: string;
  company_name?: string;
}

export interface EmailValidationResponse {
  address: string;
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse' | 'do_not_mail';
  sub_status?: string;
  free_email: boolean;
  did_you_mean?: string;
  account?: string;
  domain?: string;
  domain_age_days?: number;
  smtp_provider?: string;
  mx_found: boolean;
  mx_record?: string;
  firstname?: string;
  lastname?: string;
  gender?: string;
  country?: string;
  region?: string;
  city?: string;
  zipcode?: string;
  processed_at: string;
}

class ZeroBounceService {
  private apiKey: string;
  private baseUrl = 'https://api.zerobounce.net/v2';

  constructor() {
    this.apiKey = process.env.ZEROBOUNCE_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('ZeroBounce API key not found in environment variables');
    }
  }

  /**
   * Get email format patterns for a domain using Domain Search API
   */
  async getDomainFormats(domain: string, companyName?: string): Promise<DomainSearchResponse | null> {
    if (!this.apiKey) {
      throw new Error('ZeroBounce API key not configured');
    }

    try {
      const url = `${this.baseUrl}/guessformat`;
      const params: any = {
        api_key: this.apiKey,
        domain: domain
      };

      if (companyName) {
        params.company_name = companyName;
      }

      logger.info(`Getting email format for domain: ${domain}`);

      const response = await axios.get(url, { params });

      if (response.data.error) {
        logger.warn(`ZeroBounce Domain Search error: ${response.data.error}`);
        return null;
      }

      logger.info(`ZeroBounce Domain Search success for ${domain}:`, response.data);
      return response.data;

    } catch (error) {
      logger.error('ZeroBounce domain search error:', error);
      return null;
    }
  }

  /**
   * Construct email based on format pattern
   */
  constructEmail(firstName: string, lastName: string, domain: string, format: string): string {
    const first = firstName.toLowerCase();
    const last = lastName.toLowerCase();
    
    switch (format) {
      case 'first.last':
        return `${first}.${last}@${domain}`;
      case 'first_last':
        return `${first}_${last}@${domain}`;
      case 'firstlast':
        return `${first}${last}@${domain}`;
      case 'first':
        return `${first}@${domain}`;
      case 'last.first':
        return `${last}.${first}@${domain}`;
      case 'last_first':
        return `${last}_${first}@${domain}`;
      case 'lastfirst':
        return `${last}${first}@${domain}`;
      case 'last':
        return `${last}@${domain}`;
      case 'f.last':
        return `${first.charAt(0)}.${last}@${domain}`;
      case 'first.l':
        return `${first}.${last.charAt(0)}@${domain}`;
      case 'flast':
        return `${first.charAt(0)}${last}@${domain}`;
      case 'firstl':
        return `${first}${last.charAt(0)}@${domain}`;
      default:
        return `${first}.${last}@${domain}`; // Default to first.last
    }
  }

  /**
   * Find email for a specific person at a domain using Domain Search + Email Construction
   */
  async findPersonEmail(request: EmailFinderRequest): Promise<EmailFinderResponse | null> {
    if (!this.apiKey) {
      throw new Error('ZeroBounce API key not configured');
    }

    if (!request.domain) {
      throw new Error('Domain is required for email lookup');
    }

    // If no names provided, try generic email discovery
    if (!request.first_name || !request.last_name) {
      logger.info(`No names provided, trying generic emails for domain: ${request.domain}`);
      const genericResult = await this.findGenericEmails(request.domain);
      
      if (genericResult.emails.length > 0) {
        const bestEmail = genericResult.emails[0];
        return {
          email: bestEmail.email,
          status: 'valid',
          confidence: bestEmail.confidence,
          domain: request.domain,
          mx_found: true
        };
      }
      
      return null;
    }

    try {
      // Step 1: Get domain email formats
      const domainFormats = await this.getDomainFormats(request.domain, request.company_name);
      
      if (!domainFormats) {
        // Fallback to common patterns if domain search fails
        const commonFormats = ['first.last', 'firstlast', 'first', 'f.last'];
        
        for (const format of commonFormats) {
          const email = this.constructEmail(request.first_name, request.last_name, request.domain, format);
          
          try {
            const validation = await this.validateEmail(email);
            if (validation.status === 'valid' || validation.status === 'catch-all') {
              return {
                email,
                status: validation.status,
                confidence: this.getConfidenceScore(validation.status),
                first_name: request.first_name,
                last_name: request.last_name,
                domain: request.domain,
                mx_found: validation.mx_found,
                mx_record: validation.mx_record,
                smtp_provider: validation.smtp_provider
              };
            }
          } catch (error) {
            // Continue to next format
            continue;
          }
        }
        
        return null;
      }

      // Step 2: Try the main format first
      const primaryEmail = this.constructEmail(
        request.first_name, 
        request.last_name, 
        request.domain, 
        domainFormats.format
      );

      logger.info(`Trying primary email format: ${primaryEmail}`);

      // For high confidence formats, return without validation to save credits
      if (domainFormats.confidence === 'high') {
        return {
          email: primaryEmail,
          status: 'valid',
          confidence: 90,
          first_name: request.first_name,
          last_name: request.last_name,
          domain: request.domain,
          mx_found: true
        };
      }

      // For lower confidence, validate the email
      try {
        const validation = await this.validateEmail(primaryEmail);
        if (validation.status === 'valid' || validation.status === 'catch-all') {
          return {
            email: primaryEmail,
            status: validation.status,
            confidence: this.getConfidenceScore(validation.status),
            first_name: request.first_name,
            last_name: request.last_name,
            domain: request.domain,
            mx_found: validation.mx_found,
            mx_record: validation.mx_record,
            smtp_provider: validation.smtp_provider
          };
        }
      } catch (error) {
        logger.warn(`Validation failed for ${primaryEmail}, trying other formats`);
      }

      // Step 3: Try other formats if available
      if (domainFormats.other_domain_formats) {
        for (const altFormat of domainFormats.other_domain_formats) {
          const email = this.constructEmail(
            request.first_name,
            request.last_name,
            request.domain,
            altFormat.format
          );

          if (altFormat.confidence === 'high') {
            return {
              email,
              status: 'valid',
              confidence: 85,
              first_name: request.first_name,
              last_name: request.last_name,
              domain: request.domain,
              mx_found: true
            };
          }
        }
      }

      return null;

    } catch (error) {
      logger.error('ZeroBounce person email finder error:', error);
      throw error;
    }
  }

  /**
   * Find generic business emails for a domain using Domain Search
   */
  async findGenericEmails(domain: string): Promise<GenericEmailResponse> {
    if (!this.apiKey) {
      throw new Error('ZeroBounce API key not configured');
    }

    try {
      // First, try to get domain format patterns
      const domainFormats = await this.getDomainFormats(domain);
      
      if (domainFormats && domainFormats.format) {
        // Use the discovered format with generic names
        const genericPatterns = ['info', 'contact', 'support', 'sales', 'hello'];
        const emails = [];

        for (const pattern of genericPatterns) {
          // Try to construct email using discovered format
          let email;
          if (domainFormats.format === 'first' || domainFormats.format.includes('first')) {
            email = `${pattern}@${domain}`;
          } else {
            email = `${pattern}@${domain}`;
          }

          emails.push({
            email,
            confidence: domainFormats.confidence === 'high' ? 85 : 70,
            type: 'generic' as const
          });
        }

        return {
          emails: emails.slice(0, 3), // Return top 3
          domain,
          company_name: domainFormats.company_name
        };
      }

      // Fallback: return common generic emails without validation
      const commonEmails = [
        { email: `info@${domain}`, confidence: 60, type: 'generic' as const },
        { email: `contact@${domain}`, confidence: 60, type: 'generic' as const },
        { email: `hello@${domain}`, confidence: 50, type: 'generic' as const }
      ];

      return {
        emails: commonEmails,
        domain,
        company_name: undefined
      };

    } catch (error) {
      logger.error('ZeroBounce generic email finder error:', error);
      
      // Fallback: return common generic emails
      const fallbackEmails = [
        { email: `info@${domain}`, confidence: 50, type: 'generic' as const },
        { email: `contact@${domain}`, confidence: 50, type: 'generic' as const }
      ];

      return {
        emails: fallbackEmails,
        domain,
        company_name: undefined
      };
    }
  }

  /**
   * Validate an email address
   */
  async validateEmail(email: string): Promise<EmailValidationResponse> {
    if (!this.apiKey) {
      throw new Error('ZeroBounce API key not configured');
    }

    try {
      const url = `${this.baseUrl}/validate`;
      const params = {
        api_key: this.apiKey,
        email: email,
        ip_address: '' // Optional IP address
      };

      const response = await axios.get(url, { params });

      if (response.data.error) {
        throw new Error(`ZeroBounce validation error: ${response.data.error}`);
      }

      return response.data;

    } catch (error) {
      logger.error('ZeroBounce email validation error:', error);
      throw error;
    }
  }

  /**
   * Get account credits remaining
   */
  async getCredits(): Promise<number> {
    if (!this.apiKey) {
      throw new Error('ZeroBounce API key not configured');
    }

    try {
      const url = `${this.baseUrl}/getcredits`;
      const params = {
        api_key: this.apiKey
      };

      const response = await axios.get(url, { params });

      if (response.data.error) {
        throw new Error(`ZeroBounce credits error: ${response.data.error}`);
      }

      return parseInt(response.data.Credits || '0');

    } catch (error) {
      logger.error('ZeroBounce credits check error:', error);
      throw error;
    }
  }

  /**
   * Find any email for a domain (tries person first, then generic)
   */
  async findAnyEmail(
    domain: string,
    firstName?: string,
    lastName?: string,
    companyName?: string
  ): Promise<EmailFinderResponse | null> {
    try {
      // Try person email first if names provided
      if (firstName && lastName) {
        const personEmail = await this.findPersonEmail({
          first_name: firstName,
          last_name: lastName,
          domain,
          company_name: companyName
        });

        if (personEmail) {
          return personEmail;
        }
      }

      // Fall back to generic emails
      const genericEmails = await this.findGenericEmails(domain);
      
      if (genericEmails.emails.length > 0) {
        const bestEmail = genericEmails.emails[0]; // Take the first (highest confidence)
        
        return {
          email: bestEmail.email,
          status: 'valid',
          confidence: bestEmail.confidence,
          domain,
          mx_found: true,
          first_name: firstName,
          last_name: lastName
        };
      }

      return null;

    } catch (error) {
      logger.error('ZeroBounce find any email error:', error);
      throw error;
    }
  }

  /**
   * Bulk email validation
   */
  async validateBulkEmails(emails: string[]): Promise<EmailValidationResponse[]> {
    if (!this.apiKey) {
      throw new Error('ZeroBounce API key not configured');
    }

    try {
      // ZeroBounce bulk validation requires file upload
      // For now, validate individually (less efficient but simpler)
      const results = [];
      
      for (const email of emails) {
        try {
          const result = await this.validateEmail(email);
          results.push(result);
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.warn(`Failed to validate email ${email}:`, error);
          // Add failed result
          results.push({
            address: email,
            status: 'unknown' as const,
            free_email: false,
            mx_found: false,
            processed_at: new Date().toISOString()
          });
        }
      }

      return results;

    } catch (error) {
      logger.error('ZeroBounce bulk validation error:', error);
      throw error;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Check API status
   */
  async checkApiStatus(): Promise<boolean> {
    try {
      await this.getCredits();
      return true;
    } catch (error) {
      logger.error('ZeroBounce API status check failed:', error);
      return false;
    }
  }

  /**
   * Extract confidence score for display
   */
  getConfidenceScore(status: string): number {
    switch (status) {
      case 'valid':
        return 95;
      case 'catch-all':
        return 75;
      case 'unknown':
        return 50;
      case 'invalid':
      case 'spamtrap':
      case 'abuse':
      case 'do_not_mail':
        return 0;
      default:
        return 25;
    }
  }

  /**
   * Determine email type (personal vs generic)
   */
  getEmailType(email: string): 'personal' | 'generic' {
    const localPart = email.split('@')[0].toLowerCase();
    
    const genericPatterns = [
      'info', 'contact', 'hello', 'support', 'sales', 'admin',
      'help', 'service', 'office', 'general', 'inquiry', 'team'
    ];

    return genericPatterns.some(pattern => localPart.includes(pattern)) 
      ? 'generic' 
      : 'personal';
  }
}

export default new ZeroBounceService();