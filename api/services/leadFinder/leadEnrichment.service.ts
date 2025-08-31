import logger from '../../utils/logger';
import apolloService, { ApolloContact, ApolloSearchResult } from './apollo.service';
import zeroBounceService from './zerobounce.service';
import googlePlacesService from './googlePlaces.service';
import apolloUrlBuilderService, { ApolloSearchParams } from './apolloUrlBuilder.service';
import leadFinderService, { Lead, LeadSearchRequest } from './leadFinder.service';

export interface EnrichedLead extends Lead {
  // Apollo data
  apolloContacts?: ApolloContact[];
  decisionMakers?: Array<{
    name: string;
    title: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    seniority?: string;
    department?: string;
  }>;
  
  // Enhanced company data
  companySize?: string;
  industry?: string;
  technologies?: string[];
  linkedinUrl?: string;
  
  // Enrichment metadata
  enrichmentSources: string[];
  enrichedAt: Date;
  dataConfidence: number;
}

export interface LeadEnrichmentOptions {
  includeApolloData?: boolean;
  includeEmailDiscovery?: boolean;
  apolloOnly?: boolean; // New option: Skip ZeroBounce entirely
  maxContactsPerLead?: number;
  targetJobTitles?: string[];
  minConfidence?: number;
}

export interface EnrichmentResult {
  enrichedLeads: EnrichedLead[];
  totalProcessed: number;
  successfulEnrichments: number;
  apolloSearches: number;
  emailsFound: number;
  costEstimate: {
    apolloCost: number;
    zeroBounceCredits: number;
    totalEstimate: number;
  };
  processingTime: number;
}

class LeadEnrichmentService {
  
  /**
   * Enrich leads from Lead Finder with Apollo.io and email discovery
   */
  async enrichLeads(
    leads: Lead[], 
    options: LeadEnrichmentOptions = {}
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const enrichedLeads: EnrichedLead[] = [];
    let apolloSearches = 0;
    let emailsFound = 0;
    let apolloCost = 0;
    let zeroBounceCredits = 0;

    const defaultOptions: LeadEnrichmentOptions = {
      includeApolloData: true,
      includeEmailDiscovery: true,
      maxContactsPerLead: 5,
      targetJobTitles: ['CEO', 'Founder', 'Owner', 'President', 'Director', 'Manager'],
      minConfidence: 70,
      ...options
    };

    logger.info(`🚀 Starting PARALLEL lead enrichment for ${leads.length} leads with options:`, defaultOptions);

    // Process ALL leads in parallel for maximum speed
    const enrichmentPromises = leads.map(async (lead) => {
      try {
        return await this.enrichSingleLead(lead, defaultOptions);
      } catch (error) {
        logger.warn(`Failed to enrich lead ${lead.businessName}:`, error);
        
        // Return lead without enrichment
        return {
          ...lead,
          enrichmentSources: [],
          enrichedAt: new Date(),
          dataConfidence: 0
        };
      }
    });

    // Wait for ALL enrichments to complete in parallel
    enrichedLeads = await Promise.all(enrichmentPromises);
    
    // Calculate metrics after all processing is done
    enrichedLeads.forEach(enrichedLead => {
      // Track metrics
      if (enrichedLead.apolloContacts && enrichedLead.apolloContacts.length > 0) {
        apolloSearches++;
        apolloCost += apolloService['calculateCost'](enrichedLead.apolloContacts.length);
      }

      if (enrichedLead.emails && enrichedLead.emails.length > 0) {
        emailsFound += enrichedLead.emails.length;
        
        // Only count ZeroBounce cost if we actually used ZeroBounce
        const zeroBounceEmailsCount = enrichedLead.emails.filter(email => email.source === 'zerobounce').length;
        zeroBounceCredits += zeroBounceEmailsCount;
        
        logger.info(`Lead ${enrichedLead.businessName}: ${enrichedLead.emails.length} emails found (${enrichedLead.emails.filter(e => e.source === 'apollo').length} from Apollo, ${zeroBounceEmailsCount} from ZeroBounce)`);
      }
    });

    const processingTime = Date.now() - startTime;

    return {
      enrichedLeads,
      totalProcessed: leads.length,
      successfulEnrichments: enrichedLeads.filter(l => l.enrichmentSources.length > 0).length,
      apolloSearches,
      emailsFound,
      costEstimate: {
        apolloCost,
        zeroBounceCredits,
        totalEstimate: apolloCost + (zeroBounceCredits * 0.01) // Estimate ZB cost
      },
      processingTime
    };
  }

