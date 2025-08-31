import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useLazyQuery, useQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import {
  HiSearch,
  HiClock,
  HiUser,
  HiDownload,
  HiCreditCard,
  HiSparkles,
  HiMail,
  HiExternalLink,
  HiPlus,
  HiPaperAirplane,
  HiLocationMarker,
  HiOfficeBuilding
} from 'react-icons/hi';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import SearchBar from './components/SearchBar';
import { Lead, SearchParams } from './types';
import { SEARCH_LEADS, FIND_EMAIL, SAVE_LEAD, SEARCH_AND_ENRICH_LEADS } from '@/queries/leadFinder/leadFinder';
import { GET_USER_CREDITS } from '@/queries/user/getUserCredits';

const LeadFinderSimple: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: 'Lead Finder - Enhanced' });
  
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const [searchLeads] = useLazyQuery(SEARCH_LEADS);
  const [searchAndEnrichLeads] = useLazyQuery(SEARCH_AND_ENRICH_LEADS);
  const [findEmail] = useMutation(FIND_EMAIL);
  const [saveLead] = useMutation(SAVE_LEAD);
  
  // Get user credits
  const { data: creditsData, refetch: refetchCredits } = useQuery(GET_USER_CREDITS, {
    fetchPolicy: 'cache-and-network'
  });
  
  const userCredits = creditsData?.getUserCredits || 25;

  const handleSearch = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setSearchParams(params);
    
    try {
      // Process AI mode query if active
      if (params.aiMode && params.aiQuery) {
        console.log('🤖 AI MODE: Processing natural language query:', params.aiQuery);
        
        // Simple AI query parsing - can be enhanced with proper NLP
        const aiQuery = params.aiQuery.toLowerCase();
        let parsedCategory = params.category;
        let parsedLocation = params.location;
        let parsedJobTitles = ['CEO', 'Founder', 'Owner'];
        
        // Extract location from AI query
        if (aiQuery.includes('nyc') || aiQuery.includes('new york')) {
          parsedLocation = 'New York, NY';
        } else if (aiQuery.includes('sf') || aiQuery.includes('san francisco')) {
          parsedLocation = 'San Francisco, CA';
        } else if (aiQuery.includes('chicago')) {
          parsedLocation = 'Chicago, IL';
        } else if (aiQuery.includes('boston')) {
          parsedLocation = 'Boston, MA';
        } else if (aiQuery.includes('austin')) {
          parsedLocation = 'Austin, TX';
        }
        
        // Extract industry/category from AI query
        if (aiQuery.includes('startup') || aiQuery.includes('tech companies')) {
          parsedCategory = 'startups';
        } else if (aiQuery.includes('real estate') || aiQuery.includes('property')) {
          parsedCategory = 'real estate agencies';
        } else if (aiQuery.includes('restaurant') || aiQuery.includes('food')) {
          parsedCategory = 'restaurants';
        } else if (aiQuery.includes('retail') || aiQuery.includes('store')) {
          parsedCategory = 'retail stores';
        }
        
        // Update params with parsed values
        params = {
          ...params,
          category: parsedCategory,
          location: parsedLocation,
          jobTitle: parsedJobTitles[0] // Use first job title
        };
        
        console.log('🤖 AI PARSED PARAMETERS:', {
          originalQuery: params.aiQuery,
          parsedCategory,
          parsedLocation,
          parsedJobTitles
        });
      }
      
      if (params.useEnrichedSearch) {
        // Use Apollo + enrichment
        console.log('🚀 Using ENRICHED SEARCH with Apollo.io');
        const { data } = await searchAndEnrichLeads({
          variables: {
            input: {
              category: params.category,
              location: params.location,
              radius: params.radius || 5000,
              maxResults: params.maxResults || 10,
              includeApolloData: true,
              includeEmailDiscovery: true,
              maxContactsPerLead: 5,
              targetJobTitles: params.jobTitle ? [params.jobTitle] : ['CEO', 'Founder', 'Owner'],
              minConfidence: 70
            }
          }
        });

        if (data?.searchAndEnrichLeads) {
          const enrichedLeads = data.searchAndEnrichLeads.enrichedLeads.map((lead: any) => ({
            ...lead,
            emailStatus: lead.emails?.length > 0 ? 'found' : 'not_found'
          }));
          
          setLeads(enrichedLeads);
          toast.success(`🚀 Found ${enrichedLeads.length} enriched leads with Apollo.io! Cost: $${data.searchAndEnrichLeads.costEstimate.totalEstimate.toFixed(2)}`);
        }
      } else {
        // Use basic Google Places search
        console.log('📍 Using BASIC SEARCH with Google Places');
        const { data } = await searchLeads({
          variables: {
            input: {
              category: params.category,
              location: params.location,
              radius: params.radius || 5000,
              maxResults: params.maxResults || 10
            }
          }
        });

        if (data?.searchLeads) {
          const leadsWithStatus = data.searchLeads.leads.map((lead: any) => ({
            ...lead,
            emailStatus: 'not_searched'
          }));
          
          setLeads(leadsWithStatus);
          toast.success(`📍 Found ${leadsWithStatus.length} basic leads from Google Places`);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search businesses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchLeads]);

  const handleFindEmail = useCallback(async (leadId: string, domain: string, firstName?: string, lastName?: string) => {
    try {
      // Update lead status to show loading
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, emailStatus: 'searching' }
          : lead
      ));

      const { data } = await findEmail({
        variables: {
          input: {
            domain,
            firstName: firstName || undefined,
            lastName: lastName || undefined
          }
        }
      });

      if (data?.findEmail) {
        const emailData = {
          email: data.findEmail.email,
          type: data.findEmail.type.toLowerCase() as 'personal' | 'generic',
          confidence: data.findEmail.confidence,
          firstName: data.findEmail.firstName,
          lastName: data.findEmail.lastName
        };

        // Update lead with found email
        setLeads(prev => prev.map(lead => 
          lead.id === leadId 
            ? { 
                ...lead, 
                emails: [...(lead.emails || []), emailData],
                emailStatus: 'found'
              }
            : lead
        ));
        
        toast.success(`Email discovered for ${domain}!`);
        // Refresh credits after successful email discovery
        refetchCredits();
      } else {
        // No email found
        setLeads(prev => prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, emailStatus: 'not_found' }
            : lead
        ));
        
        toast.warning(`No email found for ${domain}`);
      }
    } catch (error: any) {
      console.error('Email search error:', error);
      
      // Check if it's a credit error
      if (error.graphQLErrors?.[0]?.extensions?.code === 'INSUFFICIENT_CREDITS') {
        toast.error(error.graphQLErrors[0].message);
        // Refresh credits to show current balance
        refetchCredits();
      } else {
        toast.error('Failed to find email. Please try again.');
      }
      
      // Reset email status on error
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, emailStatus: 'not_searched' }
          : lead
      ));
    }
  }, [findEmail, refetchCredits]);

  const handleSaveLead = useCallback(async (lead: Lead) => {
    try {
      const { data } = await saveLead({
        variables: {
          input: {
            googlePlaceId: lead.googlePlaceId,
            businessName: lead.businessName,
            website: lead.website,
            address: lead.address,
            phone: lead.phone,
            category: lead.category,
            locationLat: lead.locationLat,
            locationLng: lead.locationLng,
            emails: lead.emails || []
          }
        }
      });

      if (data?.saveLead) {
        toast.success(`${lead.businessName} added to your list!`);
      }
    } catch (error) {
      console.error('Save lead error:', error);
      toast.error('Failed to save lead');
    }
  }, [saveLead]);

  const handleSelectLead = useCallback((leadId: string, selected: boolean) => {
    setSelectedLeads(prev => 
      selected 
        ? [...prev, leadId]
        : prev.filter(id => id !== leadId)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedLeads(selected ? leads.map(lead => lead.id) : []);
  }, [leads]);

  const extractDomain = (website?: string): string => {
    if (!website) return '';
    try {
      return new URL(website).hostname.replace('www.', '');
    } catch {
      return website;
    }
  };

  const getJobRoleFromCategory = (category: string | undefined): string => {
    const categoryMap: { [key: string]: string[] } = {
      'restaurants': ['Restaurant Manager', 'Head Chef', 'Restaurant Owner'],
      'retail stores': ['Store Manager', 'Regional Manager', 'Retail Director'],
      'consulting services': ['Senior Consultant', 'Managing Director', 'Principal'],
      'software engineers': ['Senior Software Engineer', 'Engineering Manager', 'Tech Lead'],
      'marketing directors': ['Marketing Director', 'VP Marketing', 'Brand Manager'],
    };

    const roles = categoryMap[category?.toLowerCase() || ''] || ['Business Owner', 'Manager', 'Director'];
    return roles[Math.floor(Math.random() * roles.length)];
  };

  const getCompanyInitials = (companyName: string) => {
    return companyName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getCompanyLogo = (businessName: string): string => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-pink-500'];
    const colorIndex = businessName.length % colors.length;
    return colors[colorIndex];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30">
      {/* Results Status Bar */}
      {leads.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200/60">
                  ✨ {leads.length} Results
                </span>
                <div className="text-sm text-gray-700 font-medium">
                  High-quality leads ready for outreach
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <HiSparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">Lead Finder</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 font-medium">Enhanced with AI</span>
              </div>
            </div>
          </div>
          <p className="text-lg text-gray-700 max-w-3xl leading-relaxed">Find high-quality business contacts and decision makers with our advanced lead generation tool</p>
        </div>

        {/* Search Section */}
        <section className="mb-8" aria-label="Search for business leads">
          <SearchBar 
            onSearch={handleSearch}
            loading={loading}
          />
        </section>

        {/* Results Section */}
        {leads.length > 0 ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden" aria-label="Search results">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === leads.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-label={`Select all ${leads.length} leads`}
                    aria-describedby="selection-status"
                  />
                  <span id="selection-status" className="text-sm font-semibold text-gray-900">
                    {selectedLeads.length} of {leads.length} selected
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button 
                    className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Export selected leads"
                  >
                    <HiExternalLink className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm">Export</span>
                  </button>
                  <button 
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Add selected leads to list"
                  >
                    <HiPlus className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm">Add to List</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full" role="table" aria-label="Business leads search results">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-6 py-4 text-left" scope="col">
                      <span className="sr-only">Select lead</span>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" scope="col">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" scope="col">
                      Company Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" scope="col">
                      Email Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead, index) => {
                    const jobRole = getJobRoleFromCategory(lead.category);
                    const logoColor = getCompanyLogo(lead.businessName);

                    return (
                      <tr key={lead.id} className="hover:bg-blue-50 transition-colors">
                        {/* Checkbox */}
                        <td className="px-6 py-5">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>

                        {/* Contact Info */}
                        <td className="px-6 py-5">
                          <div className="flex items-center">
                            <div className={`w-12 h-12 ${logoColor} rounded-xl flex items-center justify-center mr-4 shadow-lg`}>
                              <span className="text-white font-bold text-sm">
                                {getCompanyInitials(lead.businessName)}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{lead.businessName}</div>
                              <div className="text-sm text-gray-600 mt-1 flex items-center">
                                <HiUser className="w-4 h-4 mr-1" />
                                {jobRole}
                              </div>
                              {lead.phone && (
                                <div className="text-xs text-gray-700 mt-1">
                                  📞 {lead.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Company Details */}
                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <HiOfficeBuilding className="w-4 h-4 text-gray-600 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{lead.businessName}</div>
                                <div className="text-xs text-gray-700">
                                  {lead.category || 'Business Services'} • 11-50 employees
                                </div>
                                {/* Rating Display */}
                                {(lead as any).rating && (
                                  <div className="flex items-center mt-1">
                                    <span className="text-yellow-400">★</span>
                                    <span className="text-xs text-gray-600 ml-1">
                                      {(lead as any).rating} ({(lead as any).userRatingCount || 0} reviews)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {lead.website && (
                              <div className="text-sm">
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                >
                                  {extractDomain(lead.website)}
                                  <HiExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </div>
                            )}
                            <div className="flex items-center text-xs text-gray-700">
                              <HiLocationMarker className="w-4 h-4 mr-1" />
                              {lead.address ? 
                                lead.address.split(',').slice(-2).join(',').trim() : 
                                'Location not specified'
                              }
                            </div>
                            {/* Business Hours */}
                            {(lead as any).openingHours?.open_now !== undefined && (
                              <div className="text-xs">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  (lead as any).openingHours.open_now ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {(lead as any).openingHours.open_now ? '🟢 Open Now' : '🔴 Closed'}
                                </span>
                              </div>
                            )}
                            {/* Price Level */}
                            {(lead as any).priceLevel && (
                              <div className="text-xs text-gray-700">
                                Price: {'$'.repeat((lead as any).priceLevel)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Email Status */}
                        <td className="px-6 py-5">
                          {lead.emails && lead.emails.length > 0 ? (
                            <div className="space-y-2">
                              {lead.emails.map((email, emailIndex) => (
                                <div key={emailIndex} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <div className="font-medium text-sm text-green-900 mb-2">{email.email}</div>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      {email.type}
                                    </span>
                                    <span className="text-xs text-green-700">
                                      {email.confidence}% confidence
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : lead.emailStatus === 'searching' ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                              <span className="text-sm text-gray-600">Finding email...</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleFindEmail(lead.id, extractDomain(lead.website) || lead.businessName)}
                              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                            >
                              <HiMail className="w-4 h-4 mr-2" />
                              Find Email
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2">
                            <button 
                              className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Send email"
                            >
                              <HiPaperAirplane className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleSaveLead(lead)}
                              className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Add to list"
                            >
                              <HiPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium text-gray-900">1</span> to{' '}
                  <span className="font-medium text-gray-900">{Math.min(25, leads.length)}</span> of{' '}
                  <span className="font-medium text-gray-900">{leads.length}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-not-allowed">
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">1</button>
                  <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">2</button>
                  <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">3</button>
                  <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Next</button>
                </div>
              </div>
            </div>
          </section>
        ) : !loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <HiSparkles className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Discover Your Next Lead</h3>
            <p className="text-gray-700 text-lg mb-8 max-w-2xl mx-auto">
              Find high-quality business contacts and decision makers with our advanced lead generation tool
            </p>
            <div className="flex justify-center space-x-4">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-900">
                ✨ AI-Powered Search
              </span>
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-900">
                📧 Email Discovery
              </span>
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-purple-100 text-purple-900">
                🎯 Contact Enrichment
              </span>
            </div>
          </div>
        ) : null}

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8">
            <div className="animate-pulse space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3 border-t pt-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LeadFinderSimple;