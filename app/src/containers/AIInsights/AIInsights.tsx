import React, { useState, useMemo } from 'react';
import {
  FiActivity,
  FiBarChart,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { ANALYZE_DOMAIN } from '@/queries/domainAnalysis/analyzeDomain';
import { ANALYZE_AI_READINESS } from '@/queries/aiReadiness/analyzeAIReadiness';
import GET_USER_SITES from '@/queries/sites/getSites';
import { Site } from '@/generated/graphql';
import { CircularProgress } from '@mui/material';
import { toast } from 'sonner';
import Select from 'react-select/creatable';

import { Search, Monitor, Loader2, Brain } from 'lucide-react';
import {
  getRootDomain,
  isValidRootDomainFormat,
  isIpAddress,
} from '@/utils/domainUtils';
import ControlPanel from '@/components/AIReadiness/ControlPanel';
import NoReportsFound from '@/components/AIReadiness/NoReportsFound';
import '../Accessibility/Accessibility.css';
import '../Accessibility/AccessibilityReport.css';

type OptionType = { value: string; label: string };

const AIInsights: React.FC = () => {
  const [domainInput, setDomainInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [aiReadinessResult, setAiReadinessResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fetch user sites for domain selector
  const { data: sitesData, loading: sitesLoading } =
    useQuery(GET_USER_SITES);

  // Combine options for existing sites and a custom "Enter a new domain" option
  const siteOptions = useMemo(
    () =>
      sitesData?.getUserSites?.sites?.map((domain: Site | null | undefined) => ({
        value: domain?.url || '',
        label: domain?.url || '',
      })) || [],
    [sitesData],
  );

  const [analyzeDomain, { loading: analysisLoading, error: analysisError }] =
    useLazyQuery(ANALYZE_DOMAIN, {
      onCompleted: (data) => {
        setAnalysisResult(data.analyzeDomain);
      },
      onError: (error) => {
        console.error('Domain analysis error:', error);
      },
    });

  const [
    analyzeAIReadiness,
    { loading: aiReadinessLoading, error: aiReadinessError },
  ] = useMutation(ANALYZE_AI_READINESS);

  const handleDomainAnalysis = async () => {
    const domainToAnalyze = selectedOption?.value || domainInput.trim();

    if (!domainToAnalyze) {
      toast.error('Please enter or select a domain!');
      return;
    }

    const sanitizedDomain = getRootDomain(domainToAnalyze);

    // Validate domain format using the same logic as the scanner page
    if (
      sanitizedDomain !== 'localhost' &&
      !isIpAddress(sanitizedDomain) &&
      !isValidRootDomainFormat(sanitizedDomain)
    ) {
      toast.error('You must enter a valid domain name!');
      return;
    }

    const validDomain = sanitizedDomain;
    if (!validDomain) {
      toast.error('Please enter a valid domain!');
      return;
    }

    setIsAnalyzing(true);
    setShowResults(false);
    setAnalysisResult(null);
    setAiReadinessResult(null);

    try {
      // Run both analyses in parallel
      const [domainData, aiReadinessData] = await Promise.allSettled([
        analyzeDomain({
          variables: { domain: validDomain },
        }),
        analyzeAIReadiness({
          variables: { url: `https://${validDomain}` },
        }),
      ]);

      // Handle domain analysis results
      if (domainData.status === 'fulfilled' && domainData.value.data) {
        setAnalysisResult(domainData.value.data.analyzeDomain);
      }

      // Handle AI Readiness analysis results
      if (aiReadinessData.status === 'fulfilled') {
        if (aiReadinessData.value.data) {
          setAiReadinessResult(aiReadinessData.value.data.analyzeAIReadiness);
        } else if (aiReadinessData.value.errors) {
          console.error(
            'AI Readiness GraphQL errors:',
            aiReadinessData.value.errors,
          );
          const errorMessage =
            aiReadinessData.value.errors[0]?.message ||
            'AI Readiness analysis failed';
          toast.error(errorMessage);
        }
      } else if (aiReadinessData.status === 'rejected') {
        console.error(
          'AI Readiness analysis rejected:',
          aiReadinessData.reason,
        );
        const errorMessage =
          aiReadinessData.reason?.message || 'AI Readiness analysis failed';
        toast.error(errorMessage);
      }

      setShowResults(true);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDomainAnalysis();
    }
  };

  const handleDomainSelect = (selected: OptionType | null) => {
    setSelectedOption(selected);
    if (selected) {
      setDomainInput(selected.value);
    }
  };

  const handleCreateOption = (inputValue: string) => {
    const newOption = { value: inputValue, label: inputValue };
    setSelectedOption(newOption);
    setDomainInput(inputValue);
  };

  return (
    <>
      <div className="min-h-screen px-2 sm:px-4 py-4 sm:py-8">
        <div className="w-full max-w-7xl mx-auto">
          {/* Page Header - Outside the card */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-row sm:flex-col  gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                Content and Web Analysis
              </h1>
            </div>
          </div>

          {/* Main Card Container */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 w-full">
            {/* Card Header Section */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                Analyze Your Website
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                Get comprehensive AI-powered heatmap insights and
                recommendations.
              </p>
            </div>

            {/* Input Section */}
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-6">
              <div className="flex-1">
                <Select
                  options={siteOptions}
                  value={selectedOption}
                  onChange={(selected: OptionType | null) => {
                    setSelectedOption(selected);
                    if (selected) {
                      setDomainInput(selected.value);
                    }
                  }}
                  onCreateOption={(inputValue: any) => {
                    const newOption = { value: inputValue, label: inputValue };
                    setSelectedOption(newOption);
                    setDomainInput(inputValue);
                  }}
                  placeholder="Enter your Domain URL (e.g. example.com)"
                  isSearchable
                  isClearable
                  formatCreateLabel={(inputValue: any) =>
                    `Enter a new domain: "${inputValue}"`
                  }
                  classNamePrefix="react-select"
                  className="w-full min-w-0"
                  styles={{
                    control: (provided: any, state: any) => ({
                      ...provided,
                      borderRadius: '8px',
                      border: state.isFocused
                        ? '2px solid #3b82f6'
                        : '1px solid #e5e7eb',
                      minHeight: '44px',
                      boxShadow: state.isFocused
                        ? '0 0 0 3px rgba(59, 130, 246, 0.1)'
                        : 'none',
                      fontSize: '14px',
                      '@media (min-width: 640px)': {
                        fontSize: '16px',
                        minHeight: '48px',
                      },
                      '&:hover': {
                        border: state.isFocused
                          ? '2px solid #3b82f6'
                          : '1px solid #d1d5db',
                      },
                    }),
                    placeholder: (provided: any) => ({
                      ...provided,
                      color: '#9ca3af',
                      fontSize: '14px',
                      '@media (min-width: 640px)': {
                        fontSize: '16px',
                      },
                    }),
                  }}
                />
              </div>

              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors duration-200 min-w-[120px] sm:min-w-[140px] text-sm sm:text-base"
                onClick={handleDomainAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <CircularProgress size={18} sx={{ color: 'white' }} />
                ) : (
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="hidden sm:inline">Analyze now</span>
                <span className="sm:hidden">Analyze</span>
              </button>
            </div>
          </div>

          {/* No Reports Found State */}
          {!isAnalyzing && !aiReadinessResult && !analysisResult && (
            <div className="w-full">
              <NoReportsFound />
            </div>
          )}

          {/* AI Readiness Analysis Section */}
          {aiReadinessResult && (
            <div className="w-full">
              <div className="search-bar-container bg-white my-6 p-3 sm:p-4 rounded-xl w-full">
                <ControlPanel
                  isAnalyzing={isAnalyzing}
                  showResults={!!aiReadinessResult}
                  url={`https://${domainInput}`}
                  analysisData={aiReadinessResult}
                  heatmapData={analysisResult}
                  onReset={() => {
                    setShowResults(false);
                    setAnalysisResult(null);
                    setAiReadinessResult(null);
                    setDomainInput('');
                    setSelectedOption(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIInsights;
