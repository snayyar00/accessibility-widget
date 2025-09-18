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
import { GetUserSitesDocument } from '@/generated/graphql';
import { CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import Select from 'react-select/creatable';

import { Search, Monitor, Loader2, Brain, Zap } from 'lucide-react';
import {
  getRootDomain,
  isValidRootDomainFormat,
  isIpAddress,
} from '@/utils/domainUtils';
import ControlPanel from '@/components/AIReadiness/ControlPanel';

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
    useQuery(GetUserSitesDocument);

  // Combine options for existing sites and a custom "Enter a new domain" option
  const siteOptions = useMemo(
    () =>
      sitesData?.getUserSites?.map((domain: any) => ({
        value: domain.url,
        label: domain.url,
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
      toast.error('Please enter a domain URL');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full">
        {/* Enhanced Header */}
        <header className="mb-8 sm:mb-12 lg:mb-16">
          <div className="text-center mb-6 sm:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl mb-4 sm:mb-8 shadow-xl">
              <FiBarChart className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
            </div>
            <div className="flex flex-col-reverse md:flex-row items-center justify-center gap-3 sm:gap-4">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-600 to-blue-700 bg-clip-text text-transparent mb-3 sm:mb-5 leading-tight">
                AI Readiness & Heatmap Analysis
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-5 py-2 text-base sm:text-lg font-semibold ring-1 ring-inset ring-blue-300">
                Beta
              </span>
            </div>
            <p className="text-gray-600 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
              Get comprehensive AI readiness insights with multiple view modes
              including grid, charts, and heatmap analysis. Discover actionable
              recommendations to optimize your website for AI and user
              experience.
            </p>
          </div>
        </header>

        {/* Enhanced Domain Analysis Section */}
        <section className="mb-8 sm:mb-12">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden  transition-all duration-300 border-0">
            <div className="p-6 sm:p-10 lg:p-12">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 lg:w-6 lg:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">
                    Analyze Your Website
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-lg">
                    Get comprehensive AI readiness analysis with multiple view
                    modes including heatmap insights and recommendations
                  </p>
                </div>
              </div>
              <div className="space-y-4 sm:space-y-8">
                <div className="flex flex-col space-y-4 sm:space-y-6 pt-6">
                  <div className="w-full">
                    <div className="relative">
                      <Select
                        value={selectedOption}
                        options={siteOptions}
                        onChange={handleDomainSelect}
                        onCreateOption={handleCreateOption}
                        placeholder="Select or enter a domain"
                        isSearchable
                        isClearable
                        formatCreateLabel={(inputValue: string) =>
                          `Enter a new domain: "${inputValue}"`
                        }
                        classNamePrefix="react-select"
                        className="w-full min-w-0"
                        styles={{
                          control: (provided: any, state: any) => ({
                            ...provided,
                            borderRadius: '12px',
                            border: state.isFocused
                              ? '0px solid #3b82f6'
                              : '0px solid #d1d5db',
                            minHeight: '56px',
                            boxShadow: state.isFocused
                              ? '0 0 0 4px rgba(59, 130, 246, 0.1)'
                              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            backgroundColor: '#f9fafb',
                            '&:hover': {
                              backgroundColor: '#ffffff',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              transform: 'scale(1.01)',
                            },
                          }),
                          placeholder: (provided: any) => ({
                            ...provided,
                            color: '#9ca3af',
                            fontSize: '16px',
                          }),
                          input: (provided: any) => ({
                            ...provided,
                            fontSize: '16px',
                            padding: '12px 16px',
                          }),
                          singleValue: (provided: any) => ({
                            ...provided,
                            fontSize: '16px',
                            color: '#374151',
                          }),
                          menu: (provided: any) => ({
                            ...provided,
                            position: 'relative',
                            boxShadow: 'none',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            marginTop: '8px',
                            backgroundColor: 'white',
                          }),
                          menuList: (provided: any) => ({
                            ...provided,
                            padding: '8px',
                            maxHeight: '200px',
                          }),
                          option: (provided: any, state: any) => ({
                            ...provided,
                            padding: '12px 16px',
                            borderRadius: '8px',
                            margin: '2px 0',
                            backgroundColor: state.isSelected
                              ? '#dbeafe'
                              : state.isFocused
                              ? '#f3f4f6'
                              : 'transparent',
                            color: state.isSelected ? '#1e40af' : '#374151',
                            '&:hover': {
                              backgroundColor: state.isSelected
                                ? '#dbeafe'
                                : '#f3f4f6',
                            },
                          }),
                        }}
                        isDisabled={isAnalyzing}
                      />
                    </div>
                  </div>
                  <div className="w-full">
                    <button
                      onClick={handleDomainAnalysis}
                      disabled={
                        isAnalyzing ||
                        (!selectedOption?.value && !domainInput.trim())
                      }
                      className="w-full px-6 sm:px-10 py-3 sm:py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg shadow-lg disabled:transform-none"
                    >
                      {isAnalyzing ? (
                        <>
                          <CircularProgress size={16} />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                          <span>Analyze Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Readiness Analysis Section */}
        {aiReadinessResult && (
          <section className="mb-8 sm:mb-12">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 border-0">
              <div className="p-6 sm:p-10 lg:p-12">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-3 mb-6"></div>

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
          </section>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
