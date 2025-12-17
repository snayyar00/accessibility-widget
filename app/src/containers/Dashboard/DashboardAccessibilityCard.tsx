import React, { useEffect, useState, useMemo } from 'react';
import { useLazyQuery } from '@apollo/client';
import { useHistory } from 'react-router-dom';
import { baseColors } from '@/config/colors';
import { AlertTriangle, AlertCircle, Info, FileText, ExternalLink, LayoutGrid, FormInput, Brain, Navigation as NavigationIcon, TrendingUp, Layers } from 'lucide-react';
import FETCH_ACCESSIBILITY_REPORT_KEYS from '@/queries/accessibility/fetchAccessibilityReport';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';

interface DashboardAccessibilityCardProps {
  siteUrl?: string;
}

// Helper function to map issue to impact level
function mapIssueToImpact(message: string, code: any) {
  if (!message && !code) return 'moderate';

  const lowerMsg = (message || '').toLowerCase();
  const lowerCode = (code || '').toLowerCase();

  // Critical issues
  if (
    lowerMsg.includes('color contrast') ||
    lowerMsg.includes('minimum contrast') ||
    lowerCode.includes('1.4.3') ||
    (lowerMsg.includes('aria hidden') && lowerMsg.includes('focusable')) ||
    lowerMsg.includes('links must be distinguishable')
  ) {
    return 'critical';
  }

  // Serious issues
  if (
    lowerMsg.includes('missing label') ||
    lowerMsg.includes('missing alt') ||
    lowerMsg.includes('empty button') ||
    lowerMsg.includes('empty link') ||
    lowerMsg.includes('missing name') ||
    lowerCode.includes('4.1.2')
  ) {
    return 'serious';
  }

  return 'moderate';
}

// Extract issues from report structure
function extractIssuesFromReport(report: any) {
  const issues: any[] = [];

  // Check if we have the new data structure with top-level ByFunctions
  if (report?.ByFunctions && Array.isArray(report.ByFunctions)) {
    report.ByFunctions.forEach(
      (funcGroup: { FunctionalityName: any; Errors: any[] }) => {
        if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
          funcGroup.Errors.forEach((error) => {
            const impact = mapIssueToImpact(error.message, error.code);

            issues.push({
              ...error,
              impact,
              source:
                error.__typename === 'htmlCsOutput' ? 'HTML_CS' : 'AXE Core',
              functionality: funcGroup.FunctionalityName,
              screenshotUrl: error.screenshotUrl,
            });
          });
        }
      },
    );
  }

  // Try the axe ByFunction structure
  if (report?.axe?.ByFunction && Array.isArray(report.axe.ByFunction)) {
    report.axe.ByFunction.forEach(
      (funcGroup: { FunctionalityName: any; Errors: any[] }) => {
        if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
          funcGroup.Errors.forEach((error) => {
            const impact = mapIssueToImpact(error.message, error.code);

            issues.push({
              ...error,
              impact,
              source: 'AXE Core',
              functionality: funcGroup.FunctionalityName,
              screenshotUrl: error.screenshotUrl,
            });
          });
        }
      },
    );
  }

  // Try the htmlcs structure
  if (report?.htmlcs?.ByFunction && Array.isArray(report.htmlcs.ByFunction)) {
    report.htmlcs.ByFunction.forEach(
      (funcGroup: { FunctionalityName: any; Errors: any[] }) => {
        if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
          funcGroup.Errors.forEach((error) => {
            const impact = mapIssueToImpact(error.message, error.code);

            issues.push({
              ...error,
              impact,
              source: 'HTML_CS',
              functionality: funcGroup.FunctionalityName,
              screenshotUrl: error.screenshotUrl,
            });
          });
        }
      },
    );
  }

  // Also check direct errors arrays as fallback
  if (issues.length === 0) {
    if (report?.axe?.errors && Array.isArray(report.axe.errors)) {
      report.axe.errors.forEach((error: any) => {
        const impact = mapIssueToImpact(error.message, error.code);

        issues.push({
          ...error,
          impact,
          source: 'AXE Core',
          screenshotUrl: error.screenshotUrl,
        });
      });
    }

    if (report?.htmlcs?.errors && Array.isArray(report.htmlcs.errors)) {
      report.htmlcs.errors.forEach((error: any) => {
        const impact = mapIssueToImpact(error.message, error.code);

        issues.push({
          ...error,
          impact,
          source: 'HTML_CS',
          screenshotUrl: error.screenshotUrl,
        });
      });
    }
  }

  // Fallback to issues array if available
  if (issues.length === 0 && report?.issues && Array.isArray(report.issues)) {
    report.issues.forEach((issue: any) => {
      const impact = mapIssueToImpact(issue.message, issue.code);

      issues.push({
        ...issue,
        impact,
      });
    });
  }

  return issues;
}

