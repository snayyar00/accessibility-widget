import { ApolloError, ValidationError, UserInputError } from '../../utils/graphql-errors.helper';
import leadFinderService from '../../services/leadFinder/leadFinder.service';
import zeroBounceService from '../../services/leadFinder/zerobounce.service';
import googlePlacesService from '../../services/leadFinder/googlePlaces.service';
import apolloService from '../../services/leadFinder/apollo.service';
import apolloUrlBuilderService from '../../services/leadFinder/apolloUrlBuilder.service';
import leadEnrichmentService from '../../services/leadFinder/leadEnrichment.service';
import creditService from '../../services/user/credit.service';
import logger from '../../utils/logger';

interface Context {
  user?: {
    id: number;
    email: string;
    organization_id?: number;
  };
}

const resolvers = {
  Query: {
    // Search for leads using Google Places API (without database)
    async searchLeads(_: any, { input }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        const { category, location, radius, maxResults } = input;
        
        logger.info('🔍 LEAD SEARCH REQUEST:', {
          category,
          location,
          radius,
          maxResults,
          userId: context.user.id
        });

        if (!category || !location) {
          throw new ValidationError('Category and location are required');
        }

        // Set default maxResults to 10 if not specified
        const searchMaxResults = maxResults || 10;
        
        logger.info('📊 Search parameters processed:', {
          finalCategory: category,
          finalLocation: location,
          finalRadius: radius || 5000,
          finalMaxResults: searchMaxResults
        });

        // Call Google Places API directly
        logger.info('🌐 Calling Google Places API...');
        const placesResult = await googlePlacesService.searchBusinesses({
          category,
          location,
          radius: radius || 5000
        });
        
        logger.info('📍 Google Places API Response:', {
          status: placesResult.status,
          resultsCount: placesResult.places?.length || 0,
          nextPageToken: placesResult.next_page_token ? 'YES' : 'NO'
        });

        // Convert to lead format and limit results
        const leads = placesResult.places
          .slice(0, searchMaxResults)
          .map((place, index) => {
            const lead = {
              id: `lead_${Date.now()}_${index}`,
              googlePlaceId: place.place_id,
              businessName: place.name,
              website: place.website,
              address: place.formatted_address,
              phone: place.formatted_phone_number,
              category: place.types?.[0]?.replace(/_/g, ' '),
              locationLat: place.geometry?.location?.lat,
              locationLng: place.geometry?.location?.lng,
              emails: [],
              source: 'google_places',
              createdAt: new Date().toISOString(),
              enrichmentSources: [],
              enrichedAt: null,
              dataConfidence: 50
            };
            
            // Log each lead conversion
            logger.info(`📝 Converting lead ${index + 1}:`, {
              businessName: lead.businessName,
              website: lead.website,
              phone: lead.phone,
              category: lead.category,
              hasAddress: !!lead.address,
              source: lead.source
            });
            
            return lead;
          });

        logger.info('✅ FINAL LEADS RESPONSE:', {
          totalLeadsGenerated: leads.length,
          maxResultsRequested: searchMaxResults,
          source: 'google_places_only',
          apolloIntegration: 'NOT_USED_YET',
          sampleBusinessNames: leads.slice(0, 3).map(l => l.businessName)
        });

        return {
          leads,
          totalCount: leads.length,
          searchParams: { category, location, radius: radius || 5000, maxResults: searchMaxResults },
          nextPageToken: placesResult.next_page_token
        };

      } catch (error) {
        logger.error('Search leads resolver error:', error);
        throw error;
      }
    },

    // Get saved leads for the current user (no database)
    async getUserLeads(_: any, { limit = 50, offset = 0 }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        // Return empty array since we're not using database
        return [];

      } catch (error) {
        logger.error('Get user leads resolver error:', error);
        throw error;
      }
    },

    // Get a specific lead by ID
    async getLead(_: any, { id }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        // TODO: Implement database query
        throw new Error('Not implemented yet');

      } catch (error) {
        logger.error('Get lead resolver error:', error);
        throw error;
      }
    },

    // Get search history
    async getSearchHistory(_: any, { limit = 10 }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        // TODO: Implement database query
        return [];

      } catch (error) {
        logger.error('Get search history resolver error:', error);
        throw error;
      }
    },

    // Check service status
    async getServiceStatus(_: any, __: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        const status = await leadEnrichmentService.checkServicesStatus();
        return {
          ...status,
          credits: await zeroBounceService.getCredits().catch(() => 0)
        };

      } catch (error) {
        logger.error('Get service status resolver error:', error);
        return {
          googlePlaces: false,
          zeroBounce: false,
          apollo: false,
          credits: 0,
          overallHealth: false
        };
      }
    },

    // Export leads to CSV/JSON
    async exportLeads(_: any, { leadIds, format }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        if (!leadIds || leadIds.length === 0) {
          throw new UserInputError('Lead IDs are required');
        }

        if (!['csv', 'json'].includes(format.toLowerCase())) {
          throw new UserInputError('Format must be csv or json');
        }

        // TODO: Get leads from database by IDs
        const leads = []; // Placeholder

        let content: string;
        let mimeType: string;
        let filename: string;

        if (format.toLowerCase() === 'csv') {
          content = leadFinderService.exportLeadsToCSV(leads);
          mimeType = 'text/csv';
          filename = `leads-${new Date().toISOString().split('T')[0]}.csv`;
        } else {
          content = JSON.stringify(leads, null, 2);
          mimeType = 'application/json';
          filename = `leads-${new Date().toISOString().split('T')[0]}.json`;
        }

        return {
          content,
          filename,
          mimeType
        };

      } catch (error) {
        logger.error('Export leads resolver error:', error);
        throw error;
      }
    },

    // Get lead count options for UI
    async getLeadCountOptions(_: any, __: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      return apolloUrlBuilderService.getLeadCountOptions();
    },

    // Enhanced search with enrichment
    async searchAndEnrichLeads(_: any, { input }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        const {
          category,
          location,
          radius,
          maxResults,
          includeApolloData,
          includeEmailDiscovery,
          maxContactsPerLead,
          targetJobTitles,
          minConfidence
        } = input;

        if (!category || !location) {
          throw new ValidationError('Category and location are required');
        }

        // Build lead search request
        const leadSearchRequest = {
          category,
          location,
          radius: radius || 5000,
          userId: context.user.id,
          organizationId: context.user.organization_id
        };

        // Build enrichment options (cost-optimized defaults)
        const enrichmentOptions = {
          includeApolloData: includeApolloData !== false, // Default to true
          includeEmailDiscovery: includeEmailDiscovery !== false, // Default to true
          apolloOnly: true, // DEFAULT: Use Apollo emails only, skip ZeroBounce to save costs
          maxContactsPerLead: maxContactsPerLead || 5,
          targetJobTitles: targetJobTitles || ['CEO', 'Founder', 'Owner', 'President', 'Director'],
          minConfidence: minConfidence || 70
        };

        // Perform enriched search
        const result = await leadEnrichmentService.searchAndEnrichLeads(
          leadSearchRequest,
          enrichmentOptions
        );

        // Limit results to maxResults (default 10)
        const limitedResults = maxResults 
          ? result.enrichedLeads.slice(0, maxResults)
          : result.enrichedLeads.slice(0, 10);

        return {
          ...result,
          enrichedLeads: limitedResults
        };

      } catch (error) {
        logger.error('Search and enrich leads resolver error:', error);
        throw error;
      }
    }
  },

  Mutation: {
    // Find email for a domain using ZeroBounce API
    async findEmail(_: any, { input }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        const { domain, firstName, lastName } = input;

        if (!domain) {
          throw new ValidationError('Domain is required');
        }

        // Check if user has enough credits before proceeding
        const hasCredits = await creditService.hasEnoughCredits(context.user.id, 1);
        if (!hasCredits) {
          const currentCredits = await creditService.getUserCredits(context.user.id);
          throw new ApolloError(
            `Insufficient credits. You have ${currentCredits} credits remaining. Please upgrade your account to continue finding emails.`,
            'INSUFFICIENT_CREDITS'
          );
        }

        // Use ZeroBounce API directly
        const result = await zeroBounceService.findAnyEmail(
          domain,
          firstName,
          lastName
        );
        
        if (!result) {
          // Don't deduct credits if no email was found
          return null;
        }

        // Deduct 1 credit for successful email discovery
        const creditResult = await creditService.deductCreditsForEmail(context.user.id);
        if (!creditResult.success) {
          throw new ApolloError(creditResult.message || 'Credit deduction failed', 'CREDIT_ERROR');
        }

        logger.info(`Email found for domain ${domain}, user ${context.user.id} has ${creditResult.remainingCredits} credits remaining`);

        return {
          email: result.email,
          type: zeroBounceService.getEmailType(result.email).toUpperCase(),
          confidence: result.confidence || zeroBounceService.getConfidenceScore(result.status),
          status: result.status?.toUpperCase() || 'UNKNOWN',
          verified: result.status === 'valid',
          firstName: result.first_name || firstName,
          lastName: result.last_name || lastName
        };

      } catch (error) {
        logger.error('Find email resolver error:', error);
        throw error;
      }
    },

    // Save a lead (no database - just return success)
    async saveLead(_: any, { input }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        // Return the lead data with generated ID since we're not using database
        return {
          id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...input,
          userId: context.user.id,
          organizationId: context.user.organization_id,
          source: 'manual',
          createdAt: new Date().toISOString()
        };

      } catch (error) {
        logger.error('Save lead resolver error:', error);
        throw error;
      }
    },

    // Update a lead (not implemented without database)
    async updateLead(_: any, { id, input }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      throw new Error('Update lead not available without database');
    },

    // Delete a lead (not implemented without database)
    async deleteLead(_: any, { id }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      throw new Error('Delete lead not available without database');
    },

    // Bulk email discovery
    async bulkFindEmails(_: any, { input }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        const { leads } = input;

        if (!leads || leads.length === 0) {
          throw new UserInputError('Leads are required');
        }

        const results = [];

        for (const leadInput of leads) {
          try {
            const emailRequest = {
              leadId: leadInput.leadId,
              domain: leadInput.domain,
              firstName: leadInput.firstName,
              lastName: leadInput.lastName,
              userId: context.user.id
            };

            const result = await leadFinderService.findEmailForLead(emailRequest);
            
            if (result) {
              results.push({
                email: result.email,
                type: result.type.toUpperCase(),
                confidence: result.confidence,
                status: result.status?.toUpperCase() || 'UNKNOWN',
                verified: result.verified || false,
                firstName: result.firstName,
                lastName: result.lastName
              });
            }

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            logger.warn(`Failed to find email for lead ${leadInput.leadId}:`, error);
            continue;
          }
        }

        return results;

      } catch (error) {
        logger.error('Bulk find emails resolver error:', error);
        throw error;
      }
    },

    // Generate accessibility report for a lead
    async generateLeadReport(_: any, { leadId }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        // TODO: Get lead from database and generate report
        throw new Error('Not implemented yet');

      } catch (error) {
        logger.error('Generate lead report resolver error:', error);
        throw error;
      }
    },

    // Clear search history
    async clearSearchHistory(_: any, __: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        // TODO: Implement database deletion
        return true;

      } catch (error) {
        logger.error('Clear search history resolver error:', error);
        throw error;
      }
    },

    // Enrich existing leads
    async enrichLeads(_: any, { leadIds, options }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        if (!leadIds || leadIds.length === 0) {
          throw new UserInputError('Lead IDs are required');
        }

        // TODO: Get leads from database by IDs
        // For now, return empty result as we don't have database
        const leads = [];

        if (leads.length === 0) {
          throw new UserInputError('No leads found with provided IDs');
        }

        const enrichmentOptions = {
          includeApolloData: options?.includeApolloData !== false,
          includeEmailDiscovery: options?.includeEmailDiscovery !== false,
          maxContactsPerLead: options?.maxContactsPerLead || 5,
          targetJobTitles: options?.targetJobTitles || ['CEO', 'Founder', 'Owner'],
          minConfidence: options?.minConfidence || 70
        };

        return await leadEnrichmentService.enrichLeads(leads, enrichmentOptions);

      } catch (error) {
        logger.error('Enrich leads resolver error:', error);
        throw error;
      }
    },

    // Estimate enrichment cost
    async estimateEnrichmentCost(_: any, { leadCount, options }: any, context: Context) {
      if (!context.user) {
        throw new ApolloError('Authentication required', 'UNAUTHENTICATED');
      }

      try {
        if (!leadCount || leadCount < 1) {
          throw new UserInputError('Lead count must be greater than 0');
        }

        const enrichmentOptions = {
          includeApolloData: options?.includeApolloData !== false,
          includeEmailDiscovery: options?.includeEmailDiscovery !== false,
          maxContactsPerLead: options?.maxContactsPerLead || 5,
          targetJobTitles: options?.targetJobTitles || ['CEO', 'Founder', 'Owner'],
          minConfidence: options?.minConfidence || 70
        };

        return leadEnrichmentService.estimateEnrichmentCost(leadCount, enrichmentOptions);

      } catch (error) {
        logger.error('Estimate enrichment cost resolver error:', error);
        throw error;
      }
    }
  },

  Subscription: {
    // Email discovery progress updates
    emailDiscoveryProgress: {
      subscribe: () => {
        // TODO: Implement subscription
        throw new Error('Subscriptions not implemented yet');
      }
    },

    // Bulk operation progress updates
    bulkOperationProgress: {
      subscribe: () => {
        // TODO: Implement subscription
        throw new Error('Subscriptions not implemented yet');
      }
    }
  }
};

export default resolvers;