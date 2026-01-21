import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { toast } from 'sonner';
import Select from 'react-select';
import { components } from 'react-select';
import Favicon from '@/components/Common/Favicon';
import { CircularProgress } from '@mui/material';
import { baseColors } from '@/config/colors';
import { fetchScraperAnalysis, ScraperAnalysisResponse } from '@/utils/scraperAnalysis';
import ScraperAnalysisDisplay from '@/components/Accessibility/ScraperAnalysisDisplay';
import GET_USER_SITES from '@/queries/sites/getSites';
import { Site } from '@/generated/graphql';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { RiRobot2Line } from 'react-icons/ri';
import notFoundImage from '@/assets/images/not_found_image.png';

type OptionType = { value: string; label: string };

const ScraperAnalysis: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: 'Auto-Fix Analysis' });

  const { data: sitesData, loading: sitesLoading } = useQuery(GET_USER_SITES);
  const selectedDomainFromRedux = useSelector(
    (state: RootState) => state.report.selectedDomain,
  );

  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [scraperAnalysis, setScraperAnalysis] = useState<ScraperAnalysisResponse | null>(null);
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperError, setScraperError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>('');

  // Helper function to normalize URL for comparison (removes protocol, www, trailing slash)
  const normalizeBaseUrl = (url: string): string => {
    if (!url) return '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return `${urlObj.protocol}//${urlObj.hostname}`.toLowerCase().replace(/\/$/, '');
    } catch {
      // If URL parsing fails, try simple normalization
      return url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .toLowerCase();
    }
  };

  // Helper function to check if a URL is a path of an owned domain
  const isPathOfOwnedDomain = (inputUrl: string): boolean => {
    if (!inputUrl || !sitesData?.getUserSites?.sites) return false;
    
    try {
      const inputUrlObj = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
      const inputBase = `${inputUrlObj.protocol}//${inputUrlObj.hostname}`.toLowerCase();
      
      return sitesData.getUserSites.sites.some((site: Site | null | undefined) => {
        if (!site?.url) return false;
        try {
          const siteUrlObj = new URL(site.url.startsWith('http') ? site.url : `https://${site.url}`);
          const siteBase = `${siteUrlObj.protocol}//${siteUrlObj.hostname}`.toLowerCase();
          return siteBase === inputBase;
        } catch {
          // Fallback to simple comparison
          const normalizedSite = normalizeBaseUrl(site.url);
          const normalizedInput = normalizeBaseUrl(inputUrl);
          return normalizedSite === normalizedInput.split('/')[0];
        }
      });
    } catch {
      // Fallback to simple comparison
      const inputBase = normalizeBaseUrl(inputUrl);
      return sitesData.getUserSites.sites.some((site: Site | null | undefined) => {
        if (!site?.url) return false;
        const siteBase = normalizeBaseUrl(site.url);
        return inputBase.startsWith(siteBase) || siteBase === inputBase.split('/')[0];
      });
    }
  };

  // Combine options for existing sites
  const siteOptions = useMemo(
    () =>
      sitesData?.getUserSites?.sites?.map((domain: Site | null | undefined) => ({
        value: domain?.url || '',
        label: domain?.url || '',
      })) || [],
    [sitesData],
  );

  // Enhanced options that include valid paths of owned domains
  const enhancedOptions = useMemo(() => {
    const baseOptions = [...siteOptions];
    
    // If user has typed a URL that's a path of an owned domain, add it as an option
    if (inputValue && inputValue.trim()) {
      const trimmedInput = inputValue.trim();
      // Normalize the input to ensure it has a protocol
      let normalizedInput = trimmedInput;
      if (!normalizedInput.startsWith('http://') && !normalizedInput.startsWith('https://')) {
        normalizedInput = `https://${normalizedInput}`;
      }
      
      if (isPathOfOwnedDomain(normalizedInput)) {
        // Check if it's already in options
        const exists = baseOptions.some(opt => {
          const optNormalized = opt.value.startsWith('http') ? opt.value : `https://${opt.value}`;
          return optNormalized === normalizedInput || opt.value === normalizedInput;
        });
        if (!exists) {
          baseOptions.push({
            value: normalizedInput,
            label: normalizedInput,
          });
        }
      }
    }
    
    return baseOptions;
  }, [siteOptions, inputValue, sitesData]);

  // Set initial selected option from Redux or first site
  useEffect(() => {
    if (selectedDomainFromRedux && siteOptions.length > 0) {
      const matchedOption = siteOptions.find(
        (opt: any) => opt.value === selectedDomainFromRedux,
      );
      if (matchedOption) {
        setSelectedOption(matchedOption);
      }
    } else if (siteOptions.length > 0 && !selectedOption) {
      setSelectedOption(siteOptions[0]);
    }
  }, [selectedDomainFromRedux, siteOptions]);

  // Fetch scraper analysis for the current URL
  const fetchScraperAnalysisData = async (urlToAnalyze: string) => {
    if (!urlToAnalyze || urlToAnalyze.trim() === '') {
      return;
    }

    setScraperLoading(true);
    setScraperError(null);

    try {
      // Normalize URL - ensure it has protocol
      let normalizedUrl = urlToAnalyze.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      const data = await fetchScraperAnalysis(normalizedUrl);
      setScraperAnalysis(data);
      toast.success('Analysis completed successfully');
    } catch (error: any) {
      console.error('Error fetching scraper analysis:', error);
      // Show generic error message to user
      const genericError = 'Unable to analyze the website. Please try again later.';
      setScraperError(genericError);
      setScraperAnalysis(null);
      toast.error(genericError);
    } finally {
      setScraperLoading(false);
    }
  };

  // Clear analysis when domain is cleared
  useEffect(() => {
    if (!selectedOption) {
      setScraperAnalysis(null);
      setScraperError(null);
    }
  }, [selectedOption]);

  const handleAnalyze = () => {
    if (selectedOption?.value) {
      fetchScraperAnalysisData(selectedOption.value);
    } else {
      toast.error('Please select a domain from your sites');
    }
  };

  return (
    <>
      <div className="relative">
        {/* Dotted pattern background */}
        <div className="absolute inset-0 bg-dotted-pattern opacity-20 -z-10"></div>

        <div className="relative z-0 pl-2 pb-2 sm:pb-4 md:pb-6 px-4 sm:px-6 lg:px-8">
          <div className="w-full">
            <header className="mb-1 sm:mb-2 text-left">
              <h1 className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl text-gray-900">
                Auto-Fix Analysis
              </h1>
            </header>

            {/* Search/Filter Card */}
            <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="mb-3 sm:mb-4 pl-4 pt-4">
                <h2 className="text-2xl sm:text-xl md:text-2xl text-gray-900 mb-1 sm:mb-2">
                  Analyze Your Website
                </h2>
                <p className="text-base sm:text-sm md:text-base text-gray-500">
                  Discover auto-fixable accessibility issues and get instant recommendations
                </p>
              </div>

              {/* Input Section */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-end pl-2 pt-2 pb-4">
                <div className="w-full md:flex-1">
                  <label
                    htmlFor="scraper-domain-select"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Select Domain
                  </label>
                  <Select
                  inputId="scraper-domain-select"
                  aria-label="Website URL"
                  options={enhancedOptions}
                  value={selectedOption}
                  onInputChange={(newValue: string) => {
                    setInputValue(newValue);
                  }}
                  onChange={(selected: OptionType | null) => {
                    setSelectedOption(selected);
                    if (selected) {
                      setInputValue(selected.value);
                    } else {
                      setInputValue('');
                    }
                  }}
                  placeholder="Select a domain or enter a path of your owned domain"
                  isSearchable
                  isClearable
                  filterOption={(option: { label: string; value: string; data: OptionType }, searchText: string) => {
                    if (!searchText) return true;
                    
                    const searchLower = searchText.toLowerCase();
                    const optionLower = option.label.toLowerCase();
                    
                    // Always show if it matches the search
                    if (optionLower.includes(searchLower)) {
                      return true;
                    }
                    
                    // Normalize search text to check if it's a valid path
                    let normalizedSearch = searchText.trim();
                    if (!normalizedSearch.startsWith('http://') && !normalizedSearch.startsWith('https://')) {
                      normalizedSearch = `https://${normalizedSearch}`;
                    }
                    
                    // Check if the search text is a valid path of an owned domain
                    if (isPathOfOwnedDomain(normalizedSearch)) {
                      const optionNormalized = option.value.startsWith('http') ? option.value : `https://${option.value}`;
                      return optionNormalized === normalizedSearch || option.value === normalizedSearch;
                    }
                    
                    return false;
                  }}
                  noOptionsMessage={(props: { inputValue: string }) => {
                    if (props.inputValue && isPathOfOwnedDomain(props.inputValue)) {
                      return null; // Don't show message if it's a valid path
                    }
                    return "No domains found. Add a domain from your sites first or enter a path of your owned domain.";
                  }}
                  formatOptionLabel={(option: OptionType) => (
                    <div className="flex items-center gap-2">
                      <Favicon domain={option.value} size={16} />
                      <span>{option.label}</span>
                    </div>
                  )}
                  classNamePrefix="react-select"
                  className="w-full min-w-0"
                  components={{
                    ClearIndicator: (props: any) => {
                      const {
                        innerProps,
                        isDisabled,
                        clearValue,
                      } = props;
                      
                      const enhancedInnerProps = {
                        ...innerProps,
                        tabIndex: isDisabled ? -1 : 0,
                        role: 'button',
                        'aria-label': 'Clear selection',
                        onClick: (e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isDisabled && clearValue) {
                            clearValue();
                          }
                          if (innerProps.onClick) {
                            innerProps.onClick(e);
                          }
                        },
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isDisabled && clearValue) {
                              clearValue();
                            }
                          } else if (innerProps.onKeyDown) {
                            innerProps.onKeyDown(e);
                          }
                        },
                      };

                      return components.ClearIndicator({
                        ...props,
                        innerProps: enhancedInnerProps,
                      });
                    },
                  }}
                  styles={{
                    control: (provided: any, state: any) => ({
                      ...provided,
                      borderRadius: '6px',
                      border: state.isFocused
                        ? `1px solid #0052CC`
                        : `1px solid #d1d5db`,
                      minHeight: '40px',
                      fontSize: '14px',
                      backgroundColor: baseColors.white,
                      boxShadow: state.isFocused
                        ? `0 0 0 2px rgba(0, 82, 204, 0.2)`
                        : 'none',
                      '&:hover': {
                        border: state.isFocused
                          ? `1px solid #0052CC`
                          : `1px solid #9ca3af`,
                      },
                    }),
                    placeholder: (provided: any) => ({
                      ...provided,
                      color: '#6b7280',
                      fontSize: '14px',
                    }),
                    input: (provided: any) => ({
                      ...provided,
                      color: baseColors.grayDark,
                      fontSize: '14px',
                    }),
                    indicatorSeparator: () => ({
                      display: 'none',
                    }),
                    dropdownIndicator: (provided: any) => ({
                      ...provided,
                      color: '#767676',
                      '&:hover': {
                        color: '#767676',
                      },
                    }),
                    clearIndicator: (provided: any) => ({
                      ...provided,
                      color: '#767676',
                      '&:hover': {
                        color: '#767676',
                      },
                    }),
                  }}
                />
                </div>
                <div className="w-full md:w-auto">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={scraperLoading || !selectedOption?.value}
                    className="w-full md:w-auto text-xs sm:text-sm md:text-base inline-flex items-center justify-center pl-3 pr-8 py-2 sm:pl-4 sm:pr-10 sm:py-2 md:pl-5 md:pr-12 md:py-3 border border-transparent font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                    style={{ backgroundColor: '#0052CC' }}
                    onMouseEnter={(e) => {
                      if (!scraperLoading && selectedOption?.value) {
                        e.currentTarget.style.backgroundColor = '#0040A0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0052CC';
                    }}
                  >
                    {scraperLoading ? (
                      <>
                        <CircularProgress size={16} sx={{ color: 'white' }} />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        <span>Analyze</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Issues Display Card */}
            <div className="bg-[#eaeffb] rounded-lg shadow-sm border border-[#A2ADF3] p-3 sm:p-4">
              {/* Loading State for Sites */}
              {sitesLoading && (
                <div className="flex justify-center py-12">
                  <CircularProgress
                    size={100}
                    sx={{ color: '#0080ff' }}
                    className="mx-auto my-auto"
                  />
                </div>
              )}

              {/* Initial State - No Analysis Yet */}
              {!sitesLoading && !scraperAnalysis && !scraperLoading && !scraperError && (
                <div className="w-full">
                  {/* Header Section with Tabs - Similar to ProblemReport */}
                  <div className="mb-3 border-b border-gray-200 pb-2 pl-4">
                    <div className="flex gap-8 mb-3">
                      {/* Active Fixes Tab */}
                      <div
                        className="cursor-pointer transition-all duration-200"
                        style={{
                          color: '#656D7D',
                        }}
                      >
                        <h3 className="text-base font-medium">Active Fixes</h3>
                        <p className="text-lg font-semibold mt-1">
                          0
                        </p>
                      </div>

                      {/* Deleted Fixes Tab */}
                      <div
                        className="cursor-pointer transition-all duration-200"
                        style={{
                          color: '#656D7D',
                        }}
                      >
                        <h3 className="text-base font-medium">Deleted Fixes</h3>
                        <p className="text-lg font-semibold mt-1">
                          0
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-center -ml-4 px-4">
                      <div className="w-full h-0.5 bg-[#7383ED] mt-2"></div>
                    </div>
                  </div>

                  {/* Scrollable Content Container - Similar to ProblemReport */}
                  <div
                    className="max-h-80 sm:max-h-96 md:max-h-[28rem] lg:max-h-[32rem] overflow-y-auto pr-1 sm:pr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    tabIndex={0}
                    role="region"
                    aria-label="Initial state - no analysis yet"
                  >
                    <div className="space-y-3 sm:space-y-4">
                      {/* Empty State */}
                      <div className="text-center py-12">
                        <div className="mx-auto mb-6">
                          <img
                            src={notFoundImage}
                            alt=""
                            role="presentation"
                            className="mx-auto h-32 w-auto"
                          />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No issues found, press analyze
                        </h3>
                        <p className="text-sm" style={{ color: '#676D7B' }}>
                          Select a domain and click the Analyze button to discover auto-fixable accessibility issues for your website.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scraper Analysis Display */}
              {!sitesLoading && (scraperAnalysis || scraperLoading || scraperError) && (
                <ScraperAnalysisDisplay
                  data={scraperAnalysis}
                  loading={scraperLoading}
                  error={scraperError}
                  onRefresh={() => selectedOption?.value && fetchScraperAnalysisData(selectedOption.value)}
                  onUpdate={() => {
                    // Refetch analysis to get updated applied/deleted fixes
                    if (selectedOption?.value) {
                      fetchScraperAnalysisData(selectedOption.value);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScraperAnalysis;
