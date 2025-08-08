import React, { useState } from 'react';
import {
  FiActivity,
  FiBarChart,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiImage,
  FiInfo,
} from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { MdOutlineInsights, MdOutlineAccessibility } from 'react-icons/md';
import { BiAnalyse } from 'react-icons/bi';
import { useLazyQuery } from '@apollo/client';
import { ANALYZE_DOMAIN } from '@/queries/domainAnalysis/analyzeDomain';
import { CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';

import { Search, Monitor, Loader2 } from 'lucide-react';
import {
  getRootDomain,
  isValidRootDomainFormat,
  isIpAddress,
} from '@/utils/domainUtils';

const AIInsights: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [analyzeDomain, { loading: analysisLoading, error: analysisError }] =
    useLazyQuery(ANALYZE_DOMAIN, {
      onCompleted: (data) => {
        setAnalysisResult(data.analyzeDomain);
        // Auto-select the first available category
        if (data.analyzeDomain?.insights?.data?.heatmap_urls) {
          const firstCategory = Object.keys(
            data.analyzeDomain.insights.data.heatmap_urls,
          )[0];
          if (
            firstCategory &&
            data.analyzeDomain.insights.data.heatmap_urls[firstCategory]
          ) {
            setSelectedCategory(firstCategory);
          }
        }
      },
      onError: (error) => {
        console.error('Domain analysis error:', error);
      },
    });

  const handleDomainAnalysis = () => {
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

    analyzeDomain({
      variables: {
        domain: validDomain,
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDomainAnalysis();
    }
  };

  const getHeatmapData = () => {
    if (!analysisResult?.insights?.data?.heatmap_urls) return null;
    return {
      urls: analysisResult.insights.data.heatmap_urls,
      styles: analysisResult.insights.data.heatmap_styles,
    };
  };

  const getSelectedHeatmapUrl = () => {
    const heatmapData = getHeatmapData();
    if (!heatmapData || !selectedCategory) return null;
    return heatmapData.urls[selectedCategory];
  };

  const getSelectedHeatmapStyle = () => {
    const heatmapData = getHeatmapData();
    if (!heatmapData || !selectedCategory) return null;
    return heatmapData.styles[selectedCategory];
  };

  const getAvailableCategories = () => {
    const heatmapData = getHeatmapData();
    if (!heatmapData) return [];

    return Object.keys(heatmapData.urls)
      .map((categoryId) => ({
        id: categoryId,
        name: categoryId
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        url: heatmapData.urls[categoryId],
        style: heatmapData.styles[categoryId],
      }))
      .filter((category) => category.url); // Only show categories with URLs
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <header className="mb-8 sm:mb-12 lg:mb-16">
          <div className="text-center mb-6 sm:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl mb-4 sm:mb-8 shadow-xl">
              <FiBarChart className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-3 sm:mb-5 leading-tight">
              AI Heatmap Insights
            </h1>
            <p className="text-gray-600 text-base sm:text-xl max-w-4xl mx-auto leading-relaxed px-2 sm:px-0">
              Discover actionable insights with our advanced AI-powered heatmap
              analysis. Select different heatmap types to understand user
              behavior and optimize your website.
            </p>
          </div>
        </header>

        {/* Enhanced Domain Analysis Section */}
        <section className="mb-8 sm:mb-12">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-10 lg:p-12">
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center">
                  <Search className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">
                    Analyze Your Website
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-lg">
                    Get comprehensive AI-powered heatmap insights and
                    recommendations
                  </p>
                </div>
              </div>
              <div className="space-y-4 sm:space-y-8">
                <div className="flex flex-col space-y-4 sm:space-y-6">
                  <div className="w-full">
                    <div className="relative">
                      <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter your domain URL (e.g., example.com)"
                        className="w-full px-5 sm:px-7 py-3.5 sm:py-5 text-base sm:text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 hover:bg-white placeholder:text-gray-400"
                        disabled={analysisLoading}
                      />
                      <div className="absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2"></div>
                    </div>
                  </div>
                  <div className="w-full">
                    <button
                      onClick={handleDomainAnalysis}
                      disabled={analysisLoading || !domainInput.trim()}
                      className="w-full px-6 sm:px-10 py-3 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg shadow-lg disabled:transform-none"
                    >
                      {analysisLoading ? (
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
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 sm:p-7">
                    <div className="flex items-center gap-4 sm:gap-5 mb-4 sm:mb-5">
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-sm sm:text-base text-green-700">
                      <div className="flex items-center gap-2">
                        <FiClock className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>
                          Analyzed on{' '}
                          {new Date(analysisResult.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiActivity className="w-4 h-4 sm:w-5 sm:h-5" />
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
                  {/* Available Heatmap Categories */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-7 shadow-md">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                      Available Heatmap Categories
                    </h3>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                      {getAvailableCategories().map((category) => (
                        <button
                          key={category.id}
                          onClick={() =>
                            setSelectedCategory(
                              category.id as 'click' | 'scroll' | 'attention',
                            )
                          }
                          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-xs sm:text-base ${
                            selectedCategory === category.id
                              ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800'
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Selected Heatmap Display */}
                  {selectedCategory && getSelectedHeatmapUrl() && (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl">
                      <div className="p-5 sm:p-7 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center">
                              <FiImage className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                                {
                                  getAvailableCategories().find(
                                    (cat) => cat.id === selectedCategory,
                                  )?.name
                                }
                              </h3>
                              <p className="text-gray-600 text-sm sm:text-base">
                                {getSelectedHeatmapStyle()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                            <FiInfo className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Click image to view full size</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-5 sm:p-7">
                        <div className="relative overflow-hidden rounded-lg border border-gray-200">
                          <img
                            src={getSelectedHeatmapUrl() || '/placeholder.svg'}
                            alt={`${
                              getAvailableCategories().find(
                                (cat) => cat.id === selectedCategory,
                              )?.name
                            } Heatmap`}
                            className="w-full h-auto rounded-lg shadow-md cursor-pointer transition-transform duration-300 hover:scale-105"
                            onClick={() =>
                              window.open(getSelectedHeatmapUrl(), '_blank')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* No Heatmap Selected Message */}
                  {analysisResult && !selectedCategory && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 sm:p-10 text-center shadow-md">
                      <div className="w-12 h-12 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-6">
                        <FiImage className="w-6 h-6 sm:w-10 sm:h-10 text-blue-600" />
                      </div>
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                        Select a Heatmap Category
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-base px-2 sm:px-0">
                        Choose a heatmap category from above to view the
                        detailed analysis and insights.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AIInsights;
