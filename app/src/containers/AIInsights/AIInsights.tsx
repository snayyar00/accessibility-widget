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

import { Search, Monitor, Loader2, Brain } from 'lucide-react';
import {
  getRootDomain,
  isValidRootDomainFormat,
  isIpAddress,
} from '@/utils/domainUtils';
import ControlPanel from '@/components/AIReadiness/ControlPanel';
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
      <div className="accessibility-wrapper">
        <header className="accessibility-page-header text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Readiness & Heatmap Analysis
          </h1>
          <p className="text-xl text-gray-600">
            Get comprehensive AI readiness insights with multiple view modes
            including grid, charts, and heatmap analysis. Discover actionable
            recommendations to optimize your website for AI and user experience.
          </p>
        </header>

        <div className="w-full pl-6 pr-6 border-none shadow-none flex flex-col justify-center items-center">
          <div className="search-bar-container bg-white my-6 p-3 sm:p-4 rounded-xl w-full">
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="w-full">
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
                  placeholder="Select or enter a domain"
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
                      borderRadius: '6px',
                      border: state.isFocused
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                      minHeight: '38px',
                      boxShadow: state.isFocused
                        ? '0 0 0 2px rgba(59, 130, 246, 0.1)'
                        : 'none',
                      '&:hover': {
                        border: state.isFocused
                          ? '1px solid #3b82f6'
                          : '1px solid #d1d5db',
                      },
                    }),
                  }}
                />
              </div>

              <div className="w-full">
                <button
                  type="button"
                  className="search-button bg-primary text-white px-4 py-2 rounded whitespace-nowrap w-full"
                  style={{ width: '100%' }}
                  onClick={handleDomainAnalysis}
                  disabled={isAnalyzing}
                >
                  Free Scan
                  {isAnalyzing && (
                    <CircularProgress
                      size={14}
                      sx={{ color: 'white' }}
                      className="ml-2 my-auto"
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

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
