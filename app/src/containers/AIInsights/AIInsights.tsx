import React, { useState } from 'react';
import {
  FiActivity,
  FiBarChart,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';
import { useLazyQuery, useMutation } from '@apollo/client';
import { ANALYZE_DOMAIN } from '@/queries/domainAnalysis/analyzeDomain';
import { ANALYZE_AI_READINESS } from '@/queries/aiReadiness/analyzeAIReadiness';
import { CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';

import { Search, Monitor, Loader2, Brain, Zap } from 'lucide-react';
import {
  getRootDomain,
  isValidRootDomainFormat,
  isIpAddress,
} from '@/utils/domainUtils';
import ControlPanel from '@/components/AIReadiness/ControlPanel';

const AIInsights: React.FC = () => {
  const [domainInput, setDomainInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [aiReadinessResult, setAiReadinessResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

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
    if (!domainInput.trim()) {
      toast.error('Please enter a domain URL');
      return;
    }

    const sanitizedDomain = getRootDomain(domainInput.trim());

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
      if (
        aiReadinessData.status === 'fulfilled' &&
        aiReadinessData.value.data
      ) {
        setAiReadinessResult(aiReadinessData.value.data.analyzeAIReadiness);
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
                      <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter your domain URL (e.g., example.com)"
                        className="w-full px-5 sm:px-7 py-3.5 sm:py-5 text-base sm:text-lg border-0 rounded-xl focus:ring-4 focus:ring-blue-400 focus:shadow-lg outline-none transition-all duration-300 bg-gray-50 hover:bg-white placeholder:text-gray-400 shadow-md hover:shadow-lg transform hover:scale-[1.01]"
                        disabled={isAnalyzing}
                      />
                      <div className="absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2"></div>
                    </div>
                  </div>
                  <div className="w-full">
                    <button
                      onClick={handleDomainAnalysis}
                      disabled={isAnalyzing || !domainInput.trim()}
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
            {/* Enhanced Analysis Results */}
            {(analysisError ||
              (analysisResult && analysisResult.status !== 'success')) && (
              <div className="mx-6 sm:mx-10 lg:mx-12 mb-6 sm:mb-10">
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 sm:p-7">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-red-800 font-semibold text-lg sm:text-xl">
                        Analysis Failed
                      </p>
                      <p className="text-red-600 text-sm sm:text-base">
                        {'An error occurred while analyzing the domain'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {analysisResult && analysisResult.status === 'success' && (
              <div className="border-t border-gray-100">
                <div className="p-6 sm:p-10 lg:p-12 space-y-8 sm:space-y-10">
                  {/* Success Header */}
                  <div className="bg-green-100 border border-green-300 rounded-xl p-5 sm:p-7 shadow-lg">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5">
                      <div className="flex items-center gap-4 sm:gap-5">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center">
                          <FiCheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                        </div>
                        <div>
                          <p className="text-green-800 font-bold text-xl sm:text-2xl">
                            Analysis Completed Successfully
                          </p>
                          <p className="text-green-700 text-sm sm:text-base">
                            Domain:{' '}
                            <span className="font-semibold">
                              {analysisResult.url}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row lg:flex-row lg:items-center gap-3 sm:gap-5 text-sm sm:text-base text-green-700">
                        <div className="flex items-center gap-2">
                          <FiClock className="w-12 h-12 md:w-6 md:h-6" />
                          <span>
                            Analyzed on{' '}
                            {new Date(
                              analysisResult.timestamp,
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiActivity className="w-12 h-12 md:w-6 md:h-6" />
                          <span>
                            Processing time:{' '}
                            {analysisResult.insights?.data?.processing_time?.toFixed(
                              2,
                            )}{' '}
                            s
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* AI Readiness Analysis Section */}
        {aiReadinessResult && (
          <section className="mb-8 sm:mb-12">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 border-0">
              <div className="p-6 sm:p-10 lg:p-12">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-3 mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 lg:w-6 lg:h-6 text-white" />
                  </div>
                </div>

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
