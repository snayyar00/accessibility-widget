import React, { useState, useEffect, useMemo } from 'react';
import { ScraperAnalysisResponse, AutoFix, updateDeletedFixes, getDeletedFixes } from '@/utils/scraperAnalysis';
import { Typography, Box, Chip, CircularProgress, Tabs, Tab } from '@mui/material';
import { CheckCircle, AlertCircle, RefreshCw, Code2, Wrench, X, Trash2 } from 'lucide-react';
import { baseColors } from '@/config/colors';
import { toast } from 'sonner';
import notFoundImage from '@/assets/images/not_found_image.png';

interface ScraperAnalysisDisplayProps {
  data: ScraperAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onUpdate?: () => void;
}

const ScraperAnalysisDisplay: React.FC<ScraperAnalysisDisplayProps> = ({
  data,
  loading,
  error,
  onRefresh,
  onUpdate,
}) => {
  const [deletedFixesList, setDeletedFixesList] = useState<AutoFix[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<Set<string>>(new Set());

  // Reset filters when data changes
  useEffect(() => {
    setSelectedIssueTypes(new Set());
  }, [data?.url]);

  // Fetch deleted fixes from separate endpoint
  useEffect(() => {
    let isMounted = true;
    
    const fetchDeletedFixes = async () => {
      if (!data?.url) {
        if (isMounted) {
          setDeletedFixesList([]);
        }
        return;
      }

      setDeletedLoading(true);
      try {
        const deletedFixes = await getDeletedFixes(data.url);
        if (isMounted) {
          setDeletedFixesList(deletedFixes || []);
        }
      } catch (error: any) {
        console.error('Error fetching deleted fixes:', error);
        // Don't show error toast, just log it
        if (isMounted) {
          setDeletedFixesList([]);
        }
      } finally {
        if (isMounted) {
          setDeletedLoading(false);
        }
      }
    };

    fetchDeletedFixes();
    
    return () => {
      isMounted = false;
    };
  }, [data?.url]);

  // Active fixes are already filtered by backend (deleted ones removed)
  const allActiveFixes = useMemo(() => {
    return data?.analysis?.auto_fixes || [];
  }, [data?.analysis?.auto_fixes]);

  // Filter active fixes by selected issue types
  const activeFixes = useMemo(() => {
    if (selectedIssueTypes.size === 0) {
      return allActiveFixes;
    }
    return allActiveFixes.filter(fix => selectedIssueTypes.has(fix.issue_type));
  }, [allActiveFixes, selectedIssueTypes]);

  // Deleted fixes come from database
  const allDeletedFixes = useMemo(() => {
    return deletedFixesList || [];
  }, [deletedFixesList]);

  // Filter deleted fixes by selected issue types
  const filteredDeletedFixes = useMemo(() => {
    if (selectedIssueTypes.size === 0) {
      return allDeletedFixes;
    }
    return allDeletedFixes.filter(fix => selectedIssueTypes.has(fix.issue_type));
  }, [allDeletedFixes, selectedIssueTypes]);

  // Calculate summary by type for deleted fixes
  const deletedFixesSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    allDeletedFixes.forEach(fix => {
      summary[fix.issue_type] = (summary[fix.issue_type] || 0) + 1;
    });
    return summary;
  }, [allDeletedFixes]);

  const handleToggleDeleted = async (fix: AutoFix) => {
    if (!data?.url || updating) return;

    const selector = fix.selector.trim();
    const isCurrentlyDeleted = deletedFixesList.some(f => f.selector.trim() === selector);
    
    setUpdating(true);
    
    // Optimistically update UI
    let newDeleted: AutoFix[];
    if (isCurrentlyDeleted) {
      // Remove from deleted (restore fix)
      newDeleted = deletedFixesList.filter(f => f.selector.trim() !== selector);
      setDeletedFixesList(newDeleted);
    } else {
      // Add to deleted - ensure we have a clean copy of the fix
      const fixToAdd: AutoFix = {
        selector: fix.selector.trim(),
        action: fix.action,
        attributes: { ...fix.attributes },
        issue_type: fix.issue_type,
      };
      newDeleted = [...deletedFixesList, fixToAdd];
      setDeletedFixesList(newDeleted);
    }

    try {
      await updateDeletedFixes(data.url, newDeleted);
      toast.success(isCurrentlyDeleted ? 'Fix restored' : 'Fix marked as deleted');
      
      // Refresh deleted fixes from endpoint
      try {
        const refreshedDeleted = await getDeletedFixes(data.url);
        setDeletedFixesList(refreshedDeleted);
      } catch (error: any) {
        console.error('Error refreshing deleted fixes:', error);
      }
      
      // Refresh the analysis to get updated filtered results
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        onUpdate?.();
      });
    } catch (error: any) {
      console.error('Error updating deleted fixes:', error);
      toast.error(error.message || 'Failed to update deleted fixes');
      // Revert local state on error
      if (isCurrentlyDeleted) {
        setDeletedFixesList(prev => [...prev, fix]);
      } else {
        setDeletedFixesList(prev => prev.filter(f => f.selector.trim() !== selector));
      }
    } finally {
      setUpdating(false);
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <CircularProgress
          size={100}
          sx={{ color: '#0080ff' }}
          className="mx-auto my-auto"
        />
      </div>
    );
  }

  if (error) {
    return (
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
          aria-label="Error state for auto-fixes analysis"
        >
          <div className="space-y-3 sm:space-y-4">
            {/* Error Empty State */}
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
                Unable to analyze the website. Please try again later.
              </h3>
              <p className="text-sm" style={{ color: '#676D7B' }}>
                There was an error while analyzing your website. Please check your connection and try again.
              </p>
              {onRefresh && (
                <div className="mt-6">
                  <button
                    onClick={onRefresh}
                    className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:shadow-md text-white"
                    style={{ backgroundColor: '#0052CC' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0040A0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0052CC';
                    }}
                  >
                    <RefreshCw size={16} className="inline mr-2" />
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.status !== 'success') {
    return null;
  }

  const { analysis } = data;
  const { summary } = analysis;

  const renderFixCard = (fix: AutoFix, index: number) => {
    return (
      <div
        key={index}
        className="bg-white border border-[#A2ADF3] rounded-lg p-3 sm:p-4 md:p-5 transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
      >
        {/* Header Section - Icon + Issue Type + Actions */}
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', md: 'row' }}
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', md: 'start' }}
          mb={2} 
          gap={1.5}
          sx={{ gap: { xs: '12px', sm: '16px' } }}
        >
          {/* Left: Icon + Issue Type */}
          <Box 
            display="flex" 
            alignItems="center" 
            gap={1.5} 
            flex={1} 
            minWidth={0}
            width="100%"
            sx={{ gap: { xs: '8px', sm: '12px' } }}
          >
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: baseColors.brandPrimary + '15' }}
            >
              <Wrench size={14} className="sm:w-4 sm:h-4" style={{ color: baseColors.brandPrimary }} />
            </div>
            <Typography 
              variant="body1" 
              fontWeight="semibold" 
              sx={{ 
                color: baseColors.grayDark, 
                fontSize: { xs: '0.875rem', sm: '1rem' }, 
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                lineHeight: 1.4,
                flex: 1,
                minWidth: 0,
              }}
            >
              {fix.issue_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Typography>
          </Box>
          
          {/* Right: Actions (Chip + Buttons) */}
          <Box 
            display="flex" 
            gap={1} 
            alignItems="center" 
            flexWrap="nowrap"
            flexShrink={0}
            sx={{ gap: { xs: '6px', sm: '8px' } }}
          >
            <Chip
              label={fix.action.toUpperCase()}
              size="small"
              sx={{
                backgroundColor: fix.action === 'update' ? baseColors.brandPrimary : baseColors.grayMedium,
                color: baseColors.white,
                fontWeight: 'bold',
                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                height: { xs: '22px', sm: '24px' },
                whiteSpace: 'nowrap',
              }}
            />
            {activeTab === 'active' && (
              <button
                onClick={() => handleToggleDeleted(fix)}
                disabled={updating}
                className="p-1 sm:p-1.5 rounded transition-all duration-200 disabled:opacity-50 flex-shrink-0"
                style={{
                  backgroundColor: 'transparent',
                  color: baseColors.error,
                }}
                title="Mark as deleted"
                onMouseEnter={(e) => {
                  if (!updating) {
                    e.currentTarget.style.backgroundColor = baseColors.error + '10';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            )}
            {activeTab === 'deleted' && (
              <button
                onClick={() => handleToggleDeleted(fix)}
                disabled={updating}
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded transition-all duration-200 disabled:opacity-50 text-xs sm:text-sm font-medium flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: baseColors.brandPrimary,
                  color: baseColors.white,
                }}
                title="Restore fix"
                onMouseEnter={(e) => {
                  if (!updating) {
                    e.currentTarget.style.backgroundColor = baseColors.brandPrimaryHover;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = baseColors.brandPrimary;
                }}
              >
                <RefreshCw size={12} className="sm:w-[14px] sm:h-[14px]" />
                <span className="hidden md:inline">Restore</span>
              </button>
            )}
          </Box>
        </Box>
        
        <div className="mb-3 p-2 sm:p-3 rounded-md overflow-hidden" style={{ backgroundColor: baseColors.white }}>
          <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
            <Code2 size={12} className="sm:w-[14px] sm:h-[14px] flex-shrink-0" style={{ color: baseColors.grayMedium }} />
            <Typography variant="caption" fontWeight="bold" sx={{ color: baseColors.grayMedium, fontSize: { xs: '0.7rem', sm: '0.75rem' }, whiteSpace: 'nowrap' }}>
              CSS Selector:
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              color: baseColors.grayDark,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              pl: { xs: 1.5, sm: 2 },
              lineHeight: 1.5,
            }}
          >
            {fix.selector}
          </Typography>
        </div>

        {Object.keys(fix.attributes).length > 0 && (
          <Box>
            <Typography variant="body2" fontWeight="bold" mb={1.5} sx={{ color: baseColors.grayDark, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Attributes to {fix.action}:
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {Object.entries(fix.attributes).map(([key, value]) => (
                <Box
                  key={key}
                  className="pl-2 sm:pl-3 py-1 rounded overflow-hidden"
                  sx={{
                    borderLeft: `3px solid ${baseColors.brandPrimary}`,
                    backgroundColor: baseColors.white,
                  }}
                >
                  <Typography 
                    variant="body2" 
                    component="span" 
                    fontWeight="semibold" 
                    sx={{ 
                      color: baseColors.brandPrimary,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {key}:
                  </Typography>{' '}
                  <Typography 
                    variant="body2" 
                    component="span" 
                    sx={{ 
                      color: baseColors.grayDark,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      display: 'inline',
                    }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header Section with Tabs - Similar to ProblemReport */}
      <div className="mb-3 border-b border-gray-200 pb-2 pl-4">
        <div className="flex gap-8 mb-3">
          {/* Active Fixes Tab */}
          <div
            className="cursor-pointer transition-all duration-200"
            style={{
              color: activeTab === 'active' ? '#1f2937' : '#656D7D',
            }}
            onClick={() => setActiveTab('active')}
          >
            <h3 className="text-base font-medium">Active Fixes</h3>
            <p className="text-lg font-semibold mt-1">
              {activeFixes.length}
            </p>
          </div>

          {/* Deleted Fixes Tab */}
          <div
            className="cursor-pointer transition-all duration-200"
            style={{
              color: activeTab === 'deleted' ? '#1f2937' : '#656D7D',
            }}
            onClick={() => setActiveTab('deleted')}
          >
            <h3 className="text-base font-medium">Deleted Fixes</h3>
            <p className="text-lg font-semibold mt-1">
              {allDeletedFixes.length}
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
        aria-label={`Auto-fixes list with ${activeTab === 'active' ? activeFixes.length : allDeletedFixes.length} ${activeTab === 'active' ? 'active' : 'deleted'} fixes. Use arrow keys to scroll.`}
      >
        <div className="space-y-3 sm:space-y-4">
          {/* Content */}
          {activeTab === 'active' && (
            <>
              {activeFixes.length === 0 ? (
              <div className="text-center py-12">
                {selectedIssueTypes.size === 0 ? (
                  <>
                    <div className="mx-auto mb-6">
                      <img
                        src={notFoundImage}
                        alt=""
                        role="presentation"
                        className="mx-auto h-32 w-auto"
                      />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No auto fixes found for your site
                    </h3>
                    <p className="text-sm" style={{ color: '#676D7B' }}>
                      Your website appears to be well-optimized for accessibility.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-6">
                      <img
                        src={notFoundImage}
                        alt=""
                        role="presentation"
                        className="mx-auto h-32 w-auto"
                      />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No fixes match the selected filters
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Try selecting different issue types or clear filters
                    </p>
                    <button
                      onClick={() => setSelectedIssueTypes(new Set())}
                      className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:shadow-md text-white"
                      style={{ backgroundColor: '#0052CC' }}
                    >
                      Clear Filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div>
                {/* Summary by Type */}
                {Object.keys(summary.by_type).length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <h3 className="text-base font-medium text-gray-900">
                        Issues by Type:
                      </h3>
                      {selectedIssueTypes.size > 0 && (
                        <button
                          onClick={() => setSelectedIssueTypes(new Set())}
                          className="text-xs px-2 py-1 rounded transition-all duration-200 hover:bg-gray-100"
                          style={{
                            color: '#0052CC',
                            border: '1px solid #0052CC',
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(summary.by_type).map(([type, count]) => {
                        const isSelected = selectedIssueTypes.has(type);
                        const displayCount = count;
                        
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              const newSet = new Set(selectedIssueTypes);
                              if (isSelected) {
                                newSet.delete(type);
                              } else {
                                newSet.add(type);
                              }
                              setSelectedIssueTypes(newSet);
                            }}
                            className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-[#0052CC] text-white'
                                : 'bg-white border border-[#A2ADF3] text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}: {displayCount}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Auto-fixes List */}
                {activeFixes.length > 0 && (
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-3">
                      Recommended Fixes:
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {activeFixes.map((fix, index) => renderFixCard(fix, index))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
          )}

          {activeTab === 'deleted' && (
          <>
            {allDeletedFixes.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: baseColors.grayLight }}
                >
                  <Trash2 size={24} className="sm:w-8 sm:h-8" style={{ color: baseColors.grayMedium }} />
                </div>
                <Typography variant="h6" fontWeight="medium" sx={{ color: baseColors.grayDark, mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  No deleted fixes
                </Typography>
                <Typography variant="body2" sx={{ color: baseColors.grayMedium, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  You haven't deleted any fixes yet.
                </Typography>
              </div>
            ) : (
              <div>
                {/* Summary by Type for Deleted Fixes */}
                {Object.keys(deletedFixesSummary).length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <h3 className="text-base font-medium text-gray-900">
                        Issues by Type:
                      </h3>
                      {selectedIssueTypes.size > 0 && (
                        <button
                          onClick={() => setSelectedIssueTypes(new Set())}
                          className="text-xs px-2 py-1 rounded transition-all duration-200 hover:bg-gray-100"
                          style={{
                            color: '#0052CC',
                            border: '1px solid #0052CC',
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(deletedFixesSummary).map(([type, count]) => {
                        const isSelected = selectedIssueTypes.has(type);
                        const displayCount = count;
                        
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              const newSet = new Set(selectedIssueTypes);
                              if (isSelected) {
                                newSet.delete(type);
                              } else {
                                newSet.add(type);
                              }
                              setSelectedIssueTypes(newSet);
                            }}
                            className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-[#0052CC] text-white'
                                : 'bg-white border border-[#A2ADF3] text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}: {displayCount}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Deleted Fixes List */}
                {filteredDeletedFixes.length === 0 ? (
                  <div className="text-center py-12">
                    {selectedIssueTypes.size === 0 ? (
                      <>
                        <div className="mx-auto mb-6">
                          <img
                            src={notFoundImage}
                            alt=""
                            role="presentation"
                            className="mx-auto h-32 w-auto"
                          />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No deleted fixes
                        </h3>
                        <p className="text-sm" style={{ color: '#676D7B' }}>
                          You haven't deleted any fixes yet.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto mb-6">
                          <img
                            src={notFoundImage}
                            alt=""
                            role="presentation"
                            className="mx-auto h-32 w-auto"
                          />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No deleted fixes match the selected filters
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Try selecting different issue types or clear filters
                        </p>
                        <button
                          onClick={() => setSelectedIssueTypes(new Set())}
                          className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:shadow-md text-white"
                          style={{ backgroundColor: '#0052CC' }}
                        >
                          Clear Filters
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-3">
                      Deleted Fixes ({filteredDeletedFixes.length}):
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {filteredDeletedFixes.map((fix, index) => renderFixCard(fix, index))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScraperAnalysisDisplay;
