import React, { useEffect, useState, useRef, useMemo } from 'react';
import { CircularProgress } from '@mui/material';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import { getAuthenticationCookie } from '@/utils/cookie';
import Favicon from '@/components/Common/Favicon';
import { useQuery } from '@apollo/client';
import GET_USER_SITES from '@/queries/sites/getSites';
import { Site } from '@/generated/graphql';
import Select from 'react-select';
import Modal from '@/components/Common/Modal';
import './DomainAnalyses.css';
import FixCard from './FixCard';

interface OptionType {
  value: string;
  label: string;
}

export interface Analysis {
  id: string;
  url_hash: string;
  url: string | null;
  domain: string | null;
  allowed_site_id: number | null;
  score: number | null;
  issues_count: number;
  result_json: string;
  r2_key: string | null;
  version: number;
  previous_score: number | null;
  score_change: number | null;
  analyzed_at: number;
  synced_to_mysql: number;
}

const DomainAnalyses: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: 'Auto Fixes' });
  
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loader, setLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [selectedImpact, setSelectedImpact] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [updatingFixId, setUpdatingFixId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'remove' | 'restore';
    analysisId: string;
    fixIndex: number;
  }>({
    isOpen: false,
    type: 'remove',
    analysisId: '',
    fixIndex: -1,
  });
  const isMounted = useRef(true);

  // Fetch user sites for domain selector
  const { data: sitesData, loading: sitesLoading } = useQuery(GET_USER_SITES);

  // Create site options for the dropdown
  const siteOptions = useMemo(() => {
    if (!sitesData?.getUserSites?.sites) return [];
    return sitesData.getUserSites.sites
      .map((site: Site | null | undefined) => ({
        value: site?.url || '',
        label: site?.url || '',
      }))
      .filter((opt: OptionType) => opt.value);
  }, [sitesData]);

  // Normalize domain: extract root domain from URLs
  const normalizeDomain = (input: string): string => {
    if (!input) return '';
    
    // Remove protocol
    let normalized = input.replace(/^https?:\/\//i, '');
    
    // Remove www.
    normalized = normalized.replace(/^www\./i, '');
    
    // Remove trailing slashes and paths
    normalized = normalized.replace(/\/.*$/, '');
    
    // Remove trailing spaces
    normalized = normalized.trim();
    
    return normalized.toLowerCase();
  };

  // Find matching domain in user's sites by root domain
  const findMatchingDomain = (input: string): OptionType | null => {
    const normalizedInput = normalizeDomain(input);
    if (!normalizedInput) return null;

    // Check if any site's root domain matches
    return siteOptions.find((option: OptionType) => {
      const normalizedOption = normalizeDomain(option.value);
      return normalizedOption === normalizedInput;
    }) || null;
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchAnalyses = async (domain: string) => {
    if (!domain) return;

    setHasSearched(true);
    setLoader(true);
    setError(null);
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses?url=${encodeURIComponent(domain)}`;
    const token = getAuthenticationCookie();

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();

      if (isMounted.current) {
        setAnalyses(data || []);
        setLoader(false);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
      if (isMounted.current) {
        setAnalyses([]);
        setLoader(false);
        setError(
          error instanceof Error ? error.message : 'Failed to fetch analyses'
        );
      }
    }
  };

  const handleDomainChange = (selected: OptionType | null) => {
    if (selected) {
      setSelectedOption(selected);
      setSelectedDomain(selected.value);
      setSelectedPage('all');
      setSelectedImpact('all');
      setSelectedCategory('all');
      fetchAnalyses(selected.value);
    } else {
      setSelectedOption(null);
      setSelectedDomain(null);
      setAnalyses([]);
      setHasSearched(false);
    }
  };

  // Handle input change to detect pasted URLs and auto-select matching domains
  const handleInputChange = (inputValue: string, { action }: { action: string }) => {
    // Only process when user is typing/pasting, not when menu is opening/closing
    if (action === 'input-change' && inputValue) {
      // Check if input looks like a URL (contains protocol, www, or has a TLD pattern)
      const trimmedInput = inputValue.trim();
      const looksLikeUrl = /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i.test(trimmedInput);
      
      if (looksLikeUrl) {
        const matchingDomain = findMatchingDomain(trimmedInput);
        if (matchingDomain && (!selectedOption || selectedOption.value !== matchingDomain.value)) {
          // Use setTimeout to avoid conflicts with react-select's internal state
          setTimeout(() => {
            handleDomainChange(matchingDomain);
          }, 100);
        }
      }
    }
    return inputValue;
  };

  // Extract all fixes from all analyses
  const allFixes = useMemo(() => {
    const fixes: Array<{
      fix: any;
      url: string;
      analysisId: string;
      fixIndex: number;
    }> = [];

    analyses.forEach((analysis) => {
      try {
        const parsed = JSON.parse(analysis.result_json);
        const analysisFixes = parsed?.analysis?.fixes || [];
        analysisFixes.forEach((fix: any, index: number) => {
          fixes.push({
            fix,
            url: analysis.url || analysis.domain || '',
            analysisId: analysis.id,
            fixIndex: index,
          });
        });
      } catch (error) {
        console.error('Error parsing analysis:', error);
      }
    });

    return fixes;
  }, [analyses]);

  // Get unique pages with counts (filtered by status, impact, category - but NOT page)
  const pages = useMemo(() => {
    const pageMap = new Map<string, number>();
    allFixes.forEach(({ fix, url }) => {
      // Apply all filters EXCEPT page filter
      if (filter === 'active' && fix.action === 'deleted') return;
      if (filter === 'deleted' && fix.action !== 'deleted') return;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return;
      
      const count = pageMap.get(url) || 0;
      pageMap.set(url, count + 1);
    });
    return Array.from(pageMap.entries()).map(([url, count]) => ({ url, count }));
  }, [allFixes, filter, selectedImpact, selectedCategory]);

  // Get unique impacts with counts (filtered by status, page, category - but NOT impact)
  const impacts = useMemo(() => {
    const impactMap = new Map<string, number>();
    allFixes.forEach(({ fix, url }) => {
      // Apply all filters EXCEPT impact filter
      if (selectedPage !== 'all' && url !== selectedPage) return;
      if (filter === 'active' && fix.action === 'deleted') return;
      if (filter === 'deleted' && fix.action !== 'deleted') return;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return;
      
      const impact = fix.impact || 'minor';
      const count = impactMap.get(impact) || 0;
      impactMap.set(impact, count + 1);
    });
    return Array.from(impactMap.entries())
      .map(([impact, count]) => ({ impact, count }))
      .sort((a, b) => {
        const order = { serious: 0, moderate: 1, minor: 2 };
        return (order[a.impact as keyof typeof order] || 3) - (order[b.impact as keyof typeof order] || 3);
      });
  }, [allFixes, selectedPage, filter, selectedCategory]);

  // Get unique categories with counts (filtered by status, page, impact - but NOT category)
  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    allFixes.forEach(({ fix, url }) => {
      // Apply all filters EXCEPT category filter
      if (selectedPage !== 'all' && url !== selectedPage) return;
      if (filter === 'active' && fix.action === 'deleted') return;
      if (filter === 'deleted' && fix.action !== 'deleted') return;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return;
      
      const category = fix.category || 'other';
      const count = categoryMap.get(category) || 0;
      categoryMap.set(category, count + 1);
    });
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [allFixes, selectedPage, filter, selectedImpact]);

  // Filter fixes based on selected page, status, impact, and category
  const filteredFixes = useMemo(() => {
    return allFixes.filter(({ fix, url }) => {
      // Filter by page
      if (selectedPage !== 'all' && url !== selectedPage) return false;
      
      // Filter by status
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      
      // Filter by impact
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return false;
      
      // Filter by category
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return false;
      
      return true;
    });
  }, [allFixes, selectedPage, filter, selectedImpact, selectedCategory]);

  // Calculate "All" counts for each filter type (excluding its own filter)
  const allPagesCount = useMemo(() => {
    return allFixes.filter(({ fix }) => {
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return false;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return false;
      return true;
    }).length;
  }, [allFixes, filter, selectedImpact, selectedCategory]);

  const allImpactsCount = useMemo(() => {
    return allFixes.filter(({ fix, url }) => {
      if (selectedPage !== 'all' && url !== selectedPage) return false;
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return false;
      return true;
    }).length;
  }, [allFixes, selectedPage, filter, selectedCategory]);

  const allCategoriesCount = useMemo(() => {
    return allFixes.filter(({ fix, url }) => {
      if (selectedPage !== 'all' && url !== selectedPage) return false;
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return false;
      return true;
    }).length;
  }, [allFixes, selectedPage, filter, selectedImpact]);

  // Handle fix action update
  const handleFixAction = async (analysisId: string, fixIndex: number, action: 'update' | 'deleted') => {
    const fixId = `${analysisId}-${fixIndex}`;
    setUpdatingFixId(fixId);
    setConfirmModal({ isOpen: false, type: 'remove', analysisId: '', fixIndex: -1 });

    try {
      const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/fix-action`;
      const token = getAuthenticationCookie();

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          analysisId,
          fixIndex,
          action, // Changed from newAction to action
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update fix action');
      }

      const updatedAnalysis = await response.json();

      // Update local state
      setAnalyses((prev) =>
        prev.map((a) => (a.id === analysisId ? updatedAnalysis : a))
      );
    } catch (error) {
      console.error('Error updating fix action:', error);
      alert(error instanceof Error ? error.message : 'Failed to update fix. Please try again.');
    } finally {
      setUpdatingFixId(null);
    }
  };

  const handleRemoveClick = (analysisId: string, fixIndex: number) => {
    setConfirmModal({
      isOpen: true,
      type: 'remove',
      analysisId,
      fixIndex,
    });
  };

  const handleRestoreClick = (analysisId: string, fixIndex: number) => {
    setConfirmModal({
      isOpen: true,
      type: 'restore',
      analysisId,
      fixIndex,
    });
  };

  const handleConfirmAction = () => {
    const { analysisId, fixIndex, type } = confirmModal;
    if (type === 'remove') {
      handleFixAction(analysisId, fixIndex, 'deleted');
    } else {
      handleFixAction(analysisId, fixIndex, 'update');
    }
  };

  return (
    <div className="domain-analyses-container min-h-screen">
      {/* Two-column layout: Sidebar + Main Content */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 p-6">
        {/* Left Sidebar */}
        <aside className="lg:w-96 w-full lg:flex-shrink-0 flex">
          <div className="rounded-xl border-2 p-6 sticky top-4 w-full" style={{ backgroundColor: '#e9ecfb', borderColor: '#A2ADF3' }}>
            {/* Domain Selector */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Select Website
                </h2>
              </div>
              <div>
                <label
                  htmlFor="domain-select-input"
                  className="block text-xs font-medium text-gray-700 mb-2"
                >
                  Domain name
                </label>
                <Select
                  inputId="domain-select-input"
                  options={siteOptions}
                  value={selectedOption}
                  onChange={handleDomainChange}
                  onInputChange={handleInputChange}
                  placeholder="Select a domain or paste a URL"
                  isSearchable
                  isClearable
                  isLoading={sitesLoading}
                  formatOptionLabel={(option: OptionType) => (
                    <div className="flex items-center gap-2 min-w-0">
                      <Favicon domain={option.value} size={16} className="flex-shrink-0" />
                      <span className="truncate min-w-0">{option.label}</span>
                    </div>
                  )}
                  classNamePrefix="react-select"
                  className="w-full"
                  styles={{
                    control: (base: any) => ({
                      ...base,
                      maxWidth: '100%',
                      borderColor: '#d1d5db',
                      '&:hover': {
                        borderColor: '#9ca3af',
                      },
                    }),
                    menu: (base: any) => ({
                      ...base,
                      maxWidth: '100%',
                    }),
                  }}
                />
              </div>
            </div>

            {/* Pages Filter */}
            {pages.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Pages
                  </h2>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedPage('all')}
                    className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedPage === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={selectedPage === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      All Pages
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        selectedPage === 'all'
                          ? 'text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      style={selectedPage === 'all' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                    >
                      {allPagesCount}
                    </span>
                  </button>
                  <div className="pages-list-scrollable max-h-[400px] overflow-y-auto pr-1">
                    <div className="space-y-1.5">
                      {pages.map(({ url, count }) => {
                        let pathname = '/';
                        try {
                          pathname = new URL(url).pathname || '/';
                        } catch {
                          pathname = url;
                        }
                        return (
                          <button
                            key={url}
                            onClick={() => setSelectedPage(url)}
                            className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              selectedPage === url
                                ? 'text-white shadow-md'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                            style={selectedPage === url ? { backgroundColor: '#0052CC' } : {}}
                          >
                            <span className="truncate flex-1 text-left">{pathname}</span>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ml-2 ${
                                selectedPage === url
                                  ? 'text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                              style={selectedPage === url ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Impact Filter */}
            {impacts.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Impact
                  </h2>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedImpact('all')}
                    className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedImpact === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={selectedImpact === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    <span>All Impacts</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        selectedImpact === 'all'
                          ? 'text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      style={selectedImpact === 'all' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                    >
                      {allImpactsCount}
                    </span>
                  </button>
                  {impacts.map(({ impact, count }) => (
                    <button
                      key={impact}
                      onClick={() => setSelectedImpact(impact)}
                      className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedImpact === impact
                          ? 'text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                      style={selectedImpact === impact ? { backgroundColor: '#0052CC' } : {}}
                    >
                      <span className="capitalize">{impact}</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          selectedImpact === impact
                            ? 'text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                        style={selectedImpact === impact ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            {categories.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Category
                  </h2>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={selectedCategory === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    <span>All Categories</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        selectedCategory === 'all'
                          ? 'text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      style={selectedCategory === 'all' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                    >
                      {allCategoriesCount}
                    </span>
                  </button>
                  {categories.map(({ category, count }) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === category
                          ? 'text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                      style={selectedCategory === category ? { backgroundColor: '#0052CC' } : {}}
                    >
                      <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          selectedCategory === category
                            ? 'text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                        style={selectedCategory === category ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear All Filters Button */}
            {(selectedPage !== 'all' || filter !== 'all' || selectedImpact !== 'all' || selectedCategory !== 'all') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedPage('all');
                    setFilter('all');
                    setSelectedImpact('all');
                    setSelectedCategory('all');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex">
          <div className="bg-white rounded-xl border-2 p-6 md:p-7 w-full" style={{ borderColor: '#A2ADF3' }}>
            {/* Header */}
            <div className="flex flex-col gap-4 mb-7 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg shadow-md" style={{ backgroundColor: '#0052CC' }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                    Auto Fixes
                  </h1>
                </div>
              </div>
              
                {filteredFixes.length > 0 && (
                  <p className="text-sm text-gray-600 flex items-center gap-2 sm:ml-14">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#0052CC' }}></span>
                    {filteredFixes.length} auto-fix{filteredFixes.length !== 1 ? 'es' : ''} applied
                  </p>
                )}

              {/* Filter Buttons */}
              {allFixes.length > 0 && (
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setFilter('all')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                    style={filter === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('active')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'active'
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                    style={filter === 'active' ? { backgroundColor: '#16a34a' } : {}}
                  >
                    Enabled
                  </button>
                  <button
                    onClick={() => setFilter('deleted')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'deleted'
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                    style={filter === 'deleted' ? { backgroundColor: '#dc2626' } : {}}
                  >
                    Disabled
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            {loader ? (
              <div className="flex justify-center py-12">
                <CircularProgress size={40} />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => selectedDomain && fetchAnalyses(selectedDomain)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : !hasSearched ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative p-6 bg-blue-50 rounded-2xl shadow-lg">
                    <svg
                      className="h-16 w-16 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Select a website from the left sidebar to view auto-fixes applied by the widget
                </p>
              </div>
            ) : filteredFixes.length > 0 ? (
              <div className="pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {filteredFixes.map(({ fix, url, analysisId, fixIndex }) => {
                    const fixId = `${analysisId}-${fixIndex}`;
                    return (
                      <FixCard
                        key={fixId}
                        fix={fix}
                        url={url}
                        onRemove={() => handleRemoveClick(analysisId, fixIndex)}
                        onRestore={() => handleRestoreClick(analysisId, fixIndex)}
                        isUpdating={updatingFixId === fixId}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-50"></div>
                  <div className="relative p-6 bg-green-50 rounded-2xl shadow-lg">
                    <svg
                      className="h-16 w-16 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filter === 'deleted'
                    ? 'No Disabled Auto-Fixes'
                    : filter === 'active'
                    ? 'No Enabled Auto-Fixes'
                    : 'All Clear!'}
                </h3>
                <p className="text-gray-600 text-center max-w-md">
                  {filter === 'deleted'
                    ? 'No disabled auto-fixes found for the selected filters'
                    : filter === 'active'
                    ? 'No enabled auto-fixes found for the selected filters'
                    : 'No auto-fixes found for this website. The widget has not applied any fixes yet.'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={confirmModal.isOpen} ariaLabelledBy="confirm-modal-title">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${
              confirmModal.type === 'remove' ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {confirmModal.type === 'remove' ? (
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h2 id="confirm-modal-title" className="text-xl font-bold text-gray-900">
              {confirmModal.type === 'remove' ? 'Disable Auto-Fix?' : 'Enable Auto-Fix?'}
            </h2>
          </div>

          <p className="text-gray-700 mb-6">
            {confirmModal.type === 'remove'
              ? 'Are you sure you want to disable this auto-fix? The widget will stop applying this fix to your website.'
              : 'Are you sure you want to enable this auto-fix? The widget will start applying this fix to your website.'}
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmModal({ isOpen: false, type: 'remove', analysisId: '', fixIndex: -1 })}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={updatingFixId !== null}
              className={`px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                confirmModal.type === 'remove'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {updatingFixId !== null
                ? confirmModal.type === 'remove'
                  ? 'Disabling...'
                  : 'Enabling...'
                : confirmModal.type === 'remove'
                ? 'Disable'
                : 'Enable'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DomainAnalyses;
