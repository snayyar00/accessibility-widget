import googlePlacesService, { GooglePlaceSearchParams } from './googlePlaces.service';
import zeroBounceService from './zerobounce.service';
import logger from '../../utils/logger';

export interface LeadSearchRequest {
  category: string;
  location: string;
  radius?: number;
  userId: number;
  organizationId?: number;
}

export interface Lead {
  id?: string;
  googlePlaceId?: string;
  businessName: string;
  website?: string;
  address?: string;
  phone?: string;
  category?: string;
  locationLat?: number;
  locationLng?: number;
  emails?: Array<{
    email: string;
    type: 'personal' | 'generic';
    confidence: number;
    firstName?: string;
    lastName?: string;
  }>;
  source: string;
  userId: number;
  organizationId?: number;
}

export interface EmailDiscoveryRequest {
  leadId: string;
  domain: string;
  firstName?: string;
  lastName?: string;
  userId: number;
}

export interface LeadSearchResult {
  leads: Lead[];
  totalCount: number;
  searchParams: LeadSearchRequest;
  nextPageToken?: string;
}

class LeadFinderService {
  
  /**
   * Search for businesses and convert to leads
   */
  async searchLeads(request: LeadSearchRequest): Promise<LeadSearchResult> {
    try {
      logger.info(`Searching leads for user ${request.userId}: ${request.category} in ${request.location}`);

      // Search using Google Places
      const searchParams: GooglePlaceSearchParams = {
        category: request.category,
        location: request.location,
        radius: request.radius || 5000
      };

      const placesResult = await googlePlacesService.searchBusinesses(searchParams);

      if (placesResult.status === 'ZERO_RESULTS') {
        return {
          leads: [],
          totalCount: 0,
          searchParams: request,
          nextPageToken: undefined
        };
      }

      // Convert Google Places to our Lead format
      const leads: Lead[] = placesResult.places.map(place => ({
        ...googlePlacesService.convertToLead(place),
        userId: request.userId,
        organizationId: request.organizationId,
        emails: []
      }));

      // TODO: Save search to database
      // await this.saveSearchHistory(request, leads.length);

      return {
        leads,
        totalCount: leads.length,
        searchParams: request,
        nextPageToken: placesResult.next_page_token
      };

    } catch (error) {
      logger.error('Lead search error:', error);
      throw new Error(`Failed to search leads: ${error.message}`);
    }
  }

  /**
   * Find email for a specific lead
   */
  async findEmailForLead(request: EmailDiscoveryRequest): Promise<any> {
    try {
      logger.info(`Finding email for lead ${request.leadId}, domain: ${request.domain}`);

      // Clean domain (remove www, protocol, etc.)
      const cleanDomain = this.cleanDomain(request.domain);
      
      if (!cleanDomain) {
        throw new Error('Invalid domain provided');
      }

      // Try to find email using ZeroBounce
      const emailResult = await zeroBounceService.findAnyEmail(
        cleanDomain,
        request.firstName,
        request.lastName
      );

      if (!emailResult || !emailResult.email) {
        return null;
      }

      // Format response
      const emailData = {
        email: emailResult.email,
        type: zeroBounceService.getEmailType(emailResult.email),
        confidence: emailResult.confidence || zeroBounceService.getConfidenceScore(emailResult.status),
        firstName: request.firstName,
        lastName: request.lastName,
        status: emailResult.status,
        verified: emailResult.status === 'valid'
      };

      // TODO: Save email discovery to database
      // await this.saveEmailDiscovery(request, emailData);

      return emailData;

    } catch (error) {
      logger.error('Email discovery error:', error);
      throw new Error(`Failed to find email: ${error.message}`);
    }
  }

