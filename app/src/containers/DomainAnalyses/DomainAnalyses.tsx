import React, { useEffect, useState, useRef, useMemo } from 'react';
import { CircularProgress } from '@mui/material';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import { getAuthenticationCookie } from '@/utils/cookie';
import notFoundImage from '@/assets/images/not_found_image.png';
import Favicon from '@/components/Common/Favicon';
import { useQuery } from '@apollo/client';
import GET_USER_SITES from '@/queries/sites/getSites';
import { Site } from '@/generated/graphql';
import Select from 'react-select/creatable';
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
  useDocumentHeader({ title: 'Accessibility Issues' });
  
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loader, setLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all');
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
      fetchAnalyses(selected.value);
    } else {
      setSelectedOption(null);
      setSelectedDomain(null);
      setAnalyses([]);
      setHasSearched(false);
    }
  };

  const handleCreateOption = (inputValue: string) => {
    // Normalize domain (remove protocol, www, trailing slashes)
    let normalizedDomain = inputValue
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0]; // Get just the domain part
    
    const newOption: OptionType = { value: normalizedDomain, label: normalizedDomain };
    setSelectedOption(newOption);
    setSelectedDomain(normalizedDomain);
    setSelectedPage('all');
    fetchAnalyses(normalizedDomain);
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

  // Get unique pages with counts
  const pages = useMemo(() => {
    const pageMap = new Map<string, number>();
    allFixes.forEach(({ url }) => {
      const count = pageMap.get(url) || 0;
      pageMap.set(url, count + 1);
    });
    return Array.from(pageMap.entries()).map(([url, count]) => ({ url, count }));
  }, [allFixes]);

  // Filter fixes based on selected page and filter
  const filteredFixes = useMemo(() => {
    return allFixes.filter(({ fix, url }) => {
      // Filter by page
      if (selectedPage !== 'all' && url !== selectedPage) return false;
      
      // Filter by status
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      
      return true;
    });
  }, [allFixes, selectedPage, filter]);

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
    <div >
      {/* Two-column layout: Sidebar + Main Content */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6">
        {/* Left Sidebar */}
        <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200/50 p-5 sticky top-4 shadow-lg">
            {/* Domain Selector */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Select Domain
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
                  onCreateOption={handleCreateOption}
                  placeholder="Select or enter a domain"
                  isSearchable
                  isClearable
                  isLoading={sitesLoading}
                  formatOptionLabel={(option: OptionType) => (
                    <div className="flex items-center gap-2 min-w-0">
                      <Favicon domain={option.value} size={16} className="flex-shrink-0" />
                      <span className="truncate min-w-0">{option.label}</span>
                    </div>
                  )}
                  formatCreateLabel={(inputValue: string) =>
                    `Enter a new domain: "${inputValue}"`
                  }
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
              <div>
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
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                    }`}
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
                          ? 'bg-blue-500/20 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {allFixes.length}
                    </span>
                  </button>
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
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                            : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                        }`}
                      >
                        <span className="truncate flex-1 text-left">{pathname}</span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ml-2 ${
                            selectedPage === url
                              ? 'bg-blue-500/20 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200/50 p-5 md:p-7 shadow-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7 pb-6 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-blue-600 rounded-lg shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Accessibility Issues
                  </h1>
                </div>
                {filteredFixes.length > 0 && (
                  <p className="text-sm text-gray-600 ml-14 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                    {filteredFixes.length} issue{filteredFixes.length !== 1 ? 's' : ''} found
                  </p>
                )}
              </div>

              {/* Filter Buttons */}
              {allFixes.length > 0 && (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setFilter('all')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('active')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'active'
                        ? 'bg-green-600 text-white shadow-md shadow-green-500/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setFilter('deleted')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'deleted'
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    Removed
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
                  Select a domain from the left sidebar to view and manage accessibility issues
                </p>
              </div>
            ) : filteredFixes.length > 0 ? (
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
                    ? 'No Removed Fixes'
                    : filter === 'active'
                    ? 'No Active Issues'
                    : 'All Clear!'}
                </h3>
                <p className="text-gray-600 text-center max-w-md">
                  {filter === 'deleted'
                    ? 'No removed fixes found for the selected filters'
                    : filter === 'active'
                    ? 'No active fixes found. Great job!'
                    : 'No accessibility issues found for this domain. Your site looks good!'}
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
              {confirmModal.type === 'remove' ? 'Remove Auto-Fix?' : 'Restore Auto-Fix?'}
            </h2>
          </div>

          <p className="text-gray-700 mb-6">
            {confirmModal.type === 'remove'
              ? 'Are you sure you want to remove this auto-fix? It will not be applied to your website.'
              : 'Are you sure you want to restore this auto-fix? It will be applied to your website.'}
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
                  ? 'Removing...'
                  : 'Restoring...'
                : confirmModal.type === 'remove'
                ? 'Remove'
                : 'Restore'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DomainAnalyses;