  /**
   * Enrich a single lead with all available data sources
   */
  private async enrichSingleLead(
    lead: Lead, 
    options: LeadEnrichmentOptions
  ): Promise<EnrichedLead> {
    logger.info(`Enriching lead: ${lead.businessName}`);

    const enrichedLead: EnrichedLead = {
      ...lead,
      enrichmentSources: [],
      enrichedAt: new Date(),
      dataConfidence: 50 // Base confidence
    };

    // 1. Apollo.io enrichment
    if (options.includeApolloData && apolloService.isConfigured()) {
      try {
        const apolloData = await this.getApolloDataForLead(lead, options);
        if (apolloData) {
          enrichedLead.apolloContacts = apolloData.contacts;
          enrichedLead.decisionMakers = this.extractDecisionMakers(apolloData.contacts);
          enrichedLead.enrichmentSources.push('apollo');
          enrichedLead.dataConfidence += 30;

          // Enhance company data from Apollo
          if (apolloData.contacts.length > 0) {
            const firstContact = apolloData.contacts[0];
            enrichedLead.companySize = firstContact.company.size;
            enrichedLead.industry = firstContact.company.industry;
            enrichedLead.linkedinUrl = firstContact.company.linkedinUrl;
          }
        }
      } catch (error) {
        logger.warn(`Apollo enrichment failed for ${lead.businessName}:`, error);
      }
    }

    // 2. Extract emails from Apollo contacts first (no additional cost!)
    if (enrichedLead.apolloContacts && enrichedLead.apolloContacts.length > 0) {
      const apolloEmails = enrichedLead.apolloContacts
        .filter(contact => contact.email && contact.email.trim())
        .map(contact => ({
          email: contact.email,
          type: contact.emailStatus === 'verified' ? 'verified' : 'guessed',
          confidence: contact.emailStatus === 'verified' ? 95 : 75,
          status: 'valid',
          verified: contact.emailStatus === 'verified',
          firstName: contact.firstName,
          lastName: contact.lastName,
          source: 'apollo'
        }));

      if (apolloEmails.length > 0) {
        enrichedLead.emails = apolloEmails;
        logger.info(`Found ${apolloEmails.length} emails from Apollo for ${lead.businessName} - skipping ZeroBounce`);
      }
    }

    // 3. FALLBACK: Only use ZeroBounce if no emails from Apollo AND not Apollo-only mode
    if (options.includeEmailDiscovery && 
        !options.apolloOnly &&
        zeroBounceService.isConfigured() && 
        (!enrichedLead.emails || enrichedLead.emails.length === 0)) {
      
      logger.info(`No emails from Apollo for ${lead.businessName} - trying ZeroBounce as fallback`);
      try {
        const emailData = await this.discoverEmailsForLead(lead, options);
        if (emailData && emailData.length > 0) {
          enrichedLead.emails = emailData;
          enrichedLead.enrichmentSources.push('zerobounce');
          enrichedLead.dataConfidence += 20;
        }
      } catch (error) {
        logger.warn(`Email discovery failed for ${lead.businessName}:`, error);
      }
    } else if (options.apolloOnly && (!enrichedLead.emails || enrichedLead.emails.length === 0)) {
      logger.info(`Apollo-only mode: Skipping ZeroBounce fallback for ${lead.businessName}`);
    }

    logger.info(`Enriched lead ${lead.businessName} with sources: ${enrichedLead.enrichmentSources.join(', ')}`);
    return enrichedLead;
  }

  /**
   * Get Apollo.io data for a lead
   */
  private async getApolloDataForLead(
    lead: Lead, 
    options: LeadEnrichmentOptions
  ): Promise<ApolloSearchResult | null> {
    try {
      // Build Apollo search parameters from lead data
      const apolloParams: ApolloSearchParams = {
        companyName: lead.businessName,
        maxResults: options.maxContactsPerLead || 5,
        includeEmails: true,
        includePhoneNumbers: true
      };

      // Add location if available
      if (lead.address) {
        apolloParams.location = lead.address;
      }

      // Add job titles filter
      if (options.targetJobTitles && options.targetJobTitles.length > 0) {
        apolloParams.jobTitles = options.targetJobTitles;
        apolloParams.seniority = 'c_level';
      }

      // Try to extract domain from website for better matching
      if (lead.website) {
        const domain = googlePlacesService.extractDomain(lead.website);
        if (domain) {
          apolloParams.keywords = [domain.split('.')[0]]; // Use domain as keyword
        }
      }

      return await apolloService.searchContacts(apolloParams);

    } catch (error) {
      logger.error('Apollo data retrieval error:', error);
      return null;
    }
  }

  /**
   * Discover emails for a lead using ZeroBounce
   */
  private async discoverEmailsForLead(
    lead: Lead, 
    options: LeadEnrichmentOptions
  ): Promise<Array<any> | null> {
    try {
      if (!lead.website) {
        return null;
      }

      const domain = googlePlacesService.extractDomain(lead.website);
      if (!domain) {
        return null;
      }

      // Try to find any email for the domain
      const emailResult = await zeroBounceService.findAnyEmail(domain, undefined, undefined, lead.businessName);
      
      if (emailResult) {
        return [{
          email: emailResult.email,
          type: zeroBounceService.getEmailType(emailResult.email),
          confidence: emailResult.confidence,
          status: emailResult.status,
          verified: emailResult.status === 'valid',
          source: 'zerobounce'
        }];
      }

      return null;

    } catch (error) {
      logger.error('Email discovery error:', error);
      return null;
    }
  }

