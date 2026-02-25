import React, { useState, useMemo } from 'react';
import { Analysis } from './DomainAnalyses';
import Favicon from '@/components/Common/Favicon';
import { getAuthenticationCookie } from '@/utils/cookie';

interface AnalysisCardProps {
  analysis: Analysis;
  onUpdate?: (updatedAnalysis: Analysis) => void;
}

interface ParsedAnalysis {
  status?: string;
  url?: string;
  timestamp?: string;
  analysis?: {
    status?: string;
    fixes?: Array<{
      selector?: string;
      issue_type?: string;
      wcag_criteria?: string;
      action?: string;
      impact?: string;
      description?: string;
      suggested_fix?: string;
      category?: string;
      current_value?: string;
      confidence?: number;
    }>;
    summary?: {
      total_fixes?: number;
      by_type?: Record<string, number>;
      by_category?: Record<string, { status?: string; issues?: number }>;
    };
    timestamp?: string;
  };
  mode?: string;
  correlation_id?: string;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis>(analysis);
  const [updatingIndex, setUpdatingIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all');

  const parsedData = useMemo<ParsedAnalysis | null>(() => {
    try {
      return JSON.parse(currentAnalysis.result_json);
    } catch (error) {
      console.error('Error parsing result_json:', error);
      return null;
    }
  }, [currentAnalysis.result_json]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatScore = (score: number | null) => {
    if (score === null) return 'N/A';
    return `${score.toFixed(1)}%`;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return '#656D7D';
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getImpactColor = (impact?: string) => {
    switch (impact?.toLowerCase()) {
      case 'serious':
      case 'critical':
        return '#EF4444';
      case 'moderate':
        return '#F59E0B';
      case 'minor':
        return '#10B981';
      default:
        return '#656D7D';
    }
  };

  const getImpactBadge = (impact?: string) => {
    const color = getImpactColor(impact);
    return (
      <span
        className="px-2 py-1 rounded text-xs font-medium"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {impact || 'Unknown'}
      </span>
    );
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('details') ||
      target.closest('summary') ||
      target.closest('code') ||
      target.closest('a') ||
      target.closest('button')
    ) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleFixActionUpdate = async (fixIndex: number, action: 'update' | 'deleted') => {
    setUpdatingIndex(fixIndex);
    try {
      const token = getAuthenticationCookie();
      const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/fix-action`;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          analysisId: currentAnalysis.id,
          fixIndex,
          action,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      const updatedAnalysis = await response.json();
      setCurrentAnalysis(updatedAnalysis);
      
      if (onUpdate) {
        onUpdate(updatedAnalysis);
      }
    } catch (error) {
      console.error('Error updating fix action:', error);
      alert('Failed to update fix action. Please try again.');
    } finally {
      setUpdatingIndex(null);
    }
  };

  // Calculate statistics
  const allFixes = parsedData?.analysis?.fixes || [];
  const activeFixes = allFixes.filter((fix) => fix.action !== 'deleted');
  const deletedFixes = allFixes.filter((fix) => fix.action === 'deleted');

  // Filter fixes based on selected filter
  const filteredFixes = useMemo(() => {
    if (filter === 'active') return activeFixes;
    if (filter === 'deleted') return deletedFixes;
    return allFixes;
  }, [filter, allFixes, activeFixes, deletedFixes]);

  // Group fixes by category with original indices
  // Create a stable mapping from filtered fixes to original indices
  // This prevents wrong fix targeting when duplicates exist
  const fixesByCategory = useMemo(() => {
    // Build a map of filtered fix indices to their original indices in allFixes
    const filteredToOriginalMap = new Map<number, number>();
    const usedOriginalIndices = new Set<number>();
    
    // First pass: try reference equality (works if filteredFixes shares references with allFixes)
    filteredFixes.forEach((fix, filteredIdx) => {
      const originalIdx = allFixes.findIndex((f) => f === fix);
      if (originalIdx >= 0 && !usedOriginalIndices.has(originalIdx)) {
        filteredToOriginalMap.set(filteredIdx, originalIdx);
        usedOriginalIndices.add(originalIdx);
      }
    });
    
    // Second pass: for unmapped fixes, use comprehensive field matching
    // Match on more fields and avoid already-mapped indices to prevent wrong targeting
    filteredFixes.forEach((fix, filteredIdx) => {
      if (!filteredToOriginalMap.has(filteredIdx)) {
        const originalIndex = allFixes.findIndex((f, idx) => {
          // Skip if this original index is already mapped
          if (usedOriginalIndices.has(idx)) return false;
          
          // Match on comprehensive set of fields to reduce false positives
          return (
            f.selector === fix.selector &&
            f.issue_type === fix.issue_type &&
            f.description === fix.description &&
            f.wcag_criteria === fix.wcag_criteria &&
            f.category === fix.category &&
            f.action === fix.action &&
            f.impact === fix.impact
          );
        });
        
        if (originalIndex >= 0) {
          filteredToOriginalMap.set(filteredIdx, originalIndex);
          usedOriginalIndices.add(originalIndex);
        } else {
          // Last resort: find any unmapped match (should be rare)
          const fallbackIndex = allFixes.findIndex(
            (f, idx) =>
              !usedOriginalIndices.has(idx) &&
              f.selector === fix.selector &&
              f.issue_type === fix.issue_type &&
              f.description === fix.description,
          );
          if (fallbackIndex >= 0) {
            filteredToOriginalMap.set(filteredIdx, fallbackIndex);
            usedOriginalIndices.add(fallbackIndex);
          } else {
            // Shouldn't happen, but use filtered index as absolute fallback
            console.warn(
              `[AnalysisCard] Could not map filtered fix at index ${filteredIdx} to original index`,
            );
            filteredToOriginalMap.set(filteredIdx, filteredIdx);
          }
        }
      }
    });
    
    const grouped: Record<
      string,
      Array<{ fix: typeof allFixes[0]; originalIndex: number }>
    > = {};
    
    filteredFixes.forEach((fix, filteredIdx) => {
      const category = fix.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      const originalIndex = filteredToOriginalMap.get(filteredIdx) ?? filteredIdx;
      grouped[category].push({
        fix,
        originalIndex,
      });
    });
    
    return grouped;
  }, [filteredFixes, allFixes]);

  return (
    <div className="w-full max-w-full bg-white border border-[#A2ADF3] rounded-lg shadow-sm mb-3 md:mb-4 overflow-hidden">
      {/* Header Section */}
      <div className="w-full p-2 md:p-3 lg:p-4 border-b border-gray-200">
        <div className="w-full flex items-start justify-between gap-2 mb-3 min-w-0">
          <div className="flex items-center min-w-0 flex-1 overflow-hidden max-w-[calc(100%-40px)]">
            {currentAnalysis.domain && (
              <div className="flex items-center mr-2 flex-shrink-0">
                <Favicon
                  domain={currentAnalysis.domain || ''}
                  size={16}
                  className="w-4 h-4 md:w-5 md:h-5"
                />
              </div>
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900 truncate">
                {currentAnalysis.domain || currentAnalysis.url || 'Unknown Domain'}
              </h3>
              {currentAnalysis.url && currentAnalysis.url !== currentAnalysis.domain && (
                <p className="text-xs md:text-sm text-gray-500 truncate mt-1">
                  {currentAnalysis.url}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`h-4 w-4 md:h-5 md:w-5 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Summary Statistics */}
        {allFixes.length > 0 && (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mt-3 md:mt-4">
            <div className="bg-blue-50 rounded-lg p-2 md:p-3 border border-blue-200 min-w-0">
              <div className="text-xs md:text-sm text-blue-600 font-medium mb-1 truncate">Total Fixes</div>
              <div className="text-lg md:text-xl lg:text-2xl font-bold text-blue-900">{allFixes.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 md:p-3 border border-green-200 min-w-0">
              <div className="text-xs md:text-sm text-green-600 font-medium mb-1 truncate">Active</div>
              <div className="text-lg md:text-xl lg:text-2xl font-bold text-green-900">{activeFixes.length}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-2 md:p-3 border border-red-200 min-w-0">
              <div className="text-xs md:text-sm text-red-600 font-medium mb-1 truncate">Deleted</div>
              <div className="text-lg md:text-xl lg:text-2xl font-bold text-red-900">{deletedFixes.length}</div>
            </div>
          </div>
        )}
      </div>

      {isExpanded && allFixes.length > 0 && (
        <div className="w-full p-2 md:p-3 lg:p-4">
          {/* Filter Buttons */}
          <div className="w-full flex flex-wrap gap-2 md:gap-3 mb-3 md:mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1.5 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors flex-1 md:flex-none ${
                filter === 'all'
                  ? 'bg-[#0052CC] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="truncate">All ({allFixes.length})</span>
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-2 py-1.5 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors flex-1 md:flex-none ${
                filter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="truncate">Active ({activeFixes.length})</span>
            </button>
            <button
              onClick={() => setFilter('deleted')}
              className={`px-2 py-1.5 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors flex-1 md:flex-none ${
                filter === 'deleted'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="truncate">Deleted ({deletedFixes.length})</span>
            </button>
          </div>

          {/* Fixes by Category */}
          {Object.keys(fixesByCategory).length > 0 ? (
            <div className="w-full space-y-4 md:space-y-6">
              {Object.entries(fixesByCategory).map(([category, fixesWithIndex]) => (
                <div key={category} className="w-full max-w-full">
                  <h4 className="text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3 capitalize flex items-center gap-2">
                    <span className="w-0.5 md:w-1 h-3 md:h-4 bg-[#0052CC] rounded"></span>
                    {category} ({fixesWithIndex.length})
                  </h4>
                  <div className="w-full space-y-2 md:space-y-3">
                    {fixesWithIndex.map(({ fix, originalIndex }, fixIndex) => {
                      return (
                        <div
                          key={`${category}-${fixIndex}-${originalIndex}`}
                          className={`bg-white rounded-lg p-3 md:p-4 border-2 transition-all overflow-hidden ${
                            fix.action === 'deleted'
                              ? 'border-red-300 bg-red-50/50'
                              : 'border-gray-200 hover:border-[#0052CC] hover:shadow-md'
                          }`}
                        >
                        <div className="w-full flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4 min-w-0">
                          <div className="flex-1 min-w-0 overflow-hidden max-w-full">
                            {/* Fix Header */}
                            <div className="w-full flex items-start gap-2 md:gap-3 mb-3 min-w-0">
                              <div className="flex-shrink-0 mt-1">
                                {fix.action === 'deleted' ? (
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-red-100 flex items-center justify-center">
                                      <svg
                                        className="w-4 h-4 md:w-5 md:h-5 text-red-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-green-100 flex items-center justify-center">
                                      <svg
                                        className="w-4 h-4 md:w-5 md:h-5 text-green-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden max-w-full">
                                  <div className="w-full flex flex-wrap items-center gap-1 md:gap-1.5 mb-2">
                                    <h5 className="text-sm md:text-base font-semibold text-gray-900 break-words max-w-full">
                                      {fix.issue_type || 'Accessibility Fix'}
                                    </h5>
                                    {getImpactBadge(fix.impact)}
                                    {fix.wcag_criteria && (
                                      <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium flex-shrink-0">
                                        WCAG {fix.wcag_criteria}
                                      </span>
                                    )}
                                  </div>
                                  {fix.description && (
                                    <p className="text-xs md:text-sm text-gray-700 mb-3 break-words overflow-wrap-anywhere">
                                      {fix.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Fix Details */}
                              <div className="w-full max-w-full bg-gray-50 rounded-lg p-2 md:p-3 space-y-2 mb-3 overflow-hidden">
                                {fix.suggested_fix && (
                                  <div className="w-full min-w-0 overflow-hidden">
                                    <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                      Auto Fix
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-900 bg-white p-2 rounded border border-green-200 break-words">
                                      {fix.suggested_fix}
                                    </div>
                                  </div>
                                )}
                                {fix.selector && (
                                  <div className="w-full min-w-0 overflow-hidden">
                                    <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                      Element Location
                                    </div>
                                    <div className="w-full overflow-x-auto">
                                      <code className="text-xs bg-gray-800 text-green-400 p-2 rounded font-mono inline-block max-w-full">
                                        {fix.selector}
                                      </code>
                                    </div>
                                  </div>
                                )}
                                {fix.current_value && (
                                  <div className="w-full text-xs break-words min-w-0">
                                    <span className="font-semibold text-gray-600">Current value: </span>
                                    <span className="text-gray-900">{fix.current_value}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex-shrink-0 w-full md:w-auto">
                              {fix.action === 'deleted' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFixActionUpdate(originalIndex, 'update');
                                  }}
                                  disabled={updatingIndex === originalIndex}
                                  className="w-full md:w-auto px-3 md:px-4 py-2 bg-green-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
                                  title="Restore this fix"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                  </svg>
                                  <span className="whitespace-nowrap">{updatingIndex === originalIndex ? 'Restoring...' : 'Restore'}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        'Are you sure you want to disable this auto-fix? It will not be applied to your website.',
                                      )
                                    ) {
                                      handleFixActionUpdate(originalIndex, 'deleted');
                                    }
                                  }}
                                  disabled={updatingIndex === originalIndex}
                                  className="w-full md:w-auto px-3 md:px-4 py-2 bg-red-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
                                  title="Disable this auto-fix"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                  <span className="whitespace-nowrap">{updatingIndex === originalIndex ? 'Disabling...' : 'Disable'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full text-center py-8">
              <p className="text-sm text-gray-500">
                {filter === 'active'
                  ? 'No active fixes found'
                  : filter === 'deleted'
                  ? 'No deleted fixes found'
                  : 'No fixes found'}
              </p>
            </div>
          )}

          {/* Analysis Info */}
          <div className="w-full mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-200">
            <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2 text-xs text-gray-500">
              <span className="truncate flex-1">Analyzed on {formatDate(currentAnalysis.analyzed_at)}</span>
              <span className="flex-shrink-0">Version {currentAnalysis.version}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisCard;