  /**
   * Bulk email discovery for multiple leads
   */
  async findEmailsForLeads(leads: Lead[], userId: number): Promise<Lead[]> {
    const updatedLeads = [...leads];

    for (let i = 0; i < updatedLeads.length; i++) {
      const lead = updatedLeads[i];
      
      if (!lead.website) {
        continue;
      }

      try {
        const domain = this.extractDomain(lead.website);
        if (!domain) continue;

        const emailResult = await this.findEmailForLead({
          leadId: lead.id || `temp_${i}`,
          domain,
          userId
        });

        if (emailResult) {
          updatedLeads[i] = {
            ...lead,
            emails: [emailResult]
          };
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.warn(`Failed to find email for lead ${lead.id}:`, error);
        continue;
      }
    }

    return updatedLeads;
  }

  /**
   * Save a lead to the database
   */
  async saveLead(lead: Lead): Promise<Lead> {
    try {
      // TODO: Implement database save
      logger.info(`Saving lead: ${lead.businessName}`);
      
      // For now, just return the lead with an ID
      return {
        ...lead,
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

    } catch (error) {
      logger.error('Save lead error:', error);
      throw new Error(`Failed to save lead: ${error.message}`);
    }
  }

  /**
   * Get saved leads for a user
   */
  async getUserLeads(userId: number, organizationId?: number): Promise<Lead[]> {
    try {
      // TODO: Implement database query
      logger.info(`Getting leads for user ${userId}`);
      
      return [];

    } catch (error) {
      logger.error('Get user leads error:', error);
      throw new Error(`Failed to get user leads: ${error.message}`);
    }
  }

  /**
   * Generate accessibility report for a lead
   */
  async generateAccessibilityReport(lead: Lead): Promise<string> {
    try {
      if (!lead.website) {
        throw new Error('Website required for accessibility report');
      }

      const domain = this.extractDomain(lead.website);
      if (!domain) {
        throw new Error('Invalid website URL');
      }

      // TODO: Integrate with existing accessibility scanner
      logger.info(`Generating accessibility report for ${domain}`);
      
      // For now, return a placeholder report URL
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return `/reports/${reportId}`;

    } catch (error) {
      logger.error('Generate report error:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Export leads to CSV format
   */
  exportLeadsToCSV(leads: Lead[]): string {
    const headers = [
      'Business Name',
      'Website',
      'Address',
      'Phone',
      'Category',
      'Email',
      'Email Type',
      'Email Confidence',
      'Google Place ID'
    ];

    const rows = leads.map(lead => {
      if (lead.emails && lead.emails.length > 0) {
        return lead.emails.map(email => [
          lead.businessName,
          lead.website || '',
          lead.address || '',
          lead.phone || '',
          lead.category || '',
          email.email,
          email.type,
          email.confidence.toString(),
          lead.googlePlaceId || ''
        ]);
      } else {
        return [[
          lead.businessName,
          lead.website || '',
          lead.address || '',
          lead.phone || '',
          lead.category || '',
          '',
          '',
          '',
          lead.googlePlaceId || ''
        ]];
      }
    }).flat();

    return [headers, ...rows]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /**
   * Check service status
   */
  async checkServicesStatus(): Promise<{
    googlePlaces: boolean;
    zeroBounce: boolean;
    credits?: number;
  }> {
    try {
      const [googleStatus, zeroBounceStatus] = await Promise.all([
        googlePlacesService.isConfigured(),
        zeroBounceService.checkApiStatus()
      ]);

      let credits;
      try {
        credits = await zeroBounceService.getCredits();
      } catch (error) {
        logger.warn('Could not fetch ZeroBounce credits:', error);
      }

      return {
        googlePlaces: googleStatus,
        zeroBounce: zeroBounceStatus,
        credits
      };

    } catch (error) {
      logger.error('Service status check error:', error);
      return {
        googlePlaces: false,
        zeroBounce: false
      };
    }
  }

  /**
   * Private helper methods
   */
  private cleanDomain(domain: string): string | null {
    if (!domain) return null;

    try {
      // Remove protocol if present
      let cleaned = domain.replace(/^https?:\/\//, '');
      
      // Remove www
      cleaned = cleaned.replace(/^www\./, '');
      
      // Remove path, query, etc.
      cleaned = cleaned.split('/')[0];
      cleaned = cleaned.split('?')[0];
      cleaned = cleaned.split('#')[0];
      
      // Basic domain validation
      if (cleaned.includes('.') && cleaned.length > 3) {
        return cleaned.toLowerCase();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractDomain(website: string): string | null {
    return googlePlacesService.extractDomain(website);
  }

  /**
   * Save search history to database
   */
  private async saveSearchHistory(request: LeadSearchRequest, resultCount: number): Promise<void> {
    try {
      // TODO: Implement database save
      logger.info(`Saving search history: ${request.category} in ${request.location} - ${resultCount} results`);
    } catch (error) {
      logger.error('Save search history error:', error);
    }
  }

  /**
   * Save email discovery to database
   */
  private async saveEmailDiscovery(request: EmailDiscoveryRequest, emailData: any): Promise<void> {
    try {
      // TODO: Implement database save
      logger.info(`Saving email discovery: ${emailData.email} for lead ${request.leadId}`);
    } catch (error) {
      logger.error('Save email discovery error:', error);
    }
  }
}

export default new LeadFinderService();