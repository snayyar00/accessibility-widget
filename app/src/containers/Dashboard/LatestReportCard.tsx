import React, { useEffect, useState, useMemo } from 'react';
import { useLazyQuery } from '@apollo/client';
import { useHistory } from 'react-router-dom';
import { baseColors } from '@/config/colors';
import { AlertTriangle, AlertCircle, Info, FileText, ExternalLink, LayoutGrid, FormInput, Brain, Navigation as NavigationIcon } from 'lucide-react';
import FETCH_ACCESSIBILITY_REPORT_KEYS from '@/queries/accessibility/fetchAccessibilityReport';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';

interface LatestReportCardProps {
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

const LatestReportCard: React.FC<LatestReportCardProps> = ({ siteUrl }) => {
  const history = useHistory();
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
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
  const issuesByFunction = report.issuesByFunction || {};
  const functionalityNames = report.functionalityNames || [];
  const totalStats = report.totalStats || {};
  const score = report.score || 0;

  // Filter issues by category
  const filteredIssues = useMemo(() => {
    if (!allIssues.length) return [];

    if (activeCategory === 'all') {
      return allIssues;
    }

    // Filter by functionality (Cognitive, Mobility, etc.)
    if (functionalityNames.includes(activeCategory) && issuesByFunction[activeCategory]) {
      return issuesByFunction[activeCategory] || [];
    }

    // Filter by structure (Content, Navigation, Forms) based on selectors
    return allIssues.filter((issue: { selectors: string[] }) => {
      const selector = issue.selectors?.[0]?.toLowerCase() || '';

      if (activeCategory === 'content') {
        return (
          selector.includes('p') ||
          selector.includes('h') ||
          selector.includes('img') ||
          selector.includes('span')
        );
      }
      if (activeCategory === 'navigation') {
        return (
          selector.includes('a') ||
          selector.includes('nav') ||
          selector.includes('button')
        );
      }
      if (activeCategory === 'forms') {
        return (
          selector.includes('form') ||
          selector.includes('input') ||
          selector.includes('select') ||
          selector.includes('textarea')
        );
      }

      // For Cognitive and Mobility, check functionality
      const issueFunc = (issue as any).functionality?.toLowerCase() || '';
      if (activeCategory.toLowerCase().includes('cognitive')) {
        return issueFunc.includes('cognitive') || issueFunc.includes('brain');
      }
      if (activeCategory.toLowerCase().includes('mobility')) {
        return issueFunc.includes('mobility') || issueFunc.includes('motor') || issueFunc.includes('keyboard');
      }

      return false;
    });
  }, [allIssues, activeCategory, issuesByFunction, functionalityNames]);

  const issues = filteredIssues;

  // Count issues by severity
  const issueCounts = useMemo(() => {
    const counts = {
      critical: 0,
      serious: 0,
      moderate: 0,
      total: allIssues.length,
    };
    issues.forEach((issue: any) => {
      if (issue.impact === 'critical') counts.critical++;
      else if (issue.impact === 'serious') counts.serious++;
      else counts.moderate++;
    });
    return counts;
  }, [issues]);

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
        className="rounded-xl w-full overflow-hidden"
        style={{
          backgroundColor: baseColors.white,
          border: 'none',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          maxWidth: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 20px 40px rgba(51, 67, 173, 0.2), 0 8px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(51, 67, 173, 0.05)',
          transform: 'perspective(1000px) rotateX(0deg) translateZ(0)',
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
        className="rounded-xl w-full overflow-hidden"
        style={{
          backgroundColor: baseColors.white,
          border: 'none',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          maxWidth: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 20px 40px rgba(51, 67, 173, 0.2), 0 8px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(51, 67, 173, 0.05)',
          transform: 'perspective(1000px) rotateX(0deg) translateZ(0)',
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
        className="rounded-xl w-full overflow-hidden"
        style={{
          backgroundColor: baseColors.white,
          border: 'none',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          maxWidth: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 20px 40px rgba(51, 67, 173, 0.2), 0 8px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(51, 67, 173, 0.05)',
          transform: 'perspective(1000px) rotateX(0deg) translateZ(0)',
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
        className="rounded-xl w-full overflow-hidden"
        style={{
          backgroundColor: baseColors.white,
          border: 'none',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          maxWidth: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 20px 40px rgba(51, 67, 173, 0.2), 0 8px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(51, 67, 173, 0.05)',
          transform: 'perspective(1000px) rotateX(0deg) translateZ(0)',
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
      className="rounded-xl w-full overflow-hidden card-3d"
      style={{
        backgroundColor: baseColors.white,
        border: 'none',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 20px 40px rgba(51, 67, 173, 0.2), 0 8px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(51, 67, 173, 0.05)',
        transform: 'perspective(1000px) rotateX(0deg) translateZ(0)',
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
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm w-full md:w-auto button-3d"
          style={{
            backgroundColor: '#3343ad',
            color: baseColors.white,
            boxShadow: '0 4px 12px rgba(51, 67, 173, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
            transform: 'perspective(1000px) translateZ(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(8px) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(51, 67, 173, 0.4), 0 4px 8px rgba(0, 0, 0, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(0) translateY(0px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(51, 67, 173, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(-4px) translateY(1px)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(51, 67, 173, 0.25), 0 1px 2px rgba(0, 0, 0, 0.15)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(8px) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(51, 67, 173, 0.4), 0 4px 8px rgba(0, 0, 0, 0.25)';
          }}
        >
          <span>View Full Report</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Score and Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
        {/* Score Card */}
        <div
          className="rounded-lg p-4 stat-card-3d"
          style={{
            backgroundColor: baseColors.white,
            border: 'none',
            boxShadow: '0 8px 20px rgba(51, 67, 173, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
            transform: 'perspective(1000px) translateZ(0) rotateY(0deg)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(30px) translateY(-10px) rotateY(5deg)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(51, 67, 173, 0.25), 0 10px 20px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(0) translateY(0px) rotateY(0deg)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(51, 67, 173, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: baseColors.grayMuted }}>
              Accessibility Score
            </span>
            <FileText className="w-5 h-5" style={{ color: baseColors.brandPrimary }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: baseColors.grayText }}>
            {typeof score === 'number' ? Math.round(score) : score}
          </p>
        </div>

        {/* Critical Issues */}
        <div
          className="rounded-lg p-4 stat-card-3d"
          style={{
            backgroundColor: '#FEF3F2',
            border: 'none',
            boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)',
            transform: 'perspective(1000px) translateZ(0) rotateY(0deg)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(30px) translateY(-10px) rotateY(-5deg)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(239, 68, 68, 0.3), 0 10px 20px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(0) translateY(0px) rotateY(0deg)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#991B1B' }}>
              Critical Issues
            </span>
            <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>
            {issueCounts.critical}
          </p>
        </div>

        {/* Moderate Issues */}
        <div
          className="rounded-lg p-4 stat-card-3d"
          style={{
            backgroundColor: baseColors.blueLight,
            border: 'none',
            boxShadow: '0 8px 20px rgba(51, 67, 173, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
            transform: 'perspective(1000px) translateZ(0) rotateY(0deg)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(30px) translateY(-10px) rotateY(5deg)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(51, 67, 173, 0.25), 0 10px 20px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(0) translateY(0px) rotateY(0deg)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(51, 67, 173, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: baseColors.blueInfo }}>
              Moderate Issues
            </span>
            <AlertCircle className="w-5 h-5" style={{ color: baseColors.blueInfo }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: baseColors.blueInfo }}>
            {issueCounts.moderate}
          </p>
        </div>

        {/* Total Issues */}
        <div
          className="rounded-lg p-4 stat-card-3d"
          style={{
            backgroundColor: baseColors.white,
            border: 'none',
            boxShadow: '0 8px 20px rgba(51, 67, 173, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
            transform: 'perspective(1000px) translateZ(0) rotateY(0deg)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(30px) translateY(-10px) rotateY(-5deg)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(51, 67, 173, 0.25), 0 10px 20px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'perspective(1000px) translateZ(0) translateY(0px) rotateY(0deg)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(51, 67, 173, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: baseColors.grayMuted }}>
              Total Issues
            </span>
            <Info className="w-5 h-5" style={{ color: baseColors.grayMuted }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: baseColors.grayText }}>
            {issueCounts.total}
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      {allIssues.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium flex items-center gap-1.5 tab-3d ${
                activeCategory === 'all'
                  ? 'border-b-2'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                color: activeCategory === 'all' ? '#3343ad' : baseColors.grayMuted,
                borderBottomColor: activeCategory === 'all' ? '#3343ad' : 'transparent',
                transform: activeCategory === 'all' ? 'translateY(-2px)' : 'translateY(0px)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== 'all') {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== 'all') {
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              <LayoutGrid className="w-4 h-4" />
              All
            </button>
            <button
              onClick={() => setActiveCategory('content')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium flex items-center gap-1.5 tab-3d ${
                activeCategory === 'content'
                  ? 'border-b-2'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                color: activeCategory === 'content' ? '#3343ad' : baseColors.grayMuted,
                borderBottomColor: activeCategory === 'content' ? '#3343ad' : 'transparent',
                transform: activeCategory === 'content' ? 'translateY(-2px)' : 'translateY(0px)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== 'content') {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== 'content') {
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              <FileText className="w-4 h-4" />
              Content
            </button>
            <button
              onClick={() => setActiveCategory('navigation')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium flex items-center gap-1.5 tab-3d ${
                activeCategory === 'navigation'
                  ? 'border-b-2'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                color: activeCategory === 'navigation' ? '#3343ad' : baseColors.grayMuted,
                borderBottomColor: activeCategory === 'navigation' ? '#3343ad' : 'transparent',
                transform: activeCategory === 'navigation' ? 'translateY(-2px)' : 'translateY(0px)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== 'navigation') {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== 'navigation') {
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              <NavigationIcon className="w-4 h-4" />
              Navigation
            </button>
            <button
              onClick={() => setActiveCategory('forms')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium flex items-center gap-1.5 tab-3d ${
                activeCategory === 'forms'
                  ? 'border-b-2'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                color: activeCategory === 'forms' ? '#3343ad' : baseColors.grayMuted,
                borderBottomColor: activeCategory === 'forms' ? '#3343ad' : 'transparent',
                transform: activeCategory === 'forms' ? 'translateY(-2px)' : 'translateY(0px)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== 'forms') {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== 'forms') {
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              <FormInput className="w-4 h-4" />
              Forms
            </button>
            {functionalityNames.map((funcName: string) => {
              const normalizedName = funcName.toLowerCase();
              const isCognitive = normalizedName.includes('cognitive') || normalizedName.includes('brain');
              const isMobility = normalizedName.includes('mobility') || normalizedName.includes('motor') || normalizedName.includes('keyboard');
              
              if (!isCognitive && !isMobility) return null;

              return (
                <button
                  key={funcName}
                  onClick={() => setActiveCategory(funcName)}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium flex items-center gap-1.5 tab-3d ${
                    activeCategory === funcName
                      ? 'border-b-2'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={{
                    color: activeCategory === funcName ? '#3343ad' : baseColors.grayMuted,
                    borderBottomColor: activeCategory === funcName ? '#3343ad' : 'transparent',
                    transform: activeCategory === funcName ? 'translateY(-2px)' : 'translateY(0px)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (activeCategory !== funcName) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeCategory !== funcName) {
                      e.currentTarget.style.transform = 'translateY(0px)';
                    }
                  }}
                >
                  {isCognitive ? <Brain className="w-4 h-4" /> : <NavigationIcon className="w-4 h-4" />}
                  {funcName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Errors List */}
      {issues.length > 0 && (
        <div>
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
            style={{ color: baseColors.grayText }}
          >
            {activeCategory === 'all' ? 'Recent Issues' : `${activeCategory} Issues`}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto px-2 sm:px-4">
            {issues.slice(0, 10).map((issue: any, index: number) => (
              <div
                key={index}
                className="rounded-lg p-3 sm:p-4 issue-card-3d mx-auto"
                style={{
                  backgroundColor: baseColors.white,
                  border: 'none',
                  boxShadow: '0 6px 16px rgba(51, 67, 173, 0.12), 0 2px 6px rgba(0, 0, 0, 0.1)',
                  transform: 'perspective(1000px) translateZ(0) rotateX(0deg)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  maxWidth: '95%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'perspective(1000px) translateZ(25px) translateY(-8px) rotateX(4deg)';
                  e.currentTarget.style.boxShadow = '0 16px 32px rgba(51, 67, 173, 0.22), 0 8px 16px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'perspective(1000px) translateZ(0) translateY(0px) rotateX(0deg)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(51, 67, 173, 0.12), 0 2px 6px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {issue.impact === 'critical' ? (
                      <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                    ) : issue.impact === 'serious' ? (
                      <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
                    ) : (
                      <Info className="w-5 h-5" style={{ color: baseColors.grayMuted }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-sm sm:text-base font-semibold mb-1 break-words"
                      style={{ color: baseColors.grayText }}
                    >
                      {issue.message || issue.help || 'Accessibility Issue'}
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {issue.impact && (
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-md"
                          style={{
                            backgroundColor:
                              issue.impact === 'critical'
                                ? '#FEE2E2'
                                : issue.impact === 'serious'
                                ? '#FEF3C7'
                                : '#DBEAFE',
                            color:
                              issue.impact === 'critical'
                                ? '#991B1B'
                                : issue.impact === 'serious'
                                ? '#92400E'
                                : '#1E40AF',
                          }}
                        >
                          {issue.impact.charAt(0).toUpperCase() + issue.impact.slice(1)}
                        </span>
                      )}
                      {issue.wcag_code && (
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-md"
                          style={{
                            backgroundColor: baseColors.blueLight,
                            color: baseColors.blueInfo,
                          }}
                        >
                          WCAG: {issue.wcag_code}
                        </span>
                      )}
                      {issue.source && (
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-md"
                          style={{
                            backgroundColor: baseColors.grayLight,
                            color: baseColors.grayMuted,
                          }}
                        >
                          {issue.source}
                        </span>
                      )}
                    </div>
                    {issue.description && (
                      <p
                        className="text-xs sm:text-sm break-words"
                        style={{ color: baseColors.grayMuted }}
                      >
                        {issue.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {allIssues.length > 10 && (
            <button
              onClick={handleViewFullReport}
              className="mt-4 w-full text-center px-4 py-2 rounded-lg font-medium text-sm button-3d"
              style={{
                backgroundColor: '#3343ad',
                color: baseColors.white,
                boxShadow: '0 4px 12px rgba(51, 67, 173, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                transform: 'perspective(1000px) translateZ(0)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) translateZ(8px) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(51, 67, 173, 0.4), 0 4px 8px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) translateZ(0) translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(51, 67, 173, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) translateZ(-4px) translateY(1px)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(51, 67, 173, 0.25), 0 1px 2px rgba(0, 0, 0, 0.15)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) translateZ(8px) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(51, 67, 173, 0.4), 0 4px 8px rgba(0, 0, 0, 0.25)';
              }}
            >
              View All {allIssues.length} Issues
            </button>
          )}
        </div>
      )}

      {issues.length === 0 && allIssues.length === 0 && (
        <div className="text-center py-8">
          <Info className="w-12 h-12 mx-auto mb-4" style={{ color: baseColors.grayMuted }} />
          <p style={{ color: baseColors.grayMuted }}>
            No accessibility issues found in this report.
          </p>
        </div>
      )}

      {issues.length === 0 && allIssues.length > 0 && (
        <div className="text-center py-8">
          <Info className="w-12 h-12 mx-auto mb-4" style={{ color: baseColors.grayMuted }} />
          <p style={{ color: baseColors.grayMuted }}>
            No issues found in {activeCategory === 'all' ? 'this category' : activeCategory}.
          </p>
        </div>
      )}
    </div>
  );
};

export default LatestReportCard;

