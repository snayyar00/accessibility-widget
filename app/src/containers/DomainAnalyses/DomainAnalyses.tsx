import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import { getAuthenticationCookie } from '@/utils/cookie';
import notFoundImage from '@/assets/images/not_found_image.png';
import Favicon from '@/components/Common/Favicon';
import AnalysisCard from './AnalysisCard';
import { useQuery } from '@apollo/client';
import GET_USER_SITES from '@/queries/sites/getSites';
import { Site } from '@/generated/graphql';
import Select from 'react-select/creatable';
import './DomainAnalyses.css';

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
  useDocumentHeader({ title: 'Domain Analyses' });
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loader, setLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const isMounted = useRef(true);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  // Fetch user sites for domain selector
  const { data: sitesData, loading: sitesLoading } = useQuery(GET_USER_SITES);

  // Create site options for the dropdown
  const siteOptions = useMemo(
    () =>
      sitesData?.getUserSites?.sites?.map((domain: Site | null | undefined) => ({
        value: domain?.url || '',
        label: domain?.url || '',
      })) || [],
    [sitesData],
  );

  type OptionType = { value: string; label: string };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchAnalyses = async (url: string) => {
    if (!url.trim()) {
      setAnalyses([]);
      setLoader(false);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setLoader(true);
    setError(null);
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses?url=${encodeURIComponent(url)}`;
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
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
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
          error instanceof Error
            ? error.message
            : 'Failed to fetch analyses',
        );
      }
    }
  };

  const handleDomainChange = (selected: OptionType | null) => {
    if (selected) {
      setSelectedOption(selected);
      fetchAnalyses(selected.value);
    } else {
      setSelectedOption(null);
      setAnalyses([]);
      setHasSearched(false);
    }
  };

  const handleCreateOption = (inputValue: string) => {
    const newOption = { value: inputValue, label: inputValue };
    setSelectedOption(newOption);
    fetchAnalyses(inputValue);
  };

  const handleScrollableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!scrollableContainerRef.current) return;

    const scrollAmount = 100;
    const container = scrollableContainerRef.current;

    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault();
        container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        break;
      case 'Home':
        e.preventDefault();
        container.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'End':
        e.preventDefault();
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        break;
    }
  };

  return (
    <div className="relative w-full overflow-x-hidden domain-analyses-container">
      <div className="absolute inset-0 bg-dotted-pattern opacity-20 -z-10"></div>

      <div className="relative z-0 w-full pb-2 md:pb-4 lg:pb-6 px-2 md:px-3 lg:px-4">
        <div className="w-full max-w-full min-w-0 mx-auto">
          <header className="mb-3 md:mb-4 lg:mb-6 text-left">
            <h1 className="text-2xl md:text-3xl lg:text-4xl text-gray-900 mb-1 md:mb-2">
              Auto Fixes
            </h1>
            <p className="text-sm md:text-base text-gray-600 break-words">
              Review and manage automatic accessibility fixes for your website
            </p>
          </header>

          <div className="w-full max-w-full bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-2 md:p-3 lg:p-4 mb-3 md:mb-4 overflow-hidden">
            <div className="w-full mb-3 md:mb-4 pt-2 md:pt-3">
              <h2 className="text-lg md:text-xl text-gray-900 mb-1 md:mb-2">
                Select Your Website
              </h2>
              <p className="text-xs md:text-sm text-gray-500">
                Choose a domain to view available auto-fixes
              </p>
            </div>

            <div className="w-full pt-2 pb-2 md:pb-3">
              <label
                htmlFor="domain-select-input"
                className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5"
              >
                Domain name
              </label>
              <div className="w-full min-w-0 max-w-full">
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
                    }),
                    menu: (base: any) => ({
                      ...base,
                      maxWidth: '100%',
                    }),
                  }}
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-full bg-[#eaeffb] rounded-lg shadow-sm border border-[#A2ADF3] p-2 md:p-3 lg:p-4 overflow-hidden">
            {loader ? (
              <div className="flex justify-center py-8 md:py-12">
                <CircularProgress
                  size={80}
                  sx={{ color: '#0080ff' }}
                  className="mx-auto my-auto md:w-[100px] md:h-[100px]"
                />
              </div>
            ) : error ? (
              <div className="text-center py-8 md:py-12 px-4">
                <p className="text-sm md:text-base text-red-600 break-words">{error}</p>
              </div>
            ) : !hasSearched ? (
              // Empty State Card - No search performed yet
              <div className="w-full py-6 md:py-8 px-2 md:px-3">
                <div className="w-full mb-3 md:mb-4 border-b border-[#7383ED] pb-2">
                  <h3 className="text-sm md:text-base font-medium text-gray-900">Scan history</h3>
                </div>
                <div className="w-full flex flex-col items-center justify-center py-8 md:py-12">
                  {/* Accessibility Scan Icon */}
                  <div className="mb-4 md:mb-6 relative">
                    <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-white rounded-lg border-2 border-[#A2ADF3] flex flex-col items-center justify-center shadow-sm">
                      {/* Header bar */}
                      <div className="w-full h-3 md:h-4 bg-[#0052CC] rounded-t-lg"></div>
                      {/* Content bars */}
                      <div className="flex-1 w-full p-1.5 md:p-2 space-y-1 md:space-y-1.5">
                        <div className="flex gap-1 md:gap-1.5">
                          <div className="h-1.5 md:h-2 bg-[#A2ADF3] rounded flex-1"></div>
                          <div className="h-1.5 md:h-2 bg-[#A2ADF3] rounded flex-1"></div>
                        </div>
                        <div className="flex gap-1 md:gap-1.5">
                          <div className="h-1.5 md:h-2 bg-[#A2ADF3] rounded flex-1"></div>
                          <div className="h-1.5 md:h-2 bg-[#A2ADF3] rounded flex-1"></div>
                        </div>
                        <div className="h-1.5 md:h-2 bg-[#A2ADF3] rounded w-1/2"></div>
                      </div>
                      {/* Accessibility symbol badge */}
                      <div className="absolute -bottom-1.5 -right-1.5 md:-bottom-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-[#0052CC] rounded-full flex items-center justify-center shadow-md">
                        <svg
                          className="w-3.5 h-3.5 md:w-5 md:h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {/* Message */}
                  <p className="text-sm md:text-base font-medium text-gray-900 text-center px-2 max-w-full">
                    Select a domain from the dropdown to see auto fixes
                  </p>
                </div>
              </div>
            ) : (
              <>
                {analyses.length > 0 ? (
                  <div className="w-full max-w-full min-w-0 space-y-3 md:space-y-4">
                    {analyses.map((analysis) => (
                      <AnalysisCard
                        key={analysis.id}
                        analysis={analysis}
                        onUpdate={(updatedAnalysis) => {
                          setAnalyses((prev) =>
                            prev.map((a) =>
                              a.id === updatedAnalysis.id ? updatedAnalysis : a,
                            ),
                          );
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full text-center py-8 md:py-12 px-2 md:px-4">
                    <div className="mx-auto mb-4 md:mb-6">
                      <img
                        src={notFoundImage}
                        alt=""
                        role="presentation"
                        className="mx-auto h-20 md:h-24 lg:h-32 w-auto max-w-full"
                      />
                    </div>
                    <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                      No analyses found
                    </h3>
                    <p className="text-xs md:text-sm max-w-full px-2" style={{ color: '#676D7B' }}>
                      No accessibility analyses found for this domain.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainAnalyses;