const DashboardAccessibilityCard: React.FC<DashboardAccessibilityCardProps> = ({ siteUrl }) => {
  const history = useHistory();
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [fetchReportKeys, { data: reportKeysData, loading: reportKeysLoading }] = useLazyQuery(
    FETCH_ACCESSIBILITY_REPORT_KEYS,
  );
  const [fetchReport, { data: reportData, loading: reportLoading }] = useLazyQuery(
    FETCH_REPORT_BY_R2_KEY,
  );

  // Reset state when siteUrl changes
  useEffect(() => {
    setHasAttemptedFetch(false);
  }, [siteUrl]);

  // Fetch latest report when siteUrl changes
  useEffect(() => {
    if (!siteUrl) return;

    const fetchLatestReport = async () => {
      setHasAttemptedFetch(true);
      try {
        const { data } = await fetchReportKeys({
          variables: { url: siteUrl },
        });

        console.log('Report keys data:', data); // Debug log

        if (data?.fetchAccessibilityReportFromR2?.length > 0) {
          // Get the most recent report (first in the array)
          const latestReport = data.fetchAccessibilityReportFromR2[0];
          const r2Key = latestReport.r2_key;
          
          console.log('Fetching report with r2_key:', r2Key); // Debug log
          
          // Check if r2_key already includes "reports/" prefix
          const formattedKey = r2Key.startsWith('reports/') ? r2Key : `reports/${r2Key}`;
          
          // Fetch the full report
          const reportResult = await fetchReport({
            variables: { r2_key: formattedKey },
          });
          
          console.log('Report data:', reportResult.data); // Debug log
        } else {
          console.log('No report keys found for URL:', siteUrl); // Debug log
        }
      } catch (error) {
        console.error('Error fetching latest report:', error);
        setHasAttemptedFetch(true); // Still mark as attempted even on error
      }
    };

    fetchLatestReport();
  }, [siteUrl, fetchReportKeys, fetchReport]);

  const report = reportData?.fetchReportByR2Key || {};
  const allIssues = useMemo(() => extractIssuesFromReport(report), [report]);
  const totalStats = report.totalStats || {};
  const score = report.score || 0;
  const hasWebAbility = totalStats.hasWebAbility || false;
  const originalScore = totalStats.originalScore || score;
  const WEBABILITY_SCORE_BONUS = 45;
  const MAX_TOTAL_SCORE = 95;
  const enhancedScore = hasWebAbility 
    ? Math.min(originalScore + WEBABILITY_SCORE_BONUS, MAX_TOTAL_SCORE)
    : score;


  // Count issues by severity
  const issueCounts = useMemo(() => {
    const counts = {
      critical: 0,
      serious: 0,
      moderate: 0,
      total: allIssues.length,
    };
    allIssues.forEach((issue: any) => {
      if (issue.impact === 'critical') counts.critical++;
      else if (issue.impact === 'serious') counts.serious++;
      else counts.moderate++;
    });
    return counts;
  }, [allIssues]);

  // Calculate category statistics
  const categoryStats = useMemo(() => {
    const stats: { [key: string]: number } = {
      Content: 0,
      Navigation: 0,
      Forms: 0,
      Cognitive: 0,
      Other: 0,
    };

    allIssues.forEach((issue: any) => {
      const selector = issue.selectors?.[0]?.toLowerCase() || '';
      const issueFunc = (issue as any).functionality?.toLowerCase() || '';

      if (
        selector.includes('p') ||
        selector.includes('h') ||
        selector.includes('img') ||
        selector.includes('span')
      ) {
        stats.Content++;
      } else if (
        selector.includes('a') ||
        selector.includes('nav') ||
        selector.includes('button')
      ) {
        stats.Navigation++;
      } else if (
        selector.includes('form') ||
        selector.includes('input') ||
        selector.includes('select') ||
        selector.includes('textarea')
      ) {
        stats.Forms++;
      } else if (
        issueFunc.includes('cognitive') ||
        issueFunc.includes('brain')
      ) {
        stats.Cognitive++;
      } else {
        stats.Other++;
      }
    });

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(stats)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [allIssues]);


  // Get latest report key for navigation
  const latestReportKey = reportKeysData?.fetchAccessibilityReportFromR2?.[0]?.r2_key;

  const handleViewFullReport = () => {
    if (latestReportKey) {
      history.push(`/${latestReportKey}?domain=${encodeURIComponent(siteUrl || '')}`);
    }
  };

  if (!siteUrl) {
    return null;
  }

  // Show loading state while fetching report keys or report data
  if (reportKeysLoading || reportLoading) {
    return (
      <div
        className="rounded-xl shadow-sm border w-full overflow-hidden"
        style={{
          backgroundColor: baseColors.white,
          borderColor: '#a2adf3',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="text-center py-8">
          <p style={{ color: baseColors.grayMuted }}>Loading report...</p>
        </div>
      </div>
    );
  }

  // Check if we have report keys data - if not, no reports exist
  const hasReportKeys = reportKeysData?.fetchAccessibilityReportFromR2?.length > 0;

  // Show "no report" only if we've attempted fetch, finished loading, and confirmed no keys exist
  if (hasAttemptedFetch && !reportKeysLoading && !hasReportKeys) {
    return (
      <div
        className="rounded-xl shadow-sm border w-full overflow-hidden"
        style={{
          backgroundColor: baseColors.white,
          borderColor: '#a2adf3',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="text-center py-8">
          <Info className="w-12 h-12 mx-auto mb-4" style={{ color: baseColors.grayMuted }} />
          <p style={{ color: baseColors.grayMuted }}>
            No accessibility report available for this site yet.
          </p>
        </div>
      </div>
    );
  }

  // If we have report keys but reportData is still loading or not loaded, show loading
  if (hasReportKeys && !reportData && reportLoading) {
    return (
      <div
        className="rounded-xl shadow-sm border w-full overflow-hidden"
        style={{
          backgroundColor: baseColors.white,
          borderColor: '#a2adf3',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="text-center py-8">
          <p style={{ color: baseColors.grayMuted }}>Loading report data...</p>
        </div>
      </div>
    );
  }

  // If we have keys but no report data after loading, show message
  if (hasReportKeys && !reportData && !reportLoading) {
    return (
      <div
        className="rounded-xl shadow-sm border w-full overflow-hidden"
        style={{
          backgroundColor: baseColors.white,
          borderColor: '#a2adf3',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="text-center py-8">
          <Info className="w-12 h-12 mx-auto mb-4" style={{ color: baseColors.grayMuted }} />
          <p style={{ color: baseColors.grayMuted }}>
            Unable to load report data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl shadow-sm w-full overflow-hidden"
      style={{
        backgroundColor: baseColors.white,
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4 md:mb-6">
        <h2
          className="text-lg sm:text-xl md:text-2xl font-bold"
          style={{ color: baseColors.grayText }}
        >
          Latest Accessibility Report
        </h2>
        <button
          onClick={handleViewFullReport}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 hover:opacity-90 w-full md:w-auto"
          style={{
            backgroundColor: '#445ae7',
            color: baseColors.white,
          }}
        >
          <span>View Full Report</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Score Breakdown and Issues by Category */}
      <div className={`grid gap-6 mb-4 sm:mb-6 ${categoryStats.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Score Breakdown */}
        <div
          className="rounded-xl p-4 relative transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
          style={{
            backgroundColor: baseColors.white,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            transformStyle: 'preserve-3d',
            perspective: '1000px',
          }}
        >
          {hasWebAbility && (
            <div 
              className="absolute top-2 right-2 text-white px-3 py-1 text-xs font-medium rounded-full"
              style={{ backgroundColor: '#445ae7' }}
            >
              Enhanced
            </div>
          )}
          <h3
            className="text-sm font-semibold mb-4 uppercase tracking-wide"
            style={{ color: baseColors.grayText }}
          >
            Accessibility Score
          </h3>
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-4xl font-bold" style={{ color: baseColors.grayText }}>
                {Math.round(enhancedScore)}%
              </p>
              {hasWebAbility && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                  <span className="text-lg font-semibold" style={{ color: '#10B981' }}>
                    +{Math.round(enhancedScore - originalScore)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Progress Bar */}
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ 
                width: `${enhancedScore}%`,
                backgroundColor: '#445ae7'
              }}
            />
          </div>

          {/* Summary text */}
          {hasWebAbility && (
            <p className="text-xs" style={{ color: baseColors.grayMuted }}>
              Web Ability Enhancement Applied • Total Issues: {issueCounts.total} • Critical: {issueCounts.critical} • Moderate: {issueCounts.moderate}
            </p>
          )}
          {!hasWebAbility && (
            <p className="text-xs" style={{ color: baseColors.grayMuted }}>
              Total Issues: {issueCounts.total} • Critical: {issueCounts.critical} • Moderate: {issueCounts.moderate}
            </p>
          )}
        </div>

        {/* Issues by Category - Only show when there are issues */}
        {categoryStats.length > 0 && (
          <div
            className="rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
            style={{
              backgroundColor: baseColors.white,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              transformStyle: 'preserve-3d',
              perspective: '1000px',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5" style={{ color: baseColors.grayText }} />
              <h3
                className="text-base font-semibold"
                style={{ color: baseColors.grayText }}
              >
                Issues by Category
              </h3>
            </div>
            <p className="text-xs mb-4" style={{ color: baseColors.grayMuted }}>
              Distribution across WCAG categories
            </p>
            <div className="space-y-4">
              {categoryStats.map((category, index) => {
                // Different shades of #445ae7
                const colors = [
                  '#445ae7', // Base color for Content
                  '#5a6ef0', // Lighter shade for Cognitive
                  '#7074f9', // Even lighter for Navigation
                  '#868af2', // Lighter for Forms
                  '#9ca0eb', // Lightest for Other
                ];
                const color = colors[index % colors.length];

                return (
                  <div key={category.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: baseColors.grayText }}>
                        {category.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: baseColors.grayMuted }}>
                          {category.count} {category.count === 1 ? 'issue' : 'issues'}
                        </span>
                        <span className="text-sm font-medium" style={{ color: baseColors.grayText }}>
                          {category.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${category.percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default DashboardAccessibilityCard;