  /**
   * Extract decision makers from Apollo contacts
   */
  private extractDecisionMakers(contacts: ApolloContact[]): Array<any> {
    const decisionMakerTitles = [
      'ceo', 'founder', 'owner', 'president', 'director', 'vp', 'vice president',
      'chief', 'head', 'manager', 'principal', 'partner'
    ];

    return contacts
      .filter(contact => {
        const title = contact.title.toLowerCase();
        return decisionMakerTitles.some(dmTitle => title.includes(dmTitle));
      })
      .map(contact => ({
        name: contact.fullName,
        title: contact.title,
        email: contact.email,
        phone: contact.phoneNumber,
        linkedinUrl: contact.linkedinUrl,
        seniority: contact.seniority,
        department: contact.department
      }))
      .slice(0, 5); // Limit to top 5 decision makers
  }

  /**
   * Merge email sources to avoid duplicates and prioritize quality
   */
  private mergeEmailSources(zeroBounceEmails: any[], apolloContacts: ApolloContact[]): any[] {
    const allEmails = [...zeroBounceEmails];
    
    // Add Apollo emails
    apolloContacts.forEach(contact => {
      if (contact.email && contact.emailStatus === 'verified') {
        // Check if email already exists
        const exists = allEmails.some(e => e.email.toLowerCase() === contact.email.toLowerCase());
        
        if (!exists) {
          allEmails.push({
            email: contact.email,
            type: 'personal',
            confidence: 85, // Apollo verified emails have high confidence
            firstName: contact.firstName,
            lastName: contact.lastName,
            status: 'valid',
            verified: true,
            source: 'apollo'
          });
        }
      }
    });

    // Sort by confidence and remove low-quality emails
    return allEmails
      .filter(email => email.confidence >= 70)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Keep top 3 emails
  }

  /**
   * Enhanced lead search that automatically enriches results
   */
  async searchAndEnrichLeads(
    request: LeadSearchRequest,
    enrichmentOptions: LeadEnrichmentOptions = {}
  ): Promise<EnrichmentResult> {
    try {
      logger.info('Starting search and enrichment process:', request);

      // 1. First do standard lead search
      const searchResult = await leadFinderService.searchLeads(request);
      
      if (searchResult.leads.length === 0) {
        return {
          enrichedLeads: [],
          totalProcessed: 0,
          successfulEnrichments: 0,
          apolloSearches: 0,
          emailsFound: 0,
          costEstimate: {
            apolloCost: 0,
            zeroBounceCredits: 0,
            totalEstimate: 0
          },
          processingTime: 0
        };
      }

      // 2. Enrich the found leads
      const enrichmentResult = await this.enrichLeads(searchResult.leads, enrichmentOptions);

      logger.info('Search and enrichment completed:', {
        totalLeads: searchResult.leads.length,
        enrichedLeads: enrichmentResult.successfulEnrichments,
        apolloSearches: enrichmentResult.apolloSearches,
        emailsFound: enrichmentResult.emailsFound
      });

      return enrichmentResult;

    } catch (error) {
      logger.error('Search and enrichment error:', error);
      throw new Error(`Failed to search and enrich leads: ${error.message}`);
    }
  }

  /**
   * Get enrichment cost estimate
   */
  estimateEnrichmentCost(leadCount: number, options: LeadEnrichmentOptions = {}): {
    apolloCost: number;
    zeroBounceCredits: number;
    totalEstimate: number;
  } {
    const contactsPerLead = options.maxContactsPerLead || 5;
    const apolloCostPerLead = apolloService['calculateCost'](contactsPerLead);
    const zeroBounceCreditsPerLead = options.includeEmailDiscovery ? 1 : 0;

    const apolloCost = options.includeApolloData ? leadCount * apolloCostPerLead : 0;
    const zeroBounceCredits = leadCount * zeroBounceCreditsPerLead;

    return {
      apolloCost,
      zeroBounceCredits,
      totalEstimate: apolloCost + (zeroBounceCredits * 0.01)
    };
  }

  /**
   * Check if enrichment services are available
   */
  async checkServicesStatus(): Promise<{
    apollo: boolean;
    zeroBounce: boolean;
    googlePlaces: boolean;
    overallHealth: boolean;
  }> {
    try {
      const [apolloStatus, zeroBounceStatus, googlePlacesStatus] = await Promise.all([
        apolloService.testConnection(),
        zeroBounceService.checkApiStatus(),
        googlePlacesService.isConfigured()
      ]);

      return {
        apollo: apolloStatus,
        zeroBounce: zeroBounceStatus,
        googlePlaces: googlePlacesStatus,
        overallHealth: apolloStatus && zeroBounceStatus && googlePlacesStatus
      };

    } catch (error) {
      logger.error('Service status check error:', error);
      return {
        apollo: false,
        zeroBounce: false,
        googlePlaces: false,
        overallHealth: false
      };
    }
  }
}

export default new LeadEnrichmentService();