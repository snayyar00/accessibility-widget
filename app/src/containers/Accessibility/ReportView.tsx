import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useLocation, useHistory } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLazyQuery, useQuery } from '@apollo/client';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';
import {
  translateText,
  translateMultipleTexts,
  deduplicateIssuesByMessage,
  LANGUAGES,
} from '@/utils/translator';

import {
  AlertTriangle,
  AlertCircle,
  Info,
  FileText,
  FormInput,
  ImageIcon,
  Code,
  Sparkles,
  CheckCircle,
  Layers,
  Eye,
  Navigation as NavigationIcon,
  LayoutGrid,
  Brain,
  MessageSquare,
  HelpCircle,
  Droplet,
  Keyboard,
  Loader2,
  Check,
  Shield,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReactI18NextChild } from 'react-i18next';
import { toast } from 'sonner';
import TechStack from './TechStack';
import { CircularProgress } from '@mui/material';
import getProfileQuery from '@/queries/auth/getProfile';
import getWidgetSettings from '@/utils/getWidgetSettings';

// Add this array near the top of the file
const accessibilityFacts = [
  'Over 60% of accessibility issues are related to poor color contrast',
  'Screen readers cannot interpret images without alt text',
  '1 in 4 adults in the US has some type of disability that may impact website usage',
  'Keyboard navigation is essential for people with motor disabilities',
  'WCAG 2.1 has 78 success criteria across three conformance levels',
  'Accessible websites typically rank higher in search engine results',
  'The ADA applies to websites even though it was written before the internet was widely used',
  'Video captions benefit people learning a new language, not just those with hearing impairments',
  'Voice recognition software users need clickable elements large enough to target accurately',
  'Headings help screen reader users understand the structure of your content',
  'Accessibility overlaps with mobile-friendly design - both require thoughtful structure',
  'Accessible forms should have clearly associated labels for each input field',
  'In 2023, over 4,000 website accessibility lawsuits were filed in the US alone',
  'Semantic HTML elements like <nav> and <button> provide built-in accessibility features',
  'People with cognitive disabilities benefit from clear, simple language and consistent design',
  "ARIA attributes can enhance accessibility but aren't a substitute for native HTML elements",
  'Automatic media playback can interfere with screen readers and assistive technologies',
  'Providing a visible focus indicator helps keyboard users navigate your site',
  'Proper color contrast benefits people with color blindness and those using devices in bright sunlight',
  'Accessibility is a continuous process, not a one-time fix',
  'The global market of people with disabilities has over $13 trillion in disposable income',
  'Accessible websites often have up to 30% better usability for all users',
  'WebAbility offers solutions that address over 90% of common WCAG violations',
];

type ReportParams = {
  r2_key: string;
};

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  color: string;
  hasScoreBonus?: boolean;
  originalScore?: number;
};

type ComplianceStatusProps = {
  score: number;
  results: any;
};

type OrganizationTabsProps = {
  active: string;
  onChange: (tab: string) => void;
};

type StructureTabsProps = {
  active: string;
  onChange: (tab: string) => void;
};

type FunctionTabsProps = {
  active: string;
  onChange: (tab: string) => void;
  functionalityNames: string[];
};

type IssuesSummaryProps = {
  filteredIssues: any[];
  activeTab: string;
  organization: string;
  onFilterChange: (filter: string) => void;
  activeFilter: string;
};

type WidgetInfo = {
  result: string;
  details?: string;
};

const WEBABILITY_SCORE_BONUS = 45;
const MAX_TOTAL_SCORE = 95;

// Add this helper function
function calculateEnhancedScore(baseScore: number) {
  const enhancedScore = baseScore;
  return Math.min(enhancedScore, MAX_TOTAL_SCORE);
}

const queryParams = new URLSearchParams(location.search);
const fullUrl = queryParams.get('domain') || '';

// const cleanUrl = fullUrl.trim().replace(/^(https?:\/\/)?(www\.)?/, '');
// const urlParam = `https://${cleanUrl}`;

// Add this helper function near the top (outside the component)
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to fetch image for PDF:', url, e);
    return null;
  }
}

// Add this helper function to get image dimensions from base64
function getImageDimensions(
  base64Data: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      // Fallback dimensions if image fails to load
      resolve({ width: 120, height: 80 });
    };
    img.src = base64Data;
  });
}

const ReportView: React.FC = () => {
  const { r2_key } = useParams<ReportParams>();
  const location = useLocation();
  const history = useHistory();
  const adjustedKey = `reports/${r2_key}`;
  const [fetchReport, { data, loading, error }] = useLazyQuery(
    FETCH_REPORT_BY_R2_KEY,
  );

  const [activeTab, setActiveTab] = useState('all');
  const [organization, setOrganization] = useState('structure');
  const [issueFilter, setIssueFilter] = useState(ISSUE_FILTERS.ALL);
  const [widgetInfo, setWidgetInfo] = useState<WidgetInfo | null>(null);
  const [webabilityenabled, setwebabilityenabled] = useState(false);
  const {
    data: userInfo,
    error: getProfileError,
    loading: getProfileLoading,
  } = useQuery(getProfileQuery);

  // Processing state management
  const [isProcessing, setIsProcessing] = useState(true);
  // Fact rotation state
  const [factIndex, setFactIndex] = useState(0);

  // Always call hooks at the top
  useEffect(() => {
    if (r2_key) {
      fetchReport({ variables: { r2_key: adjustedKey } })
        .then(({ data }) => {
          const report = data.fetchReportByR2Key;
          if (report) {
            // Check the scriptCheckResult and update webabilityenabled
            if (report.scriptCheckResult === 'Web Ability') {
              setwebabilityenabled(true);
              // setRefreshKey((prev) => prev + 1); // Trigger re-render
            } else {
              setwebabilityenabled(false);
            }

            // Handle other widget detection if needed
            if (report.scriptCheckResult !== 'false') {
              // setOtherWidgetEnabled(true);
              // setbuttoncontrol(true);
            }
          } else {
            console.warn('No report data found.');
          }
        })
        .catch((error) => {
          console.error('Error fetching report:', error);
        })
        .finally(() => {
          setIsProcessing(false); // Stop processing once the check is done
        });
    }
  }, [r2_key]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!getProfileLoading) {
      if (getProfileError || !userInfo?.profileUser) {
        history.push('/auth/signin'); // Redirect to sign-in page
      }
    }
  }, [getProfileLoading, getProfileError, userInfo, history]);

  const handleBackToDashboard = () => {
    history.push('/dashboard'); // Navigate to the dashboard route
  };

  const report = data?.fetchReportByR2Key || {};
  //console.log("Report data:", report);

  const issues = report.issues || [];
  const totalStats = report.totalStats || {};
  const issuesByFunction = report.issuesByFunction || {};
  const functionalityNames = report.functionalityNames || [];

  // Update the filtered issues logic to include severity filtering
  const filteredIssues = useMemo(() => {
    if (!issues.length) return [];

    let filtered = [];

    // First filter by organization/tab
    if (organization === 'function') {
      filtered =
        activeTab === 'all' ? issues : issuesByFunction[activeTab] || [];
    } else {
      // Filter by structure (content, navigation, forms)
      if (activeTab === 'all') {
        filtered = issues;
      } else {
        filtered = issues.filter((issue: { selectors: string[] }) => {
          const selector = issue.selectors?.[0]?.toLowerCase() || '';

          if (activeTab === 'content') {
            return (
              selector.includes('p') ||
              selector.includes('h') ||
              selector.includes('img') ||
              selector.includes('span')
            );
          }
          if (activeTab === 'navigation') {
            return (
              selector.includes('a') ||
              selector.includes('nav') ||
              selector.includes('button')
            );
          }
          if (activeTab === 'forms') {
            return (
              selector.includes('form') ||
              selector.includes('input') ||
              selector.includes('select') ||
              selector.includes('textarea')
            );
          }
          return false;
        });
      }
    }

    // Then filter by severity if not showing all
    if (issueFilter !== ISSUE_FILTERS.ALL) {
      filtered = filtered.filter(
        (issue: { impact: string }) => issue.impact === issueFilter,
      );
    }

    return filtered;
  }, [issues, activeTab, organization, issuesByFunction, issueFilter]);

  // Reset activeTab when changing organization
  useEffect(() => {
    setActiveTab('all');
  }, [organization]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prevIndex) => (prevIndex + 1) % accessibilityFacts.length);
    }, 6000); // Change fact every 5 seconds

    return () => clearInterval(interval); // Cleanup the interval on component unmount
  }, []);

  // Conditional rendering in the return statement
  if (loading || isProcessing || getProfileLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="relative w-full h-full aspect-video overflow-hidden bg-gray-900">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-blue-950/50">
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  {/* Status text ABOVE the loader */}
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {loading ? 'Scanning website...' : 'Processing results...'}
                  </h3>

                  {/* Loader in the middle */}
                  <CircularProgress
                    size={36}
                    sx={{ color: 'blue-400' }}
                    className="mb-6 mx-auto my-auto"
                  />

                  {/* Facts below */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        key={factIndex} // Use factIndex as the key to trigger re-render
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="text-center"
                      >
                        <p className="text-xl text-blue-100 max-w-2xl">
                          {accessibilityFacts[factIndex]}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <p>Error loading report: {error.message}</p>;
  }

  if (!data || !data.fetchReportByR2Key) {
    return <p>No report data available.</p>;
  }

  return (
    <div className="bg-report-blue text-foreground min-h-screen pt-20 pb-20 px-4 sm:px-8 md:px-16 lg:pr-28 lg:pl-28">
      <div className="absolute top-4 left-4 sm:left-8 lg:left-10 z-20">
        <button
          onClick={handleBackToDashboard}
          className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm sm:text-base"
        >
          Back to Dashboard
        </button>
      </div>

      <header className="text-center relative z-10 mb-10 sm:mb-14 lg:mb-16 px-2 sm:px-0">
        <h1 className="mb-4">
          <span className="block text-2xl sm:text-4xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight break-words">
            Free
            <br />
            Website{' '}
            <span className="bg-gradient-to-r from-blue-300 to-blue-100 text-transparent bg-clip-text">
              Accessibility
            </span>
            <br />
            Checker
          </span>
          <span className="text-base sm:text-xl font-medium text-blue-300/90 tracking-wide block mt-2">
            WCAG, AODA & ADA Compliance Tool
          </span>
        </h1>

        <p className="text-base sm:text-lg text-blue-100/80 max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed">
          Instantly analyze your website for accessibility compliance.
          <span className="hidden sm:inline">
            <br />
          </span>
          Get a detailed report on WCAG 2.1 violations and actionable steps to
          protect your business.
        </p>
        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 lg:gap-8 mb-2 sm:mb-0">
          <div className="flex items-center gap-2 text-blue-200 bg-white/5 px-3 py-1.5 rounded-full text-xs sm:text-sm">
            <Check className="w-5 h-5 text-green-400" />
            <span className="font-medium text-blue-100">
              WCAG 2.1 AA Compliant
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-200 bg-white/5 px-3 py-1.5 rounded-full text-xs sm:text-sm">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="font-medium text-blue-100">ADA & Section 508</span>
          </div>
          <div className="flex items-center gap-2 text-blue-200 bg-white/5 px-3 py-1.5 rounded-full text-xs sm:text-sm">
            <FileText className="w-5 h-5 text-green-400" />
            <span className="font-medium text-blue-100">Detailed Reports</span>
          </div>
        </div>
        <h1 className="mb-2">
          <span className="block text-base sm:text-3xl lg:text-4xl font-medium text-white leading-tight tracking-tight break-words">
            <br />
            Scan results for{' '}
            <span className="bg-gradient-to-r from-blue-300 to-blue-100 font-medium text-transparent bg-clip-text">
              {fullUrl}
            </span>
            <br />
          </span>
        </h1>
      </header>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ScanningPreview siteImg={report.siteImg} />
            <ComplianceStatus score={totalStats.score} results={report} />
            <TechStack techStack={report.techStack} />
          </div>
          <div className="lg:col-span-4 grid grid-cols-1 gap-4">
            <StatCard
              title="Accessibility Score"
              value={totalStats.score}
              icon={<HelpCircle className="w-5 h-5" />}
              color="blue"
              hasScoreBonus={totalStats.hasWebAbility}
              originalScore={totalStats.originalScore}
            />
            <StatCard
              title="Issues"
              value={(
                totalStats.criticalIssues + totalStats.warnings
              ).toString()}
              description={`${totalStats.criticalIssues} critical, ${totalStats.warnings} warnings`}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="red"
            />
            <StatCard
              title="Moderate Issues"
              value={totalStats.moderateIssues.toString()}
              icon={<Info className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title="Elements Scanned"
              value={totalStats.totalElements.toString()}
              icon={<Layers className="w-5 h-5" />}
              color="blue"
            />
          </div>
        </div>

        {/* Rest of your existing JSX */}
        <div className="space-y-0">
          <OrganizationTabs active={organization} onChange={setOrganization} />

          {organization === 'structure' ? (
            <StructureTabs active={activeTab} onChange={setActiveTab} />
          ) : (
            <FunctionTabs
              active={activeTab}
              onChange={setActiveTab}
              functionalityNames={functionalityNames}
            />
          )}
        </div>

        <div className="space-y-4">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg sm:text-xl font-medium text-gray-700">
                No issues found!
              </h3>
              <p className="text-gray-500 mt-2">
                {issueFilter !== ISSUE_FILTERS.ALL
                  ? `No ${issueFilter} issues found.`
                  : 'No accessibility issues detected for this category.'}
              </p>
            </div>
          ) : (
            <>
              <IssuesSummary
                filteredIssues={filteredIssues} // Pass all issues for accurate counts
                activeTab={activeTab}
                organization={organization}
                onFilterChange={setIssueFilter}
                activeFilter={issueFilter}
              />

              {/* Only one issue card per row, always, and responsive width */}
              <div className="w-full max-w-xl lg:max-w-full mx-auto flex flex-col gap-4">
                {filteredIssues.map(
                  (
                    issue: {
                      message: any;
                      help: any;
                      context: string | any[];
                      code:
                        | boolean
                        | React.ReactChild
                        | React.ReactFragment
                        | React.ReactPortal
                        | Iterable<ReactI18NextChild>
                        | null
                        | undefined;
                      impact: string;
                      category:
                        | boolean
                        | React.ReactChild
                        | React.ReactFragment
                        | React.ReactPortal
                        | Iterable<ReactI18NextChild>
                        | null
                        | undefined;
                      source:
                        | boolean
                        | React.ReactChild
                        | React.ReactFragment
                        | React.ReactPortal
                        | Iterable<ReactI18NextChild>
                        | null
                        | undefined;
                      description: any;
                      selectors: string | any[];
                      recommended_action:
                        | boolean
                        | React.ReactChild
                        | React.ReactFragment
                        | React.ReactPortal
                        | Iterable<ReactI18NextChild>
                        | null
                        | undefined;
                      wcag_code?: string;
                      screenshotUrl?: string;
                    },
                    index: React.Key | null | undefined,
                  ) => (
                    <div
                      key={index}
                      className="border rounded-lg bg-white p-4 sm:p-5 shadow-sm flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 flex-1 pr-2 sm:pr-4 overflow-hidden">
                          {getIssueTypeIcon(issue)}
                          <h2 className="text-base sm:text-lg font-semibold truncate">
                            {issue.message ||
                              issue.help ||
                              'Accessibility Issue'}
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-md ${
                            issue.impact === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : issue.impact === 'serious'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {issue.impact === 'critical'
                            ? 'Critical'
                            : issue.impact === 'serious'
                            ? 'Serious'
                            : 'Moderate'}
                        </span>

                        {issue.category && (
                          <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                            {issue.category}
                          </span>
                        )}

                        {issue.source && (
                          <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                            {issue.source}
                          </span>
                        )}

                        {issue.code && (
                          <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                            {issue.code}
                          </span>
                        )}

                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xs sm:text-sm font-semibold mb-2">
                            Description
                          </h3>
                          <p className="text-gray-600 text-xs sm:text-base">
                            {issue.description || 'No description available'}
                          </p>
                        </div>

                        {issue.context && issue.context.length > 0 && (
                          <div>
                            <h3 className="text-xs sm:text-sm font-semibold mb-2">
                              Affected Element
                            </h3>
                            <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs overflow-x-auto border border-gray-element">
                              {issue.context[0]}
                            </pre>
                          </div>
                        )}

                        {issue.selectors && issue.selectors.length > 0 && (
                          <div>
                            <h3 className="text-xs sm:text-sm font-semibold mb-2">
                              CSS Selector
                            </h3>
                            <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs overflow-x-auto border border-gray-element">
                              {issue.selectors[0]}
                            </pre>
                          </div>
                        )}

                        {issue.recommended_action && (
                          <div>
                            <h3 className="text-xs sm:text-sm font-semibold mb-2">
                              Suggested Fix
                            </h3>
                            <p className="text-gray-600 text-xs sm:text-base">
                              {issue.recommended_action}
                            </p>
                          </div>
                        )}
                      </div>

                      {issue.screenshotUrl && (
                        <div className="my-6 sm:my-8 flex flex-col items-center">
                          <button
                            type="button"
                            className="flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 border-2 border-blue-500 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 group"
                            aria-label="View screenshot evidence"
                            onClick={() =>
                              window.open(
                                issue.screenshotUrl,
                                '_blank',
                                'noopener,noreferrer',
                              )
                            }
                            tabIndex={0}
                            title="Click to view screenshot evidence"
                          >
                            <span className="flex items-center justify-center bg-white rounded-full p-2 shadow group-hover:scale-110 transition-transform">
                              <Eye className="w-6 h-6 text-blue-600 group-hover:text-blue-800 transition-colors" />
                            </span>
                            <span className="text-base sm:text-lg font-bold text-white tracking-tight drop-shadow">
                              View Evidence
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </div>

        {/* Add widget info to your compliance status section */}
        {widgetInfo && widgetInfo.result !== 'None detected' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-blue-700">
                  Existing accessibility solution detected: {widgetInfo.result}
                </p>
                {widgetInfo.details && (
                  <p className="text-blue-600 text-xs sm:text-sm mt-1">
                    {widgetInfo.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Update the widget info display to emphasize the score bonus */}
        {webabilityenabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-4 relative"
          >
            <div className="flex items-center gap-2 sm:gap-4 flex-col sm:flex-row text-center sm:text-left">
              <div className="bg-green-100 p-2 sm:p-3 rounded-full mb-2 sm:mb-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-green-800 text-base sm:text-lg font-medium mb-1">
                  WebAbility Widget Detected! 🎉
                </h3>
                <p className="text-green-700 text-xs sm:text-base">
                  Your website's accessibility score has been enhanced because
                  you're using WebAbility's accessibility solution.
                </p>
                <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row gap-2 justify-center sm:justify-start">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                    Base Score: {totalStats.originalScore}%
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-200 text-green-800">
                    Enhanced Score:{' '}
                    {calculateEnhancedScore(totalStats.originalScore)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const IssuesSummary: React.FC<IssuesSummaryProps> = ({
  filteredIssues,
  activeTab,
  organization,
  onFilterChange,
  activeFilter,
}) => {
  const criticalCount = filteredIssues.filter(
    (i) => i.impact === 'critical',
  ).length;
  const warningCount = filteredIssues.filter(
    (i) => i.impact === 'serious',
  ).length;
  const moderateCount = filteredIssues.filter(
    (i) => i.impact === 'moderate',
  ).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">
            Showing {filteredIssues.length} issues
            {activeTab !== 'all' && organization === 'function'
              ? ` for ${activeTab}`
              : ''}
          </h3>
        </div>

        {/* Add "All" filter button */}
        <button
          onClick={() => onFilterChange(ISSUE_FILTERS.ALL)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
            activeFilter === ISSUE_FILTERS.ALL
              ? 'bg-gray-900 text-white'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          Show All
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {criticalCount > 0 && (
          <button
            onClick={() => onFilterChange(ISSUE_FILTERS.CRITICAL)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              activeFilter === ISSUE_FILTERS.CRITICAL
                ? 'bg-red-600 text-white'
                : 'bg-red-50 border border-red-100 hover:bg-red-100'
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 ${
                activeFilter === ISSUE_FILTERS.CRITICAL
                  ? 'text-white'
                  : 'text-red-600'
              }`}
            />
            <span className="text-sm">
              <span
                className={`font-semibold ${
                  activeFilter === ISSUE_FILTERS.CRITICAL
                    ? 'text-white'
                    : 'text-red-700'
                }`}
              >
                {criticalCount}
              </span>
              <span
                className={
                  activeFilter === ISSUE_FILTERS.CRITICAL
                    ? 'text-white'
                    : 'text-red-600'
                }
              >
                {' '}
                critical
              </span>
            </span>
          </button>
        )}

        {warningCount > 0 && (
          <button
            onClick={() => onFilterChange(ISSUE_FILTERS.WARNING)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              activeFilter === ISSUE_FILTERS.WARNING
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 border border-amber-100 hover:bg-amber-100'
            }`}
          >
            <AlertCircle
              className={`w-4 h-4 ${
                activeFilter === ISSUE_FILTERS.WARNING
                  ? 'text-white'
                  : 'text-amber-600'
              }`}
            />
            <span className="text-sm">
              <span
                className={`font-semibold ${
                  activeFilter === ISSUE_FILTERS.WARNING
                    ? 'text-white'
                    : 'text-amber-700'
                }`}
              >
                {warningCount}
              </span>
              <span
                className={
                  activeFilter === ISSUE_FILTERS.WARNING
                    ? 'text-white'
                    : 'text-amber-600'
                }
              >
                {' '}
                warnings
              </span>
            </span>
          </button>
        )}

        {moderateCount > 0 && (
          <button
            onClick={() => onFilterChange(ISSUE_FILTERS.MODERATE)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              activeFilter === ISSUE_FILTERS.MODERATE
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
            }`}
          >
            <Info
              className={`w-4 h-4 ${
                activeFilter === ISSUE_FILTERS.MODERATE
                  ? 'text-white'
                  : 'text-blue-600'
              }`}
            />
            <span className="text-sm">
              <span
                className={`font-semibold ${
                  activeFilter === ISSUE_FILTERS.MODERATE
                    ? 'text-white'
                    : 'text-blue-700'
                }`}
              >
                {moderateCount}
              </span>
              <span
                className={
                  activeFilter === ISSUE_FILTERS.MODERATE
                    ? 'text-white'
                    : 'text-blue-600'
                }
              >
                {' '}
                moderate
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

const ScanningPreview: React.FC<{ siteImg: string }> = ({ siteImg }) => {
  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-gray-100 mb-8">
      <img
        src={siteImg}
        alt="Screenshot of scanned website"
        className="w-full h-auto"
      />

      {/* Scanning line animation */}
      <motion.div
        initial={{ top: 0 }}
        animate={{ top: '100%' }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="absolute left-0 right-0 h-1 bg-blue-500/50 shadow-lg"
        style={{
          boxShadow: '0 0 20px 10px rgba(59, 130, 246, 0.3)',
        }}
      />

      {/* Scanning overlay */}
      <motion.div
        initial={{ top: 0 }}
        animate={{ top: '100%' }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="absolute left-0 right-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent"
        style={{ transform: 'translateY(-50%)' }}
      />
    </div>
  );
};

const FunctionTabs: React.FC<FunctionTabsProps> = ({
  active,
  onChange,
  functionalityNames,
}) => {
  // Function to assign relevant icons to functionality names
  const getIconForFunction = (name: string) => {
    const normalizedName = name.toLowerCase();
    if (normalizedName.includes('blind')) return <Eye className="w-4 h-4" />;
    if (normalizedName.includes('cognitive'))
      return <Brain className="w-4 h-4" />;
    if (normalizedName.includes('visual')) return <Eye className="w-4 h-4" />;
    if (normalizedName.includes('form'))
      return <FormInput className="w-4 h-4" />;
    if (normalizedName.includes('content'))
      return <FileText className="w-4 h-4" />;
    if (normalizedName.includes('navigation'))
      return <NavigationIcon className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />; // Default icon
  };

  return (
    <div className="bg-blue-900 w-full border-t border-blue-800">
      <div className="flex flex-wrap">
        <button
          onClick={() => onChange('all')}
          className={`px-4 py-2 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            active === 'all'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-blue-100 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          All Issues
        </button>
        {functionalityNames.map((name) => (
          <button
            key={name}
            onClick={() => onChange(name)}
            className={`px-4 py-2 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              active === name
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            {getIconForFunction(name)}
            {name}
          </button>
        ))}
      </div>
    </div>
  );
};

const OrganizationTabs: React.FC<OrganizationTabsProps> = ({
  active,
  onChange,
}) => {
  return (
    <div className="bg-blue-100 rounded-lg p-1 mb-0">
      <div className="flex">
        <button
          onClick={() => onChange('structure')}
          className={`py-3 px-6 flex-1 text-center rounded-lg transition-colors ${
            active === 'structure'
              ? 'bg-white text-blue-900 border border-blue-300 shadow-sm'
              : 'bg-transparent text-gray-700 hover:bg-blue-50'
          }`}
        >
          By Structure
        </button>
        <button
          onClick={() => onChange('function')}
          className={`py-3 px-6 flex-1 text-center rounded-lg transition-colors ${
            active === 'function'
              ? 'bg-white text-blue-900 border border-blue-300 shadow-sm'
              : 'bg-transparent text-gray-700 hover:bg-blue-50'
          }`}
        >
          By Function
        </button>
      </div>
    </div>
  );
};

const StructureTabs: React.FC<StructureTabsProps> = ({ active, onChange }) => {
  const tabs = [
    { id: 'all', label: 'All', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'content', label: 'Content', icon: <FileText className="w-4 h-4" /> },
    {
      id: 'navigation',
      label: 'Navigation',
      icon: <NavigationIcon className="w-4 h-4" />,
    },
    { id: 'forms', label: 'Forms', icon: <FormInput className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-blue-900 w-full border-t border-blue-800">
      <div className="flex flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              active === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  color,
  hasScoreBonus,
  originalScore,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-5 relative overflow-hidden">
      {hasScoreBonus && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-1 text-xs rounded-bl">
          Enhanced
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-gray-800 font-semibold">{title}</h3>
        <span className={`text-${color}-500`}>{icon}</span>
      </div>
      <div className="mt-3">
        <div className="text-4xl font-bold text-gray-900 mb-1">
          {title === 'Accessibility Score' ? `${value}%` : value}
        </div>
        {hasScoreBonus && (
          <div className="flex items-center gap-2 text-sm text-green-600 mt-1 bg-green-50 p-2 rounded-md">
            <span className="flex items-center">
              <span className="font-medium">{originalScore}%</span>
              <span className="mx-1">→</span>
              <span className="font-medium text-green-600">
                {Math.min(
                  (originalScore ?? 0) + WEBABILITY_SCORE_BONUS,
                  MAX_TOTAL_SCORE,
                )}
                %
              </span>
            </span>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
              Web Ability Enhancement Applied
            </span>
          </div>
        )}
        <div className="text-gray-500">{description}</div>
      </div>
      {title === 'Accessibility Score' && (
        <div className="mt-3">
          <div className="bg-blue-100 rounded-full h-2.5 overflow-hidden">
            {hasScoreBonus ? (
              <div className="relative w-full h-full">
                <div
                  className="absolute left-0 top-0 bg-blue-600 h-full transition-all duration-1000"
                  style={{ width: `${originalScore}%` }}
                />
                <div
                  className="absolute h-full bg-green-500 transition-all duration-1000"
                  style={{
                    left: `${originalScore}%`,
                    width: `${Math.min(
                      WEBABILITY_SCORE_BONUS,
                      100 - (originalScore ?? 0),
                    )}%`,
                  }}
                />
              </div>
            ) : (
              <div
                className="bg-blue-600 h-full transition-all duration-1000"
                style={{ width: `${value}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ComplianceStatus: React.FC<ComplianceStatusProps> = ({
  score,
  results,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isDownloading, setIsDownloading] = useState(false); // <-- Add this line

  let status, message, icon, bgColor, textColor;

  if (score >= 80) {
    status = 'Compliant';
    message = 'Your website meets the basic requirements for accessibility.';
    icon = <CheckCircle className="w-8 h-8 text-green-600" />;
    bgColor = 'bg-green-compliant';
    textColor = 'text-green-800';
  } else if (score >= 50) {
    status = 'Partially Compliant';
    message =
      'Your website meets some accessibility requirements but needs improvement.';
    icon = <AlertCircle className="w-8 h-8 text-yellow-600" />;
    bgColor = 'bg-yellow-50';
    textColor = 'text-yellow-800';
  } else {
    status = 'Non-compliant';
    message = 'Your website needs significant accessibility improvements.';
    icon = <AlertTriangle className="w-8 h-8 text-red-600" />;
    bgColor = 'bg-red-not-compliant';
    textColor = 'text-red-800';
  }

  // Email validation helper
  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Handle PDF generation and download only
  const handleDownloadSubmit = async () => {
    setIsDownloading(true); // <-- Set loading state
    try {
      // Generate PDF using the same logic as ScannerHero
      const pdfBlob = await generatePDF(results, currentLanguage);
      // Create download link for immediate download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'accessibility-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded!');
    } catch (error) {
      toast.error('Failed to generate the report. Please try again.');
      console.error('PDF generation error:', error);
    } finally {
      setIsDownloading(false); // <-- Reset loading state
    }
  };

  // Helper to convert Blob to base64
  function blobToBase64(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve((reader.result as string).split(',')[1]);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const generatePDF = async (
    reportData: {
      score: number;
      widgetInfo: { result: string };
      url: string;
    },
    currentLanguage: string,
  ): Promise<Blob> => {
    const { jsPDF } = await import('jspdf');
    let fontLoaded = true;
    try {
      // @ts-ignore
      window.jsPDF = jsPDF;
      // @ts-ignore
      require('@/assets/fonts/NotoSans-normal.js');
      // @ts-ignore
      delete window.jsPDF;
    } catch (e) {
      console.error('Failed to load custom font for jsPDF:', e);
      fontLoaded = false;
    }
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    if (!fontLoaded) {
      doc.setFont('helvetica', 'normal');
    }

    if (!reportData.url) {
      reportData.url = queryParams.get('domain') || '';
    }

    const { logoImage, logoUrl, accessibilityStatementLinkUrl } =
      await getWidgetSettings(reportData.url);
    const WEBABILITY_SCORE_BONUS = 45;
    const MAX_TOTAL_SCORE = 95;
    const issues = extractIssuesFromReport(reportData);

    //console.log("logoUrl",logoImage,logoUrl,accessibilityStatementLinkUrl);
    const baseScore = reportData.score || 0;
    const hasWebAbility = reportData.widgetInfo?.result === 'WebAbility';
    const enhancedScore = hasWebAbility
      ? Math.min(baseScore + WEBABILITY_SCORE_BONUS, MAX_TOTAL_SCORE)
      : baseScore;

    let status: string, message: string, statusColor: [number, number, number];
    if (enhancedScore >= 80) {
      status = 'Compliant';
      message = 'Your website is highly accessible. Great job!';
      statusColor = [22, 163, 74]; // green-600
    } else if (enhancedScore >= 50) {
      status = 'Partially Compliant';
      message =
        'Your website is partially accessible. Some improvements are needed.';
      statusColor = [202, 138, 4]; // yellow-600
    } else {
      status = 'Not Compliant';
      message = 'Your website needs significant accessibility improvements.';
      statusColor = [220, 38, 38]; // red-600
    }

    const [
      translatedStatus,
      translatedMessage,
      translatedMild,
      translatedModerate,
      translatedSevere,
      translatedScore,
      translatedIssue,
      translatedIssueMessage,
      translatedContext,
      translatedFix,
      translatedLabel,
      translatedTotalErrors,
    ] = await translateMultipleTexts(
      [
        status,
        message,
        'Mild',
        'Moderate',
        'Severe',
        'Score',
        'Issue',
        'Message',
        'Context',
        'Fix',
        'Scan results for ',
        'Total Errors',
      ],
      currentLanguage,
    );

    status = translatedStatus;
    doc.setFillColor(21, 101, 192); // dark blue background
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F');

    let logoBottomY = 0;

    if (logoImage) {
      const img = new Image();
      let imageLoadError = false;
      img.src = logoImage;

      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const TIMEOUT_MS = 5000; // 5 seconds

          const cleanup = () => {
            img.onload = null;
            img.onerror = null;
          };

          const timeoutId = setTimeout(() => {
            if (!settled) {
              settled = true;
              cleanup();
              imageLoadError = true;
              reject(new Error('Logo image load timed out'));
            }
          }, TIMEOUT_MS);

          img.onload = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            resolve();
          };
          img.onerror = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            imageLoadError = true;
            reject(new Error('Logo image failed to load'));
          };
        });
      } catch (err) {
        // Log the error for debugging, but continue PDF generation
        // eslint-disable-next-line no-console
        console.warn('Logo image could not be loaded for PDF:', err);
        logoBottomY = 0;
        imageLoadError = true;
      }

      if (!imageLoadError) {
        // Make the logo and container bigger
        const maxWidth = 48,
          maxHeight = 36; // increased size for a bigger logo
        let drawWidth = img.width,
          drawHeight = img.height;
        const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
        drawWidth *= scale;
        drawHeight *= scale;

        // Logo position
        const logoX = 0;
        const logoY = 3;

        const padding = 14;
        const containerX = logoX - padding;
        // Keep the container as before, do not move it up
        const containerYOffset = 10;
        const containerY = logoY - padding - containerYOffset;
        const containerW = drawWidth + 2 * padding - 10;
        const containerH = drawHeight + 2 * padding;
        doc.setFillColor(255, 255, 255); // white
        doc.roundedRect(
          containerX,
          containerY,
          containerW,
          containerH,
          4,
          4,
          'F',
        );

        doc.addImage(img, 'PNG', logoX, logoY, drawWidth, drawHeight);

        if (logoUrl) {
          doc.link(logoX, logoY, drawWidth, drawHeight, {
            url: logoUrl,
            target: '_blank',
          });
        }

        logoBottomY = Math.max(logoY + drawHeight, containerY + containerH);
      }
    }

    const containerWidth = 170;
    const containerHeight = 60;
    const containerX = 105 - containerWidth / 2;
    const containerY = (logoBottomY || 0) + 10; // 10 units gap after logo

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.roundedRect(
      containerX,
      containerY,
      containerWidth,
      containerHeight,
      4,
      4,
      'FD',
    );

    // Now draw the text inside the container, moved down accordingly
    let textY = containerY + 13;

    doc.setFontSize(15);
    doc.setTextColor(0, 0, 0);
    // Compose the full string and measure widths
    let label = 'Scan results for ';
    label = translatedLabel;

    const url = `${reportData.url}`;
    const labelWidth = doc.getTextWidth(label);
    const urlWidth = doc.getTextWidth(url);
    const totalWidth = labelWidth + urlWidth;
    // Calculate starting X so the whole line is centered
    const startX = 105 - totalWidth / 2;

    doc.setFont('NotoSans_Condensed-Regular');
    doc.setTextColor(51, 65, 85); // slate-800 for message
    doc.text(label, startX, textY, { align: 'left' });
    // Draw the URL in bold, immediately after the label, no overlap

    doc.text(url, startX + labelWidth, textY, { align: 'left' });
    doc.setFont('NotoSans_Condensed-Regular');

    textY += 12;
    doc.setFontSize(20);
    doc.setTextColor(...statusColor);
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(status, 105, textY, { align: 'center' });

    message = translatedMessage;
    textY += 9;
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(message, 105, textY, { align: 'center' });

    textY += 9;
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-800 for message
    doc.text(`${new Date().toDateString()}`, 105, textY, { align: 'center' });

    // --- END REPLACEMENT BLOCK ---

    // --- ADD CIRCLES FOR TOTAL ERRORS AND PERCENTAGE ---
    const circleY = containerY + containerHeight + 25;
    const circleRadius = 15;
    const centerX = 105;
    const gap = 40;
    const circle1X = centerX - circleRadius - gap / 2;
    const circle2X = centerX + circleRadius + gap / 2;

    // Circle 1: Total Errors (filled dark blue)
    doc.setDrawColor(21, 101, 192);
    doc.setLineWidth(1.5);
    doc.setFillColor(21, 101, 192);
    doc.circle(circle1X, circleY, circleRadius, 'FD');
    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);

    doc.text(`${issues.length}`, circle1X, circleY, {
      align: 'center',
      baseline: 'middle',
    });

    doc.setFontSize(10);
    doc.setTextColor(21, 101, 192);
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(translatedTotalErrors, circle1X, circleY + circleRadius + 9, {
      align: 'center',
    });

    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.setFillColor(33, 150, 243);
    doc.circle(circle2X, circleY, circleRadius, 'FD');
    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    const scoreText = `${Math.round(enhancedScore)}%`;
    const scoreFontSize = 19;
    doc.setFontSize(scoreFontSize);
    const textHeight = scoreFontSize * 0.35;
    doc.text(scoreText, circle2X, circleY, {
      align: 'center',
      baseline: 'middle',
    });

    doc.setFontSize(10);
    doc.setTextColor(21, 101, 192);
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(translatedScore, circle2X, circleY + circleRadius + 9, {
      align: 'center',
    });
    // --- END CIRCLES ---

    // SEVERITY SUMMARY BOXES

    const yStart = circleY + circleRadius + 30;
    const total = issues.length;
    const counts = {
      critical: issues.filter((i) => i.impact === 'critical').length,
      serious: issues.filter((i) => i.impact === 'serious').length,
      moderate: issues.filter((i) => i.impact === 'moderate').length,
    };
    // Use blue shades for all summary boxes
    const summaryBoxes = [
      {
        label: translatedSevere,
        count: counts.critical + counts.serious,
        color: [255, 204, 204],
      },
      {
        label: translatedModerate,
        count: counts.moderate,
        color: [187, 222, 251],
      },
      {
        label: translatedMild,
        count: total - (counts.critical + counts.serious + counts.moderate),
        color: [225, 245, 254],
      },
    ];

    let x = 20;
    for (const box of summaryBoxes) {
      doc.setFillColor(box.color[0], box.color[1], box.color[2]);
      doc.roundedRect(x, yStart, 55, 20, 3, 3, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text(`${box.count}`, x + 4, yStart + 8);
      doc.setFontSize(10);
      doc.text(box.label, x + 4, yStart + 16);
      x += 60;
    }

    const yTable = yStart + 40;

    const pageHeight = doc.internal.pageSize.getHeight();
    const footerHeight = 15;

    // Helper to ensure array
    const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

    // Build the rows
    let tableBody: any[] = [];
    const FilteredIssues = await deduplicateIssuesByMessage(issues);

    const translatedIssues = await translateText(
      FilteredIssues,
      currentLanguage,
    );

    // After fetching base64
    for (const issue of translatedIssues) {
      if (issue.screenshotUrl && !issue.screenshotBase64) {
        issue.screenshotBase64 = await fetchImageAsBase64(issue.screenshotUrl);
        // console.log('Fetched base64 for', issue.screenshotUrl, '->', !!issue.screenshotBase64);
      }
    }

    for (const issue of translatedIssues) {
      // Add header row for each issue with beautiful styling
      tableBody.push([
        {
          content: translatedIssue,
          colSpan: 2,
          styles: {
            fillColor: [255, 255, 255], // white background
            textColor: [0, 0, 0], // black text
            fontSize: 14,
            halign: 'center',
            cellPadding: 8,
          },
        },
        {
          content: translatedIssueMessage,
          colSpan: 2,
          styles: {
            fillColor: [255, 255, 255], // matching white background
            textColor: [0, 0, 0], // black text
            fontSize: 14,
            halign: 'center',
            cellPadding: 8,
          },
        },
      ]);

      // Row 1: Issue + Message with elegant code block styling
      tableBody.push([
        {
          content: `${issue.code ? `${issue.code} (${issue.impact})` : ''}`,
          colSpan: 2,
          styles: {
            fontSize: 12,
            textColor: [30, 41, 59], // dark navy text
            halign: 'left',
            cellPadding: 10,
            fillColor:
              issue.impact === 'critical'
                ? [255, 204, 204]
                : issue.impact === 'Mild'
                ? [225, 245, 254]
                : issue.impact === 'moderate'
                ? [187, 222, 251]
                : [248, 250, 252],
            font: 'NotoSans_Condensed-Regular',
            minCellHeight: 30,
          },
        },

        {
          content: `${issue.message || ''}`,
          colSpan: 2,
          styles: {
            fontSize: 12,
            textColor: [30, 41, 59], // dark navy text
            halign: 'left',
            cellPadding: 10,
            fillColor:
              issue.impact === 'critical'
                ? [255, 204, 204]
                : issue.impact === 'Mild'
                ? [225, 245, 254]
                : issue.impact === 'moderate'
                ? [187, 222, 251]
                : [248, 250, 252],
            font: 'NotoSans_Condensed-Regular',
            minCellHeight: 30,
          },
        },
      ]);
      // If screenshotBase64 is available, add a row with the image
      if (issue.screenshotBase64) {
        // Get actual image dimensions from base64 data
        const dimensions = await getImageDimensions(issue.screenshotBase64);
        let drawWidth = dimensions.width;
        let drawHeight = dimensions.height;

        // Scale down if image is too large for PDF
        const maxWidth = 120;
        const maxHeight = 80;
        const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight, 1);

        const screenshotWidth = drawWidth * scale;
        const screenshotHeight = drawHeight * scale;

        // Add a heading row for the screenshot
        tableBody.push([
          {
            content: 'Screenshot',
            colSpan: 4,
            styles: {
              fontSize: 12,
              textColor: [30, 41, 59],
              halign: 'center',
              cellPadding: 6,
              fillColor: [237, 242, 247],
              minCellHeight: 18,
            },
          } as any,
        ]);

        // Add the screenshot image row
        tableBody.push([
          {
            content: '',
            colSpan: 4,
            styles: {
              halign: 'center',
              valign: 'middle',
              cellPadding: 8,
              fillColor: [248, 250, 252],
              minCellHeight: screenshotHeight + 20, // Add padding around image
            },
            _isScreenshot: true,
            _screenshotBase64: issue.screenshotBase64,
            _screenshotWidth: screenshotWidth,
            _screenshotHeight: screenshotHeight,
            _screenshotUrl: issue.screenshotUrl, // Add the screenshot URL for linking
          } as any,
        ]);
      }

      // Contexts block (styled like code snapshots with numbers and black rounded boxes)
      const contexts = toArray(issue.context).filter(Boolean);

      if (contexts.length > 0) {
        // Heading: "Context:"
        tableBody.push([
          {
            content: translatedContext,
            colSpan: 4,
            styles: {
              fontSize: 11,
              textColor: [0, 0, 0],
              halign: 'left',
              cellPadding: 5,
              fillColor: [255, 255, 255],
              lineWidth: 0,
            },
          },
        ]);

        contexts.forEach((ctx, index) => {
          // Combined code block with index number
          const combinedContent = `${index + 1}. ${ctx}`;

          tableBody.push([
            {
              content: combinedContent,
              colSpan: 4,
              pageBreak: 'avoid',
              rowSpan: 1,
              styles: {
                font: 'NotoSans_Condensed-Regular',
                fontSize: 10,
                textColor: [255, 255, 255], // This will be overridden by didDrawCell
                fillColor: [255, 255, 255], // White background for the cell
                halign: 'left',
                valign: 'top',
                cellPadding: 8,
                lineWidth: 0,
                minCellHeight: Math.max(
                  20,
                  Math.ceil(combinedContent.length / 50) * 6,
                ), // Dynamic height based on content
                overflow: 'linebreak',
              },

              _isCodeBlock: true,
              _originalContent: combinedContent, // Store original content for height calculation
              _indexNumber: index + 1, // Store index for potential special formatting
            } as any,
          ]);

          // Spacer row after each block (except the last)
          if (index < contexts.length - 1) {
            tableBody.push([
              {
                content: '',
                colSpan: 4,
                styles: {
                  fillColor: [255, 255, 255],
                  cellPadding: 0,
                  lineWidth: 0,
                  minCellHeight: 8,
                },
              },
            ]);
          }
        });
      }

      // Row 3: Fix(es) - display heading first, then each fix in its own white back container with spacing
      const fixes = toArray(issue.recommended_action);
      if (fixes.length > 0 && fixes.some((f) => !!f)) {
        // Heading row for Fix
        tableBody.push([
          {
            content: translatedFix,
            colSpan: 4,
            styles: {
              fontSize: 11,
              textColor: [0, 0, 0], // black text
              halign: 'left',
              cellPadding: 5,
              fillColor: [255, 255, 255], // white background
              lineWidth: 0,
              font: 'NotoSans_Condensed-Regular',
            },
          },
        ]);
        // Each fix in its own row/container, with white background and spacing
        const filteredFixes = fixes.filter(Boolean);
        filteredFixes.forEach((fix, fixIdx) => {
          tableBody.push([
            {
              content: `${fixIdx + 1}. ${fix}`,
              colSpan: 4,
              styles: {
                fontSize: 11,
                textColor: [0, 0, 0], // black text
                halign: 'left',
                cellPadding: { top: 10, right: 8, bottom: 10, left: 8 }, // more vertical space for separation
                fillColor: [255, 255, 255], // white background for back container
                lineWidth: 0,
                font: 'NotoSans_Condensed-Regular',
              },
            },
          ]);
          // Add a spacer row after each fix except the last
          if (fixIdx < filteredFixes.length - 1) {
            tableBody.push([
              {
                content: '',
                colSpan: 4,
                styles: {
                  cellPadding: 0,
                  fillColor: [255, 255, 255],
                  lineWidth: 0,
                  minCellHeight: 6, // vertical space between containers
                },
              },
            ]);
          }
        });
      }
    }

    // No global table header, since each issue has its own header row
    autoTable(doc, {
      startY: yTable,
      margin: { left: 15, right: 15, top: 0, bottom: footerHeight },
      head: [],
      body: tableBody,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 38 },
        2: { cellWidth: 50 },
        3: { cellWidth: 45 },
      },
      // Enhanced page break handling
      rowPageBreak: 'avoid',

      // Custom table styling
      tableLineColor: [226, 232, 240], // Light gray border
      tableLineWidth: 0.5, // Thin border
      styles: {
        lineColor: [255, 255, 255], // White (invisible) line color for cells
        lineWidth: 0, // No cell borders
        cellPadding: 8,
      },

      // Check before drawing each cell to prevent page breaks in code blocks
      willDrawCell: (data: any) => {
        if (data.cell.raw && (data.cell.raw as any)._isCodeBlock) {
          const pageHeight = doc.internal.pageSize.getHeight();
          const currentY = data.cursor.y;
          const bottomMargin = 25; // Space needed at bottom of page

          // Calculate actual text height for more accurate estimation
          const fullText = (data.cell.raw as any).content || '';
          const indexNumber = (data.cell.raw as any)._indexNumber;

          // Calculate the actual content that will be displayed
          const indexPrefix = `${indexNumber}`;
          const indexWidth = doc.getTextWidth(indexPrefix) + 16; // Index section width
          const codeContent = fullText.substring(`${indexNumber}. `.length);

          // Calculate available width for code content
          const availableWidth = data.cell.width - 16 - indexWidth; // Cell padding + index width

          doc.setFont('NotoSans_Condensed-Regular', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(codeContent, availableWidth);

          // More accurate height calculation
          const lineHeight = 4; // Line spacing
          const topPadding = 8; // Top padding
          const bottomPadding = 4; // Bottom padding
          const textHeight =
            lines.length * lineHeight + topPadding + bottomPadding;
          const estimatedHeight = Math.max(textHeight, 30); // Minimum height of 30

          // If the code block won't fit on current page, force a page break
          if (currentY + estimatedHeight > pageHeight - bottomMargin) {
            return false; // This will trigger a page break
          }
        }
        return true;
      },

      didDrawCell: (data: any) => {
        // Check if this cell is marked as a code block
        if (data.cell.raw && (data.cell.raw as any)._isCodeBlock) {
          const { x, y, width, height } = data.cell;

          const padding = 2;
          const cornerRadius = 4;
          const indexNumber = (data.cell.raw as any)._indexNumber;

          // Calculate index section width
          doc.setFont('NotoSans_Condensed-Regular', 'normal');
          doc.setFontSize(12);
          const indexPrefix = `${indexNumber}`;
          const indexWidth = doc.getTextWidth(indexPrefix) + 8; // Extra padding for the index section

          // Draw the overall rounded rectangle background (darker blue)
          doc.setDrawColor(100, 116, 139); // slate-500 border
          doc.setLineWidth(0.5);
          doc.setFillColor(15, 23, 42); // slate-900 background (darker blue)

          doc.roundedRect(
            x + padding,
            y + padding,
            width - padding * 2,
            height - padding * 2,
            cornerRadius,
            cornerRadius,
            'FD', // Fill and Draw
          );

          // Draw the lighter blue section for the index number (left side)
          doc.setFillColor(51, 65, 85); // slate-700 (lighter blue than the main background)
          doc.roundedRect(
            x + padding,
            y + padding,
            indexWidth,
            height - padding * 2,
            cornerRadius,
            cornerRadius,
            'F', // Fill only
          );

          // Fix the right side of the index section to not be rounded
          doc.setFillColor(51, 65, 85); // slate-700
          doc.rect(
            x + padding + indexWidth - cornerRadius,
            y + padding,
            cornerRadius,
            height - padding * 2,
            'F',
          );

          // Now draw the text - both in white
          doc.setTextColor(255, 255, 255); // white text for both sections

          // Draw the index number in the lighter blue section (top-left aligned)
          const indexTextX = x + padding + 4; // Small padding from left edge
          const textY = y + padding + 8; // Same as code content top alignment
          doc.text(indexPrefix, indexTextX, textY);

          // Draw the code content in the darker blue section
          const fullText = (data.cell.raw as any).content;
          const codeContent = fullText.substring(`${indexNumber}. `.length);
          const codeTextX = x + padding + indexWidth + 4;
          const availableWidth = width - padding * 2 - indexWidth - 8;

          // Split code content into lines
          const lines = doc.splitTextToSize(codeContent, availableWidth);
          let codeTextY = y + padding + 8;

          lines.forEach((line: string) => {
            doc.text(line, codeTextX, codeTextY);
            codeTextY += 4; // Line spacing
          });
        }

        // Add bottom border only to header rows (Issue/Message rows)
        if (
          data.cell.raw &&
          data.cell.raw.styles &&
          data.cell.raw.styles.fontStyle === 'bold' &&
          data.cell.raw.styles.fontSize === 14
        ) {
          const { x, y, width, height } = data.cell;
          doc.setDrawColor(226, 232, 240); // Light gray
          doc.setLineWidth(0.5);
          doc.line(x, y + height, x + width, y + height); // Bottom border
        }
        if (
          data.cell.raw &&
          data.cell.raw._isScreenshot &&
          data.cell.raw._screenshotBase64
        ) {
          const { x, y, width, height } = data.cell;
          const imgWidth = data.cell.raw._screenshotWidth || 80;
          const imgHeight = data.cell.raw._screenshotHeight || 80;
          const imgX = x + (width - imgWidth) / 2;
          const imgY = y + (height - imgHeight) / 2;
          data.doc.addImage(
            data.cell.raw._screenshotBase64,
            'PNG',
            imgX,
            imgY,
            imgWidth,
            imgHeight,
          );
        }
        if (data.cell.raw && data.cell.raw._isScreenshot) {
          //   console.log('didDrawCell for screenshot', data.cell.raw._screenshotBase64 ? 'has base64' : 'no base64');
        }
      },
    });

    // --- END CUSTOM TABLE LAYOUT ---
    if (accessibilityStatementLinkUrl) {
      const totalPages = (doc as any).internal.getNumberOfPages();
      const footerY = doc.internal.pageSize.getHeight() - 10;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(33, 150, 243); // normal blue
        doc.text('Accessibility Statement', 15, footerY);
        doc.link(
          15,
          footerY - 3,
          doc.getTextWidth('Accessibility Statement'),
          4,
          {
            url: accessibilityStatementLinkUrl,
            target: '_blank',
          },
        );
      }
    }

    return doc.output('blob');
  };
  const [currentLanguage, setCurrentLanguage] = useState<string>('');

  const generateShortPDF = async (
    reportData: {
      score: number;
      widgetInfo: { result: string };
      scriptCheckResult?: string;
      url: string;
    },
    currentLanguage: string,
  ): Promise<Blob> => {
    const { jsPDF } = await import('jspdf');
    const { isCodeCompliant } = await import('@/utils/translator');

    let fontLoaded = true;
    try {
      // @ts-ignore
      window.jsPDF = jsPDF;
      // @ts-ignore
      require('@/assets/fonts/NotoSans-normal.js');
      // @ts-ignore
      delete window.jsPDF;
    } catch (e) {
      console.error('Failed to load custom font for jsPDF:', e);
      fontLoaded = false;
    }

    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    if (!fontLoaded) {
      doc.setFont('helvetica', 'normal');
    }
    if (!reportData.url) {
      reportData.url = queryParams.get('domain') || '';
    }

    const { logoImage, logoUrl, accessibilityStatementLinkUrl } =
      await getWidgetSettings(reportData.url);
    const WEBABILITY_SCORE_BONUS = 45;
    const MAX_TOTAL_SCORE = 95;
    const issues = extractIssuesFromReport(reportData);

    //console.log("logoUrl",logoImage,logoUrl,accessibilityStatementLinkUrl);
    const baseScore = reportData.score || 0;
    const scriptCheckResult = reportData.scriptCheckResult;
    const hasWebAbility = scriptCheckResult === 'Web Ability';

    const enhancedScore = hasWebAbility
      ? Math.min(baseScore + WEBABILITY_SCORE_BONUS, MAX_TOTAL_SCORE)
      : baseScore;

    let status: string, message: string, statusColor: [number, number, number];
    if (enhancedScore >= 80) {
      status = 'Compliant';
      message = 'Your website is highly accessible. Great job!';
      statusColor = [22, 163, 74]; // green-600
    } else if (enhancedScore >= 50) {
      status = 'Partially Compliant';
      message =
        'Your website is partially accessible. Some improvements are needed.';
      statusColor = [202, 138, 4]; // yellow-600
    } else {
      status = 'Not Compliant';
      message = 'Your website needs significant accessibility improvements.';
      statusColor = [220, 38, 38]; // red-600
    }

    const [
      translatedStatus,
      translatedMessage,
      translatedMild,
      translatedModerate,
      translatedSevere,
      translatedScore,
      translatedIssue,
      translatedIssueMessage,
      translatedContext,
      translatedFix,
      translatedLabel,
      translatedTotalErrors,
      translatedIssuesDetectedByCategory,
      translatedAccessibilityComplianceAchieved,
      translatedWebsiteCompliant,
      translatedComplianceStatus,
      translatedWebAbilityProtecting,
      translatedAutomatedFixesApplied,
      translatedCriticalViolationsDetected,
      translatedLegalActionWarning,
      translatedImmediateRisks,
      translatedPotentialLawsuits,
      translatedCustomerLoss,
      translatedSeoPenalties,
      translatedBrandDamage,
      translatedTimeSensitiveAction,
      translatedWebAbilityAutoFix,
      translatedInstantCompliance,
      translatedProtectBusiness,
      translatedAccessibilityStatement,
      translatedWcagComplianceIssues,
      translatedAutoFixed,
      translatedReadyToUse,
      translatedNeedAction,
      translatedReviewRequired,
      translatedCanBeFixedWithWebability,
      translatedUseWebabilityToFix,
      translatedCriticalComplianceGaps,
    ] = await translateMultipleTexts(
      [
        status,
        message,
        'Mild',
        'Moderate',
        'Severe',
        'Score',
        'Issue',
        'Message',
        'Context',
        'Fix',
        'Scan results for ',
        'Total Errors',
        'Issues detected by category',
        '✓ ACCESSIBILITY COMPLIANCE ACHIEVED',
        'Your website is now compliant with accessibility standards',
        'COMPLIANCE STATUS:',
        '✓ WebAbility widget is actively protecting your site',
        '✓ Automated accessibility fixes are applied',
        ' CRITICAL ACCESSIBILITY VIOLATIONS DETECTED',
        'Your website may face legal action and lose customers',
        'IMMEDIATE RISKS TO YOUR BUSINESS:',
        '• Potential lawsuits under ADA compliance regulations',
        '• Loss of 15% of potential customers (disabled users)',
        '• Google SEO penalties reducing search rankings',
        '• Damage to brand reputation and customer trust',
        'TIME-SENSITIVE ACTION REQUIRED:',
        '✓ WebAbility can fix most issues automatically',
        '✓ Instant compliance improvement',
        '✓ Protect your business from legal risks TODAY',
        'Accessibility Statement',
        'WCAG 2.1 AA Compliance Issues for',
        'Auto-Fixed',
        ' Ready to use',
        'Need Action',
        '⚠ Review required',
        'Fix with AI',
        'use webability to fix',
        'Critical compliance gaps exposing your business to legal action',
      ],
      currentLanguage,
    );

    status = translatedStatus;
    doc.setFillColor(21, 101, 192); // dark blue background
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F');

    let logoBottomY = 0;

    if (logoImage) {
      const img = new Image();
      let imageLoadError = false;
      img.src = logoImage;

      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const TIMEOUT_MS = 5000; // 5 seconds

          const cleanup = () => {
            img.onload = null;
            img.onerror = null;
          };

          const timeoutId = setTimeout(() => {
            if (!settled) {
              settled = true;
              cleanup();
              imageLoadError = true;
              reject(new Error('Logo image load timed out'));
            }
          }, TIMEOUT_MS);

          img.onload = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            resolve();
          };
          img.onerror = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            imageLoadError = true;
            reject(new Error('Logo image failed to load'));
          };
        });
      } catch (err) {
        // Log the error for debugging, but continue PDF generation
        // eslint-disable-next-line no-console
        console.warn('Logo image could not be loaded for PDF:', err);
        logoBottomY = 0;
        imageLoadError = true;
      }

      if (!imageLoadError) {
        // Make the logo and container bigger
        const maxWidth = 48,
          maxHeight = 36; // increased size for a bigger logo
        let drawWidth = img.width,
          drawHeight = img.height;
        const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
        drawWidth *= scale;
        drawHeight *= scale;

        // Logo position
        const logoX = 0;
        const logoY = 3;

        const padding = 14;
        const containerX = logoX - padding;
        // Keep the container as before, do not move it up
        const containerYOffset = 10;
        const containerY = logoY - padding - containerYOffset;
        const containerW = drawWidth + 2 * padding - 10;
        const containerH = drawHeight + 2 * padding;
        doc.setFillColor(255, 255, 255); // white
        doc.roundedRect(
          containerX,
          containerY,
          containerW,
          containerH,
          4,
          4,
          'F',
        );

        doc.addImage(img, 'PNG', logoX, logoY, drawWidth, drawHeight);

        if (logoUrl) {
          doc.link(logoX, logoY, drawWidth, drawHeight, {
            url: logoUrl,
            target: '_blank',
          });
        }

        logoBottomY = Math.max(logoY + drawHeight, containerY + containerH);
      }
    }

    const containerWidth = 170;
    const containerHeight = 60;
    const containerX = 105 - containerWidth / 2;
    const containerY = (logoBottomY || 0) + 10; // 10 units gap after logo

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.roundedRect(
      containerX,
      containerY,
      containerWidth,
      containerHeight,
      4,
      4,
      'FD',
    );

    // Now draw the text inside the container, moved down accordingly
    let textY = containerY + 13;

    doc.setFontSize(15);
    doc.setTextColor(0, 0, 0);
    // Compose the full string and measure widths
    let label = 'Scan results for ';
    label = translatedLabel;

    const url = `${reportData.url}`;
    const labelWidth = doc.getTextWidth(label);
    const urlWidth = doc.getTextWidth(url);
    const totalWidth = labelWidth + urlWidth;
    // Calculate starting X so the whole line is centered
    const startX = 105 - totalWidth / 2;

    doc.setFont('NotoSans_Condensed-Regular');
    doc.setTextColor(51, 65, 85); // slate-800 for message
    doc.text(label, startX, textY, { align: 'left' });
    // Draw the URL in bold, immediately after the label, no overlap

    doc.text(url, startX + labelWidth, textY, { align: 'left' });
    doc.setFont('NotoSans_Condensed-Regular');

    textY += 12;
    doc.setFontSize(20);
    doc.setTextColor(...statusColor);
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(status, 105, textY, { align: 'center' });

    message = translatedMessage;
    textY += 9;
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(message, 105, textY, { align: 'center' });

    textY += 9;
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-800 for message
    doc.text(`${new Date().toDateString()}`, 105, textY, { align: 'center' });

    // --- END REPLACEMENT BLOCK ---

    // --- ADD CIRCLES FOR TOTAL ERRORS AND PERCENTAGE ---
    const circleY = containerY + containerHeight + 17;
    const circleRadius = 15;
    const centerX = 105;
    const gap = 40;
    const circle1X = centerX - circleRadius - gap / 2;
    const circle2X = centerX + circleRadius + gap / 2;

    // Circle 1: Total Errors (filled dark blue)
    doc.setDrawColor(21, 101, 192);
    doc.setLineWidth(1.5);
    doc.setFillColor(21, 101, 192);
    doc.circle(circle1X, circleY, circleRadius, 'FD');
    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);

    doc.text(`${issues.length}`, circle1X, circleY, {
      align: 'center',
      baseline: 'middle',
    });

    doc.setFontSize(10);
    doc.setTextColor(21, 101, 192);
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(translatedTotalErrors, circle1X, circleY + circleRadius + 9, {
      align: 'center',
    });

    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.setFillColor(33, 150, 243);
    doc.circle(circle2X, circleY, circleRadius, 'FD');
    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    const scoreText = `${Math.round(enhancedScore)}%`;
    const scoreFontSize = 19;
    doc.setFontSize(scoreFontSize);
    const textHeight = scoreFontSize * 0.35;
    doc.text(scoreText, circle2X, circleY, {
      align: 'center',
      baseline: 'middle',
    });

    doc.setFontSize(10);
    doc.setTextColor(21, 101, 192);
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(translatedScore, circle2X, circleY + circleRadius + 9, {
      align: 'center',
    });
    // --- END CIRCLES ---

    // SEVERITY SUMMARY BOXES

    const yStart = circleY + circleRadius + 15;
    const total = issues.length;
    const counts = {
      critical: issues.filter((i) => i.impact === 'critical').length,
      serious: issues.filter((i) => i.impact === 'serious').length,
      moderate: issues.filter((i) => i.impact === 'moderate').length,
    };

    const summaryBoxes = [
      {
        label: translatedSevere,
        count: counts.critical + counts.serious,
        color: [255, 204, 204],
      },
      {
        label: translatedModerate,
        count: counts.moderate,
        color: [187, 222, 251],
      },
      {
        label: translatedMild,
        count: total - (counts.critical + counts.serious + counts.moderate),
        color: [225, 245, 254],
      },
    ];

    let x = 18;
    for (const box of summaryBoxes) {
      // Add shadow to summary boxes
      doc.setFillColor(245, 245, 245); // Very light gray for shadow
      doc.roundedRect(x + 1, yStart + 1, 57, 22, 4, 4, 'F');

      doc.setFillColor(box.color[0], box.color[1], box.color[2]);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, yStart, 57, 22, 4, 4, 'FD');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text(`${box.count}`, x + 5, yStart + 9);
      doc.setFontSize(11);
      doc.text(box.label, x + 5, yStart + 18);
      x += 62;
    }

    // Function to load SVG icons from the report icons folder
    const loadSVGIcon = async (category: string): Promise<string | null> => {
      try {
        let iconPath = '';
        const normalizedCategory = category.toLowerCase();

        // Map accessibility categories to appropriate icons
        if (
          normalizedCategory.includes('content') ||
          normalizedCategory.includes('text')
        ) {
          iconPath = '/images/report_icons/content.svg';
        } else if (
          normalizedCategory.includes('navigation') ||
          normalizedCategory.includes('navigate') ||
          normalizedCategory.includes('menu')
        ) {
          iconPath = '/images/report_icons/navigation.svg';
        } else if (
          normalizedCategory.includes('form') ||
          normalizedCategory.includes('input') ||
          normalizedCategory.includes('button')
        ) {
          iconPath = '/images/report_icons/forms.svg';
        } else if (
          normalizedCategory.includes('cognitive') ||
          normalizedCategory.includes('brain') ||
          normalizedCategory.includes('mental')
        ) {
          iconPath = '/images/report_icons/cognitive.svg';
        } else if (
          normalizedCategory.includes('visual') ||
          normalizedCategory.includes('blind') ||
          normalizedCategory.includes('vision') ||
          normalizedCategory.includes('low-vision')
        ) {
          iconPath = '/images/report_icons/low-vision.svg';
        } else if (
          normalizedCategory.includes('mobility') ||
          normalizedCategory.includes('motor') ||
          normalizedCategory.includes('movement')
        ) {
          iconPath = '/images/report_icons/Mobility.svg';
        } else if (
          normalizedCategory.includes('other') ||
          normalizedCategory === 'others'
        ) {
          iconPath = '/images/report_icons/others.svg';
        } else {
          // Default fallback for unmapped categories
          iconPath = '/images/report_icons/others.svg';
        }

        const response = await fetch(iconPath);
        if (response.ok) {
          const svgText = await response.text();

          // Convert SVG to high-resolution PNG using canvas
          return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            // Use high resolution for crisp icons (256x256)
            const size = 256;
            canvas.width = size;
            canvas.height = size;

            img.onload = () => {
              if (ctx) {
                // Enable smooth scaling for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Clear canvas and draw the SVG at high resolution
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convert to high-quality PNG data URL
                const pngDataUrl = canvas.toDataURL('image/png', 1.0);
                resolve(pngDataUrl);
              } else {
                resolve(null);
              }
            };

            img.onerror = () => {
              resolve(null);
            };

            // Create data URL from SVG
            const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
            img.src = svgDataUrl;
          });
        }
      } catch (error) {
        console.warn('Failed to load SVG icon for category:', category, error);
      }
      return null;
    };

    // Function to draw category icons
    const drawCategoryIcon = (
      doc: any,
      category: string,
      x: number,
      y: number,
      size: number,
    ) => {
      const iconColor = [21, 101, 192]; // Blue color for icons
      const normalizedCategory = category.toLowerCase();

      // Enhanced category matching with multiple keyword support
      if (
        normalizedCategory.includes('content') ||
        normalizedCategory.includes('text')
      ) {
        // Draw content icon (document with text)
        doc.setFillColor(...iconColor);
        doc.setDrawColor(...iconColor);
        doc.setLineWidth(0.3);

        // Document outline
        doc.rect(x, y, size * 0.8, size * 1.1, 'S');
        // Document fold
        doc.line(x + size * 0.6, y, x + size * 0.6, y + size * 0.2);
        doc.line(
          x + size * 0.6,
          y + size * 0.2,
          x + size * 0.8,
          y + size * 0.2,
        );
        // Text lines
        doc.setLineWidth(0.2);
        doc.line(
          x + size * 0.15,
          y + size * 0.35,
          x + size * 0.65,
          y + size * 0.35,
        );
        doc.line(
          x + size * 0.15,
          y + size * 0.5,
          x + size * 0.65,
          y + size * 0.5,
        );
        doc.line(
          x + size * 0.15,
          y + size * 0.65,
          x + size * 0.5,
          y + size * 0.65,
        );
        doc.line(
          x + size * 0.15,
          y + size * 0.8,
          x + size * 0.55,
          y + size * 0.8,
        );
      } else if (
        normalizedCategory.includes('navigation') ||
        normalizedCategory.includes('navigate') ||
        normalizedCategory.includes('menu')
      ) {
        // Draw navigation icon (compass/arrow)
        doc.setFillColor(...iconColor);
        doc.setDrawColor(...iconColor);
        doc.setLineWidth(0.4);

        // Main arrow
        doc.line(
          x + size * 0.2,
          y + size * 0.8,
          x + size * 0.8,
          y + size * 0.2,
        );
        doc.line(
          x + size * 0.8,
          y + size * 0.2,
          x + size * 0.6,
          y + size * 0.4,
        );
        doc.line(
          x + size * 0.8,
          y + size * 0.2,
          x + size * 0.6,
          y + size * 0.2,
        );
        // Small arrow
        doc.line(
          x + size * 0.3,
          y + size * 0.7,
          x + size * 0.7,
          y + size * 0.3,
        );
        doc.line(
          x + size * 0.7,
          y + size * 0.3,
          x + size * 0.55,
          y + size * 0.45,
        );
        doc.line(
          x + size * 0.7,
          y + size * 0.3,
          x + size * 0.55,
          y + size * 0.3,
        );
      } else if (
        normalizedCategory.includes('form') ||
        normalizedCategory.includes('input') ||
        normalizedCategory.includes('button')
      ) {
        // Draw forms icon (form with checkboxes)
        doc.setFillColor(...iconColor);
        doc.setDrawColor(...iconColor);
        doc.setLineWidth(0.3);

        // Form outline
        doc.rect(x, y, size * 0.9, size * 1.1, 'S');
        // Checkbox 1
        doc.rect(x + size * 0.1, y + size * 0.2, size * 0.15, size * 0.15, 'S');
        doc.line(
          x + size * 0.13,
          y + size * 0.28,
          x + size * 0.18,
          y + size * 0.33,
        );
        doc.line(
          x + size * 0.18,
          y + size * 0.33,
          x + size * 0.22,
          y + size * 0.25,
        );
        // Checkbox 2
        doc.rect(
          x + size * 0.1,
          y + size * 0.45,
          size * 0.15,
          size * 0.15,
          'S',
        );
        doc.line(
          x + size * 0.13,
          y + size * 0.53,
          x + size * 0.18,
          y + size * 0.58,
        );
        doc.line(
          x + size * 0.18,
          y + size * 0.58,
          x + size * 0.22,
          y + size * 0.5,
        );
        // Text lines
        doc.setLineWidth(0.2);
        doc.line(
          x + size * 0.3,
          y + size * 0.28,
          x + size * 0.8,
          y + size * 0.28,
        );
        doc.line(
          x + size * 0.3,
          y + size * 0.53,
          x + size * 0.8,
          y + size * 0.53,
        );
        doc.line(
          x + size * 0.3,
          y + size * 0.78,
          x + size * 0.7,
          y + size * 0.78,
        );
      } else if (
        normalizedCategory.includes('cognitive') ||
        normalizedCategory.includes('brain') ||
        normalizedCategory.includes('mental')
      ) {
        // Draw cognitive icon (brain/mind)
        doc.setFillColor(...iconColor);
        doc.setDrawColor(...iconColor);
        doc.setLineWidth(0.3);

        // Brain outline
        doc.circle(x + size * 0.5, y + size * 0.4, size * 0.3, 'S');
        // Brain wrinkles/patterns
        doc.setLineWidth(0.2);
        doc.line(
          x + size * 0.3,
          y + size * 0.35,
          x + size * 0.5,
          y + size * 0.25,
        );
        doc.line(
          x + size * 0.5,
          y + size * 0.45,
          x + size * 0.7,
          y + size * 0.35,
        );
        doc.line(
          x + size * 0.35,
          y + size * 0.5,
          x + size * 0.65,
          y + size * 0.5,
        );
        // Thought bubbles
        doc.circle(x + size * 0.2, y + size * 0.8, size * 0.05, 'F');
        doc.circle(x + size * 0.3, y + size * 0.7, size * 0.03, 'F');
      } else if (
        normalizedCategory.includes('visual') ||
        normalizedCategory.includes('blind') ||
        normalizedCategory.includes('vision') ||
        normalizedCategory.includes('low-vision')
      ) {
        // Draw vision/eye icon
        doc.setFillColor(...iconColor);
        doc.setDrawColor(...iconColor);
        doc.setLineWidth(0.3);

        // Eye outline
        doc.ellipse(
          x + size * 0.5,
          y + size * 0.5,
          size * 0.4,
          size * 0.25,
          'S',
        );
        // Pupil
        doc.circle(x + size * 0.5, y + size * 0.5, size * 0.12, 'F');
        // Highlight
        doc.setFillColor(255, 255, 255);
        doc.circle(x + size * 0.52, y + size * 0.45, size * 0.04, 'F');
        doc.setFillColor(...iconColor);
      } else if (
        normalizedCategory.includes('mobility') ||
        normalizedCategory.includes('motor') ||
        normalizedCategory.includes('movement')
      ) {
        // Draw mobility/movement icon (hand/gesture)
        doc.setFillColor(...iconColor);
        doc.setDrawColor(...iconColor);
        doc.setLineWidth(0.3);

        // Hand/cursor icon
        doc.circle(x + size * 0.3, y + size * 0.3, size * 0.15, 'S');
        doc.line(
          x + size * 0.3,
          y + size * 0.45,
          x + size * 0.3,
          y + size * 0.8,
        );
        doc.line(
          x + size * 0.15,
          y + size * 0.6,
          x + size * 0.45,
          y + size * 0.6,
        );
        // Arrows indicating movement
        doc.setLineWidth(0.2);
        doc.line(
          x + size * 0.6,
          y + size * 0.3,
          x + size * 0.8,
          y + size * 0.3,
        );
        doc.line(
          x + size * 0.75,
          y + size * 0.25,
          x + size * 0.8,
          y + size * 0.3,
        );
        doc.line(
          x + size * 0.75,
          y + size * 0.35,
          x + size * 0.8,
          y + size * 0.3,
        );
      } else if (
        normalizedCategory.includes('other') ||
        normalizedCategory === 'others'
      ) {
        // Draw other icon (gear/settings)
        doc.setFillColor(...iconColor);
        doc.setDrawColor(...iconColor);
        doc.setLineWidth(0.3);

        // Gear teeth
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const x1 = x + size * 0.5 + Math.cos(angle) * size * 0.4;
          const y1 = y + size * 0.5 + Math.sin(angle) * size * 0.4;
          const x2 = x + size * 0.5 + Math.cos(angle) * size * 0.25;
          const y2 = y + size * 0.5 + Math.sin(angle) * size * 0.25;
          doc.line(x1, y1, x2, y2);
        }
        // Center circle
        doc.circle(x + size * 0.5, y + size * 0.5, size * 0.15, 'S');
      } else {
        // Draw a generic icon (circle with dots)
        doc.setFillColor(...iconColor);
        doc.setDrawColor(...iconColor);
        doc.setLineWidth(0.3);

        // Main circle
        doc.circle(x + size * 0.5, y + size * 0.5, size * 0.3, 'S');
        // Dots
        doc.circle(x + size * 0.3, y + size * 0.3, size * 0.08, 'F');
        doc.circle(x + size * 0.7, y + size * 0.3, size * 0.08, 'F');
        doc.circle(x + size * 0.5, y + size * 0.7, size * 0.08, 'F');
      }
    };

    // Issues by Category Analysis - Card Layout with Progress Bars
    const categoryGroups = new Map<string, number>();

    // First, collect all raw functionality and structure data like the original
    const rawCategories = new Map<string, number>();

    issues.forEach((issue) => {
      // Function grouping (like original)
      const functionName = issue.functionality || 'Unknown';
      rawCategories.set(
        functionName,
        (rawCategories.get(functionName) || 0) + 1,
      );

      // Structure grouping (like original)
      const selector = issue.selectors?.[0]?.toLowerCase() || '';
      let structure = 'Other';

      if (
        selector.includes('p') ||
        selector.includes('h') ||
        selector.includes('img') ||
        selector.includes('span')
      ) {
        structure = 'Content';
      } else if (
        selector.includes('a') ||
        selector.includes('nav') ||
        selector.includes('button')
      ) {
        structure = 'Navigation';
      } else if (
        selector.includes('form') ||
        selector.includes('input') ||
        selector.includes('select') ||
        selector.includes('textarea')
      ) {
        structure = 'Forms';
      }

      rawCategories.set(structure, (rawCategories.get(structure) || 0) + 1);
    });

    // Now map the raw categories to our 6 predefined categories
    rawCategories.forEach((count, rawCategory) => {
      const lowerCategory = rawCategory.toLowerCase();
      let mappedCategory = 'Other';

      // Map based on category name
      if (lowerCategory.includes('content') || rawCategory === 'Content') {
        mappedCategory = 'Content';
      } else if (
        lowerCategory.includes('navigation') ||
        rawCategory === 'Navigation' ||
        rawCategory === 'Forms'
      ) {
        mappedCategory = 'Navigation';
      } else if (
        lowerCategory.includes('cognitive') ||
        lowerCategory.includes('brain') ||
        lowerCategory.includes('mental')
      ) {
        mappedCategory = 'Cognitive';
      } else if (
        lowerCategory.includes('vision') ||
        lowerCategory.includes('visual') ||
        lowerCategory.includes('contrast') ||
        lowerCategory.includes('color')
      ) {
        mappedCategory = 'Low Vision';
      } else if (
        lowerCategory.includes('mobility') ||
        lowerCategory.includes('motor') ||
        lowerCategory.includes('keyboard')
      ) {
        mappedCategory = 'Mobility';
      }

      // Add to final category groups
      categoryGroups.set(
        mappedCategory,
        (categoryGroups.get(mappedCategory) || 0) + count,
      );
    });

    // Create category data sorted by count
    const categoryData = Array.from(categoryGroups.entries()).sort((a, b) => {
      // If one is "Other", it should come last
      if (a[0] === 'Other' && b[0] !== 'Other') return 1;
      if (b[0] === 'Other' && a[0] !== 'Other') return -1;
      // Otherwise sort by count in descending order
      return b[1] - a[1];
    });

    let nextY = yStart + 30; // Start right after summary boxes

    if (categoryData.length > 0) {
      // Section header
      doc.setDrawColor(21, 101, 192);
      doc.setLineWidth(0.5);
      doc.line(30, nextY, 180, nextY);

      doc.setFontSize(14);
      doc.setTextColor(21, 101, 192);
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text(translatedIssuesDetectedByCategory, 105, nextY + 8, {
        align: 'center',
      });
      let currentY = nextY + 18;

      // Define category colors to match the display image
      const categoryColors = new Map<string, [number, number, number]>([
        ['Content', [147, 51, 234]], // Purple
        ['Cognitive', [34, 197, 94]], // Green
        ['Low Vision', [249, 115, 22]], // Orange
        ['Navigation', [59, 130, 246]], // Blue
        ['Mobility', [239, 68, 68]], // Red
        ['Other', [107, 114, 128]], // Gray
        ['Forms', [168, 85, 247]], // Different purple shade
      ]);

      // Card layout - 3 columns, 2 rows to match the image exactly
      const itemsPerRow = 3;
      const cardWidth = 58; // Increased width
      const cardHeight = 40; // Increased height
      const cardSpacing = 3; // Reduced spacing
      const startX = 12; // Adjusted start position
      const totalIssues = issues.length;

      // Ensure we have exactly these 6 categories in the right order
      const predefinedCategories = [
        'Content',
        'Cognitive',
        'Low Vision',
        'Navigation',
        'Mobility',
        'Other',
      ];
      const orderedCategoryData: [string, number][] = [];

      // Add categories in the predefined order if they exist
      predefinedCategories.forEach((category) => {
        const found = categoryData.find(([cat]) => cat === category);
        if (found) {
          orderedCategoryData.push(found);
        } else {
          // Add with 0 count if category doesn't exist
          orderedCategoryData.push([category, 0]);
        }
      });

      // Load all SVG icons first
      const iconPromises = orderedCategoryData.map(async ([category]) => {
        return { category, svgIcon: await loadSVGIcon(category) };
      });

      const iconResults = await Promise.all(iconPromises);
      const iconMap = new Map(
        iconResults.map((result) => [result.category, result.svgIcon]),
      );

      orderedCategoryData.forEach(([category, count], index) => {
        const column = index % itemsPerRow;
        const row = Math.floor(index / itemsPerRow);
        const x = startX + column * (cardWidth + cardSpacing);
        const y = currentY + row * (cardHeight + 6);

        // Calculate percentage
        const percentage = totalIssues > 0 ? (count / totalIssues) * 100 : 0;
        const categoryColor = categoryColors.get(category) || [107, 114, 128];

        // Card background - clean white with subtle shadow
        doc.setFillColor(250, 250, 250); // Very light shadow
        doc.roundedRect(x + 0.5, y + 0.5, cardWidth, cardHeight, 2, 2, 'F');

        doc.setFillColor(255, 255, 255); // Clean white background
        doc.setDrawColor(230, 230, 230); // Light border
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

        // Category icon in colored rounded square - top left
        const iconSize = 10;
        const iconX = x + 4;
        const iconY = y + 4;

        // Colored rounded square background for icon
        doc.setFillColor(...categoryColor);
        doc.roundedRect(iconX, iconY, iconSize, iconSize, 2, 2, 'F');

        // Add white icon
        const svgIcon = iconMap.get(category);
        if (svgIcon) {
          // Add the SVG icon in white (smaller)
          const svgSize = iconSize - 4; // Make SVG smaller
          const svgOffset = (iconSize - svgSize) / 2; // Center the smaller SVG
          doc.addImage(
            svgIcon,
            'PNG',
            iconX + svgOffset,
            iconY + svgOffset,
            svgSize,
            svgSize,
          );
        } else {
          // Draw simple white icon shapes
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.4);

          if (category === 'Content') {
            // Simple document icon
            doc.rect(iconX + 2.5, iconY + 2, iconSize - 5, iconSize - 4, 'FD');
            doc.setLineWidth(0.2);
            doc.line(iconX + 3.5, iconY + 4, iconX + 6.5, iconY + 4);
            doc.line(iconX + 3.5, iconY + 5.5, iconX + 6.5, iconY + 5.5);
          } else if (category === 'Cognitive') {
            // Simple brain/puzzle piece
            doc.circle(iconX + iconSize / 2, iconY + iconSize / 2, 2.5, 'FD');
          } else if (category === 'Low Vision') {
            // Simple eye icon
            doc.ellipse(
              iconX + iconSize / 2,
              iconY + iconSize / 2,
              3,
              1.5,
              'FD',
            );
            doc.circle(iconX + iconSize / 2, iconY + iconSize / 2, 1, 'F');
          } else if (category === 'Navigation') {
            // Simple arrow
            doc.setLineWidth(0.6);
            doc.line(iconX + 2, iconY + 6, iconX + 6, iconY + 2);
            doc.line(iconX + 6, iconY + 2, iconX + 5, iconY + 3.5);
            doc.line(iconX + 6, iconY + 2, iconX + 4.5, iconY + 3);
          } else if (category === 'Mobility') {
            // Simple person icon
            doc.circle(iconX + iconSize / 2, iconY + 3, 1, 'F');
            doc.rect(iconX + iconSize / 2 - 0.5, iconY + 4.5, 1, 3, 'F');
          } else {
            // Simple gear/other icon
            doc.circle(iconX + iconSize / 2, iconY + iconSize / 2, 2, 'FD');
          }
        }

        // Category name (below icon, clean)
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('NotoSans_Condensed-Regular');
        const categoryX = x + 4;
        const categoryY = y + 20;
        doc.text(category, categoryX, categoryY);

        // Get category text width to align count with it
        const categoryWidth = doc.getTextWidth(category);

        // Count number (right-aligned with category name in round rect)
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont('NotoSans_Condensed-Regular');
        const countText = count.toString();
        const countWidth = doc.getTextWidth(countText);

        // Round rectangle background for count
        const rectPadding = 3;
        const rectWidth = countWidth + rectPadding * 2;
        const rectHeight = 5.5;
        const rectX = x + cardWidth - rectWidth - 4; // Right-aligned with card
        const rectY = categoryY - rectHeight + 1.5;
        doc.setFillColor(80, 80, 80); // Dark gray for better contrast
        doc.roundedRect(rectX, rectY, rectWidth, rectHeight, 2.5, 2.5, 'F');

        // Count text
        doc.text(countText, rectX + rectPadding, categoryY - 0.5);

        // Progress bar at bottom
        const progressBarWidth = cardWidth - 6;
        const progressBarHeight = 3;
        const progressBarX = x + 3;
        const progressBarY = y + cardHeight - 9;

        // Progress bar background
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(
          progressBarX,
          progressBarY,
          progressBarWidth,
          progressBarHeight,
          1.5,
          1.5,
          'F',
        );

        // Progress bar fill
        const fillWidth = (progressBarWidth * percentage) / 100;
        if (fillWidth > 1) {
          doc.setFillColor(...categoryColor);
          doc.roundedRect(
            progressBarX,
            progressBarY,
            fillWidth,
            progressBarHeight,
            1.5,
            1.5,
            'F',
          );
        }

        // Percentage text
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.setFont('NotoSans_Condensed-Regular');
        doc.text(
          `${percentage.toFixed(1)}% of total issues`,
          x + 3,
          y + cardHeight - 3,
        );
      });

      // Calculate the actual Y position after all cards are drawn
      const totalRows = Math.ceil(orderedCategoryData.length / itemsPerRow);
      nextY = currentY + totalRows * (cardHeight + 6) + 15; // Added more spacing
    }

    // Check if we need a new page for the warning/compliance section
    const pageHeight = doc.internal.pageSize.getHeight();
    const requiredHeight = hasWebAbility ? 70 : 120; // Estimated height needed for warning/compliance section

    if (nextY + requiredHeight > pageHeight - 20) {
      // Add new page if not enough space
      doc.addPage();
      nextY = 20; // Start from top of new page with margin
    }

    // Add status section after category analysis (warning or compliance)
    let warningY = nextY;

    if (hasWebAbility) {
      // Compliance message for sites with WebAbility
      const complianceHeight = 25;
      const complianceWidth = 170;
      const complianceX = 20;

      doc.setFillColor(34, 197, 94); // Green background
      doc.roundedRect(
        complianceX,
        warningY,
        complianceWidth,
        complianceHeight,
        4,
        4,
        'F',
      );

      // Compliance title
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text(translatedAccessibilityComplianceAchieved, 105, warningY + 10, {
        align: 'center',
      });

      // Compliance subtitle
      doc.setFontSize(9);
      doc.text(translatedWebsiteCompliant, 105, warningY + 20, {
        align: 'center',
      });

      warningY += complianceHeight + 4;

      // Single compliance status section
      const statusHeight = 35;
      const statusWidth = 170;
      const statusX = 20;

      doc.setFillColor(240, 253, 244); // Light green background
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.3);
      doc.roundedRect(statusX, warningY, statusWidth, statusHeight, 4, 4, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(34, 197, 94);
      doc.text(translatedComplianceStatus, statusX + 2, warningY + 8);

      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      doc.text(translatedWebAbilityProtecting, statusX + 2, warningY + 18);
      doc.text(translatedAutomatedFixesApplied, statusX + 2, warningY + 26);
    } else {
      // Warning section for non-compliant sites
      const warningHeight = 25;
      const warningWidth = 170;
      const warningX = 20;

      doc.setFillColor(220, 38, 38); // Red background
      doc.roundedRect(
        warningX,
        warningY,
        warningWidth,
        warningHeight,
        4,
        4,
        'F',
      );

      // Warning title
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text(translatedCriticalViolationsDetected, 105, warningY + 10, {
        align: 'center',
      });

      // Warning subtitle
      doc.setFontSize(9);
      doc.text(translatedLegalActionWarning, 105, warningY + 20, {
        align: 'center',
      });

      warningY += warningHeight + 4;

      // Two side-by-side consequence sections
      const consequencesHeight = 45;
      const boxWidth = 82; // Width for each box
      const boxSpacing = 6; // Space between boxes
      const leftBoxX = 20;
      const rightBoxX = leftBoxX + boxWidth + boxSpacing;

      // Left box - IMMEDIATE RISKS
      doc.setFillColor(254, 242, 242); // Light red background
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.3);
      doc.roundedRect(
        leftBoxX,
        warningY,
        boxWidth,
        consequencesHeight,
        4,
        4,
        'FD',
      );

      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      doc.text(translatedImmediateRisks, leftBoxX + 2, warningY + 8);

      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      doc.text(translatedPotentialLawsuits, leftBoxX + 2, warningY + 16);
      doc.text(translatedCustomerLoss, leftBoxX + 2, warningY + 24);
      doc.text(translatedSeoPenalties, leftBoxX + 2, warningY + 32);
      doc.text(translatedBrandDamage, leftBoxX + 2, warningY + 40);

      // Right box - TIME-SENSITIVE ACTION
      doc.setFillColor(255, 247, 237); // Light orange background
      doc.setDrawColor(202, 138, 4);
      doc.setLineWidth(0.3);
      doc.roundedRect(
        rightBoxX,
        warningY,
        boxWidth,
        consequencesHeight,
        4,
        4,
        'FD',
      );

      doc.setFontSize(9);
      doc.setTextColor(202, 138, 4);
      doc.text(translatedTimeSensitiveAction, rightBoxX + 2, warningY + 8);

      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      doc.text(translatedWebAbilityAutoFix, rightBoxX + 2, warningY + 18);
      doc.text(translatedInstantCompliance, rightBoxX + 2, warningY + 26);
      doc.text(translatedProtectBusiness, rightBoxX + 2, warningY + 34);
    }

    // Update warningY position after warning section is complete
    if (!hasWebAbility) {
      // For non-compliant sites, update position after the consequence boxes
      warningY += 45 + 10; // consequence box height + spacing
    } else {
      // For compliant sites, update position after the status section
      warningY += 35 + 10; // status section height + spacing
    }

    // Check if we need a new page for WCAG section
    const wcagSectionHeight = 100; // Estimated height needed for WCAG header and initial content
    const currentPageHeight = doc.internal.pageSize.getHeight();
    const footerSpace = 20;

    let wcagStartY = warningY;
    let needsNewPage = false;

    if (warningY + wcagSectionHeight > currentPageHeight - footerSpace) {
      // Add new page if not enough space
      needsNewPage = true;
      doc.addPage();
      wcagStartY = 30; // Start from top of new page
    } else {
      // Add some spacing between sections on same page
      wcagStartY = warningY + 15;
    }

    // Add footer to previous page(s) before continuing
    if (accessibilityStatementLinkUrl) {
      const totalPages = (doc as any).internal.getNumberOfPages();
      const footerY = currentPageHeight - 10;

      // Add footer to all pages up to current point
      for (let i = 1; i <= (needsNewPage ? totalPages - 1 : totalPages); i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(33, 150, 243);
        doc.text(translatedAccessibilityStatement, 15, footerY);
        doc.link(
          15,
          footerY - 3,
          doc.getTextWidth(translatedAccessibilityStatement),
          4,
          {
            url: accessibilityStatementLinkUrl,
            target: '_blank',
          },
        );
      }

      // Return to current page
      if (needsNewPage) {
        doc.setPage(totalPages);
      }
    }

    // WCAG 2.1 AA Compliance Issues Section
    const wcagIssues = issues.filter(issue => {
      const wcagCode = issue.wcag_code || '';
      const code = issue.code || '';
      const message = issue.message || '';
      const description = issue.description || '';
      return wcagCode.includes('WCAG') || code.includes('WCAG2AA') || message.includes('WCAG2AA') || description.includes('WCAG2AA');
    });

    // Function to parse WCAG codes and truncate at Guideline level
    const parseWcagCode = (wcagCode: string, fallbackCode: string): string => {
      // First try to use wcag_code if available
      if (wcagCode) {
        // Clean up the wcag_code format
        let result = wcagCode.trim();
        
        // If it's in format "WCAG AA 2.2 Criteria 1.4.3", extract the criteria part
        if (result.includes('Criteria')) {
          const criteriaMatch = result.match(/Criteria\s+(\d+\.\d+\.\d+)/);
          if (criteriaMatch) {
            return `WCAG2AA.${criteriaMatch[1]}`;
          }
        }
        
        // If it's already in a good format, return as is
        if (result.includes('WCAG')) {
          return result;
        }
      }
      
      // Fallback to parsing the original code field
      if (!fallbackCode) return wcagCode || '';
      
      // Extract WCAG2AA, Principle, and Guideline parts only
      const parts = fallbackCode.split('.');
      let result = '';
      let wcagFound = false;
      let principleFound = false;

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'WCAG2AA') {
          // Found WCAG2AA, start building result
          result = parts[i];
          wcagFound = true;
        } else if (wcagFound && parts[i].startsWith('Principle')) {
          // Found Principle after WCAG2AA, add it
          result += '.' + parts[i];
          principleFound = true;
        } else if (principleFound && parts[i].startsWith('Guideline')) {
          // Found Guideline after Principle, add it and stop here
          result += '.' + parts[i];
          break;
        }
      }

      // If no WCAG2AA, Principle, or Guideline found, return the original code up to the first comma
      if (!result) {
        result = fallbackCode.split(',')[0];
      }

      // Clean up and format the result
      return result
        .replace('Principle', 'Principle ')
        .replace('Guideline', 'Guideline ')
        .replace(/_/g, '.');
    };

    // Parse all codes and group by truncated version, keeping track of messages
    const codeGroupsWithMessages: {[key: string]: {count: number, messages: string[]}} = {};
    
    wcagIssues.forEach(issue => {
      const parsedCode = parseWcagCode(issue.wcag_code || '', issue.code || '');
      if (parsedCode) {
        if (!codeGroupsWithMessages[parsedCode]) {
          codeGroupsWithMessages[parsedCode] = { count: 0, messages: [] };
        }
        codeGroupsWithMessages[parsedCode].count += 1;
        // Store unique messages for this code
        const message = issue.message || '';
        if (
          message &&
          !codeGroupsWithMessages[parsedCode].messages.includes(message)
        ) {
          codeGroupsWithMessages[parsedCode].messages.push(message);
        }
      }
    });

    // Convert to array for display with sample message
    const groupedWcagCodes = Object.entries(codeGroupsWithMessages).map(
      ([code, data]) => ({
        code,
        count: data.count,
        message: data.messages[0] || '', // Use first message as sample
      }),
    );

    if (groupedWcagCodes.length > 0) {
      let currentY = wcagStartY; // Use calculated start position

      // Create card data with compliance check based on WCAG codes
      const wcagCardData = groupedWcagCodes.map(
        (codeGroup: { code: string; count: number; message: string }) => {
          const isFixedByWebability = isCodeCompliant(codeGroup.code);
          return {
            code: codeGroup.code,
            count: codeGroup.count,
            message: codeGroup.message,
            status: isFixedByWebability ? 'FIXED' : 'NA_FIX',
          };
        },
      );

      // Calculate total height needed for the big container card
      const totalRows = Math.ceil(wcagCardData.length / 3);
      const cardsHeight = totalRows * (14 + 3); // card height + spacing
      const containerHeight = 10 + cardsHeight + 24; // ultra compact blue banner, stats, and bottom padding

      // 3D effect shadow
      doc.setFillColor(220, 220, 220); // Light gray shadow
      doc.roundedRect(12, currentY - 6, 190, containerHeight, 3, 3, 'F');

      // Big container card background
      doc.setFillColor(255, 255, 255); // White background
      doc.setDrawColor(203, 213, 225); // Light border
      doc.setLineWidth(0.5);
      doc.roundedRect(10, currentY - 6, 190, containerHeight, 3, 3, 'FD');

      // Blue banner header section (full width of container) - ultra compact height
      doc.setFillColor(26, 92, 255);
      doc.roundedRect(10, currentY - 6, 190, 20, 3, 3, 'F'); // Ultra compact blue section

      // Cover bottom corners of blue section to make it rectangular at bottom
      doc.setFillColor(26, 92, 255);
      doc.rect(10, currentY + 11, 190, 3, 'F');

      // Load shield SVG icon
      let shieldIconDataUrl: string | null = null;
      try {
        const response = await fetch('/images/report_icons/shield.svg');
        if (response.ok) {
          const svgText = await response.text();

          // Convert SVG to high-resolution PNG using canvas
          shieldIconDataUrl = await new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            // Use high resolution for crisp icons
            const size = 256;
            canvas.width = size;
            canvas.height = size;

            img.onload = () => {
              if (ctx) {
                // Enable smooth scaling for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Clear canvas and draw the SVG at high resolution
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convert to high-quality PNG data URL
                const pngDataUrl = canvas.toDataURL('image/png', 1.0);
                resolve(pngDataUrl);
              } else {
                resolve(null);
              }
            };

            img.onerror = () => {
              resolve(null);
            };

            // Create data URL from SVG
            const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
            img.src = svgDataUrl;
          });
        }
      } catch (error) {
        console.warn('Failed to load shield SVG icon:', error);
      }

      // Left-aligned text with shield icon
      doc.setFontSize(13); // Slightly smaller font for compact banner
      doc.setTextColor(255, 255, 255);
      doc.setFont('NotoSans_Condensed-Regular');

      const textStartX = 15; // Reduced left margin
      let currentTextX = textStartX;
      currentY = currentY + 3;
      // Add shield icon if loaded
      if (shieldIconDataUrl) {
        const iconSize = 4; // Small icon size
        const iconY = currentY - 3; // Align icon with first line text baseline
        doc.addImage(
          shieldIconDataUrl,
          'PNG',
          currentTextX,
          iconY,
          iconSize,
          iconSize,
        );
        currentTextX += iconSize + 2; // Small spacing after icon
      }

      // First line - WCAG compliance title
      doc.text(
        `${translatedWcagComplianceIssues} ${url}`,
        currentTextX,
        currentY + 1,
        { align: 'left' },
      );

      // Second line - Critical compliance message
      doc.setFontSize(9); // Smaller font for subtitle
      doc.setTextColor(255, 255, 255);
      doc.text(translatedCriticalComplianceGaps, textStartX, currentY + 6, {
        align: 'left',
      });

      currentY += 22; // Adjusted for ultra compact banner

      // Summary stats at the top
      const fixedCount = wcagCardData.filter(
        (item: {
          code: string;
          count: number;
          message: string;
          status: string;
        }) => item.status === 'FIXED',
      ).length;
      const manualCount = wcagCardData.filter(
        (item: {
          code: string;
          count: number;
          message: string;
          status: string;
        }) => item.status === 'NA_FIX',
      ).length;

      // Compact stats cards - centered within the big container
      const statsY = currentY;
      const cardWidth = 70;
      const cardHeight = 18;
      const cardSpacing = 8;
      // Center the two cards within the big container (190 width, starting at x=10)
      const containerWidth = 190;
      const totalWidth = cardWidth * 2 + cardSpacing;
      const statsStartX = 10 + (containerWidth - totalWidth) / 2; // Center within container
      const leftCardX = statsStartX;
      const rightCardX = leftCardX + cardWidth + cardSpacing;

      // Issues grid layout - 3 columns with natural flow
      const issueCardWidth = 55; // Card width
      const issueCardHeight = 14; // Card height
      const issueCardSpacing = 5;
      const itemsPerRow = 3;
      // Center the grid within the container
      const gridWidth = issueCardWidth * 3 + issueCardSpacing * 2;
      const cardsStartX = 10 + (190 - gridWidth) / 2; // Center within big container
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageMargin = 15; // Reduced margin to fit 27 cards (9 rows × 3 cards)
      let pageRowCount = 0; // Track rows on current page

      // Load eye SVG icon once for reuse
      let eyeIconDataUrl: string | null = null;
      try {
        // console.log('Loading eye SVG icon...');
        const response = await fetch('/images/report_icons/eye.svg');
        //console.log('Eye SVG response status:', response.status);
        if (response.ok) {
          const svgText = await response.text();
          //console.log('Eye SVG content loaded, length:', svgText.length);
          
          // Convert SVG to high-resolution PNG using canvas
          eyeIconDataUrl = await new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            // Use high resolution for crisp icons (256x256)
            const size = 256;
            canvas.width = size;
            canvas.height = size;

            img.onload = () => {
           //   console.log('Eye SVG image loaded successfully');
              if (ctx) {
                // Enable smooth scaling for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Clear canvas and draw the SVG at high resolution
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convert to high-quality PNG data URL
                const pngDataUrl = canvas.toDataURL('image/png', 1.0);
                // console.log('Eye icon converted to PNG data URL');
                resolve(pngDataUrl);
              } else {
                console.warn('Canvas context not available for eye icon');
                resolve(null);
              }
            };

            img.onerror = (error) => {
              console.error('Failed to load eye SVG image:', error);
              resolve(null);
            };

            // Create data URL from SVG
            const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
            img.src = svgDataUrl;
          });
        } else {
          console.error('Failed to fetch eye SVG, status:', response.status);
        }
      } catch (error) {
        console.error('Failed to load eye SVG icon:', error);
      }
      
     // console.log('Eye icon data URL result:', eyeIconDataUrl ? 'Loaded' : 'Failed');

      wcagCardData.forEach(
        (
          item: {
            code: string;
            count: number;
            message: string;
            status: string;
          },
          index: number,
        ) => {
          const column = index % itemsPerRow;
          const row = pageRowCount; // Use page-relative row count
          const x = cardsStartX + column * (issueCardWidth + issueCardSpacing);
          const y = currentY + row * (issueCardHeight + 3); // Reduced row spacing for compact layout

          // Check if we need a new page (only at start of a new row)
          if (column === 0 && y + issueCardHeight > pageHeight - pageMargin) {
            doc.addPage();
            currentY = 15; // Reduced top margin for continuation pages
            pageRowCount = 0; // Reset row count for new page
          }

          // Recalculate y position with current page row count
          const cardY = currentY + pageRowCount * (issueCardHeight + 3); // Reduced row spacing for compact layout

          // 3D shadow for individual cards
          doc.setFillColor(220, 220, 220);
          doc.roundedRect(
            x + 1,
            cardY + 1,
            issueCardWidth,
            issueCardHeight,
            2,
            2,
            'F',
          );

          // Card background based on status and hasWebAbility
          if (item.status === 'FIXED') {
            if (hasWebAbility) {
              doc.setFillColor(240, 253, 244); // Very light green
              doc.setDrawColor(34, 197, 94);
            } else {
              doc.setFillColor(255, 248, 225); // Very light yellow
              doc.setDrawColor(202, 138, 4);
            }
          } else {
            doc.setFillColor(254, 242, 242); // Very light red
            doc.setDrawColor(239, 68, 68);
          }

          doc.setLineWidth(0.2);
          doc.roundedRect(
            x,
            cardY,
            issueCardWidth,
            issueCardHeight,
            2,
            2,
            'FD',
          );

          // Count badge on left side, aligned with code - very small
          const countBadgeHeight = 3; // Slightly larger for better centering
          const countBadgeWidth = 3; // Keep width
          const countBadgeX = x + 3; // Left position
          const countBadgeY = cardY + 3; // Fixed position for better alignment with code text

          // Count background rounded rectangle - color based on status and hasWebAbility
          if (item.status === 'FIXED') {
            if (hasWebAbility) {
              doc.setFillColor(34, 197, 94); // Green background for fixed issues
            } else {
              doc.setFillColor(202, 138, 4); // Yellow background for can be fixed issues
            }
          } else {
            doc.setFillColor(239, 68, 68); // Red background for issues needing action
          }
          // Draw a perfect round circle as the count badge (not a rounded rectangle)
          const countBadgeCircleRadius =
            Math.max(countBadgeWidth, countBadgeHeight) / 2;
          const countBadgeCircleX = countBadgeX + countBadgeWidth / 2;
          const countBadgeCircleY = countBadgeY + countBadgeHeight / 2;
          doc.circle(
            countBadgeCircleX,
            countBadgeCircleY,
            countBadgeCircleRadius,
            'F',
          );

          // Count text - properly centered in badge
          doc.setFontSize(5); // Smaller font for better centering in small badge
          doc.setTextColor(255, 255, 255);
          doc.setFont('NotoSans_Condensed-Regular');
          // Use the exact center coordinates with no offset for perfect centering
          doc.text(
            item.count.toString(),
            countBadgeCircleX,
            countBadgeCircleY + 0.6,
            { align: 'center' },
          );

        // Status icon in top right corner - very small
        const iconX = x + issueCardWidth - 5; // Move a bit left from the right edge
        const iconY = cardY + 4; // Moved down slightly
        
        if (item.status === 'FIXED') {
          if (hasWebAbility) {
            // Green checkmark (very small)
            doc.setFillColor(34, 197, 94);
            doc.setDrawColor(22, 163, 74);
            doc.setLineWidth(0.2);
            doc.circle(iconX, iconY, 1.5, 'FD'); // Reduced from 2.5 to 1.5
            
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.4); // Reduced line width
            doc.line(iconX - 0.7, iconY - 0.2, iconX - 0.2, iconY + 0.5);
            doc.line(iconX - 0.3, iconY + 0.6, iconX + 0.9, iconY - 0.6);
          } else {
            // Eye icon for can be fixed with WebAbility (very small)
            if (eyeIconDataUrl) {
             // console.log('Adding eye icon to PDF at position:', iconX, iconY);
              // Very small eye icon in top right corner
              const iconSize = 4; // Reduced from 7 to 4
              const iconOffsetX = -iconSize/2; // Center horizontally
              const iconOffsetY = -iconSize/2; // Center vertically
              doc.addImage(eyeIconDataUrl, 'PNG', iconX + iconOffsetX, iconY + iconOffsetY, iconSize, iconSize);
            } else {
            //  console.log('Eye icon not available, using yellow circle fallback');
              // Fallback to yellow circle if eye icon failed to load (very small)
              doc.setFillColor(202, 138, 4);
              doc.setDrawColor(161, 98, 7);
              doc.setLineWidth(0.2);
              doc.circle(iconX, iconY, 1.5, 'FD'); // Reduced from 2.5 to 1.5
            }
          }
        } else {
          // Red X (very small)
          doc.setFillColor(239, 68, 68);
          doc.setDrawColor(220, 38, 38);
          doc.setLineWidth(0.2);
          doc.circle(iconX, iconY, 1.5, 'FD'); // Reduced from 2.5 to 1.5
          
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.4); // Reduced line width
          doc.line(iconX - 0.6, iconY - 0.6, iconX + 0.6, iconY + 0.6);
          doc.line(iconX - 0.6, iconY + 0.6, iconX + 0.6, iconY - 0.6);
        }
        
        // Issue code text as heading (smaller and truncated, positioned after count badge)
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0); // Darker color for heading
        doc.setFont('NotoSans_Condensed-Regular');
        
        // Truncate code to fit in card (leaving space for count badge and status icon)
        const maxWidth = issueCardWidth - 15; // Adjusted for very small count badge and status icon
        let displayCode = item.code;
        if (doc.getTextWidth(displayCode) > maxWidth) {
          // Truncate and add ellipsis
          while (doc.getTextWidth(displayCode + '...') > maxWidth && displayCode.length > 10) {
            displayCode = displayCode.slice(0, -1);
          }
          displayCode += '...';
        }
        
        // Position code heading aligned with count badge
        const textX = countBadgeX + countBadgeWidth + 1.5; // Position after count badge with proper spacing
        const codeY = countBadgeCircleY + 0.6; // Aligned exactly with count badge center/text
        doc.text(displayCode, textX, codeY);
        
        // Message description (7-10 words, smaller font)
        if (item.message) {
          doc.setFontSize(7);
          doc.setTextColor(0, 0, 0); // Same color as WCAG code heading
          doc.setFont('NotoSans_Condensed-Regular');
          
          // Truncate message to 7-10 words
          const words = item.message.split(' ');
          let messageText = words.slice(0, Math.min(10, words.length)).join(' ');
          if (words.length > 10) {
            messageText += '...';
          }
          
          // Further truncate if still too wide
          if (doc.getTextWidth(messageText) > maxWidth) {
            while (doc.getTextWidth(messageText + '...') > maxWidth && messageText.length > 20) {
              messageText = messageText.slice(0, -1);
            }
            if (!messageText.endsWith('...')) {
              messageText += '...';
            }
          }
          
          const messageY = codeY + 4; // Moved down slightly for better spacing
          const messageX = countBadgeX; // Align message with count badge (start under count badge)
          doc.text(messageText, messageX, messageY);
        }
        
        // Increment row count when we complete a row (at the last column)
        if (column === itemsPerRow - 1) {
          pageRowCount++;
        }
      });
      
      // Update currentY to the final position - add some padding for the container
      currentY =
        currentY +
        (pageRowCount + (wcagCardData.length % itemsPerRow > 0 ? 1 : 0)) *
          (issueCardHeight + 3) +
        25; // Extra padding for big container
    }

    // --- END CUSTOM TABLE LAYOUT ---
    // Add footer to any remaining pages (WCAG section pages)
    if (accessibilityStatementLinkUrl) {
      const totalPages = (doc as any).internal.getNumberOfPages();
      const footerY = doc.internal.pageSize.getHeight() - 10;

      // Start from the WCAG section pages (skip already handled pages)
      const startPageForWcagFooters = needsNewPage ? totalPages : 1;

      for (let i = startPageForWcagFooters; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(33, 150, 243); // normal blue
        doc.text(translatedAccessibilityStatement, 15, footerY);
        doc.link(
          15,
          footerY - 3,
          doc.getTextWidth(translatedAccessibilityStatement),
          4,
          {
            url: accessibilityStatementLinkUrl,
            target: '_blank',
          },
        );
      }
    }

    return doc.output('blob');
  };

  // Handle short report download
  const handleShortReportDownload = async () => {
    setIsDownloading(true);
    try {
      const pdfBlob = await generateShortPDF(results, currentLanguage);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'accessibility-short-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Short report downloaded!');
    } catch (error) {
      toast.error('Failed to generate the short report. Please try again.');
      console.error('Short PDF generation error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div
        className={`${bgColor} rounded-lg shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center min-h-[120px]`}
      >
        <div className="flex flex-col items-start p-4 w-full md:w-auto">
          <div className="bg-white/70 p-2 rounded-full mr-0 mb-3 md:mr-4 md:mb-0">
            {icon}
          </div>
          <div>
            <h3 className={`text-xl font-semibold ${textColor}`}>{status}</h3>
            <p className={`${textColor}/80`}>{message}</p>
          </div>
          {/* Mobile controls below text */}
          <div className="block md:hidden w-full">
            <div className="w-full flex flex-col gap-3 pt-4">
              <button
                onClick={handleDownloadSubmit}
                className="whitespace-nowrap w-full px-6 py-3 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isDownloading}
              >
                <span className="flex justify-center items-center w-full">
                  {isDownloading ? (
                    <CircularProgress size={22} sx={{ color: 'white' }} />
                  ) : (
                    'Get Free Report'
                  )}
                </span>
              </button>
              <button
                onClick={handleShortReportDownload}
                className="whitespace-nowrap w-full px-6 py-3 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isDownloading}
              >
                <span className="flex justify-center items-center w-full">
                  {isDownloading ? (
                    <CircularProgress size={22} sx={{ color: 'white' }} />
                  ) : (
                    'Prospect report'
                  )}
                </span>
              </button>
              <div className="relative w-full">
                <select
                  value={currentLanguage}
                  onChange={(e) => setCurrentLanguage(e.target.value)}
                  className="appearance-none w-full bg-white border border-gray-300 rounded-lg px-6 py-3 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
                >
                  <option value="en">English</option>
                  {Object.values(LANGUAGES).map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.nativeName}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Desktop controls to the right */}
        <div className="hidden md:flex relative mr-0 md:mr-4 flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 w-full md:w-auto pt-4 md:pt-0">
          <button
            onClick={handleDownloadSubmit}
            className="whitespace-nowrap w-full md:w-auto px-6 py-3 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isDownloading}
          >
            <span className="flex justify-center items-center w-full">
              {isDownloading ? (
                <CircularProgress size={22} sx={{ color: 'white' }} />
              ) : (
                'Get Detailed Report'
              )}
            </span>
          </button>
          <button
            onClick={handleShortReportDownload}
            className="whitespace-nowrap w-full md:w-auto px-6 py-3 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isDownloading}
          >
            <span className="flex justify-center items-center w-full">
              {isDownloading ? (
                <CircularProgress size={22} sx={{ color: 'white' }} />
              ) : (
                'Prospect report'
              )}
            </span>
          </button>
          <div className="relative w-full md:w-auto">
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
              className="appearance-none w-full md:w-auto bg-white border border-gray-300 rounded-lg px-6 py-3 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
            >
              <option value="en">English</option>
              {Object.values(LANGUAGES).map((language) => (
                <option key={language.code} value={language.code}>
                  {language.nativeName}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper function to get issue category icon
function getIssueTypeIcon(issue: {
  message: any;
  help?: any;
  context?: string | any[];
  code?:
    | boolean
    | React.ReactChild
    | React.ReactFragment
    | React.ReactPortal
    | Iterable<ReactI18NextChild>
    | null
    | undefined;
  impact?: string;
  category?:
    | boolean
    | React.ReactChild
    | React.ReactFragment
    | React.ReactPortal
    | Iterable<ReactI18NextChild>
    | null
    | undefined;
  source?:
    | boolean
    | React.ReactChild
    | React.ReactFragment
    | React.ReactPortal
    | Iterable<ReactI18NextChild>
    | null
    | undefined;
  description?: any;
  selectors?: string | any[];
  recommended_action?:
    | boolean
    | React.ReactChild
    | React.ReactFragment
    | React.ReactPortal
    | Iterable<ReactI18NextChild>
    | null
    | undefined;
  wcag_code?: string;
}) {
  const message = issue.message?.toLowerCase() || '';

  if (message.includes('image') || message.includes('alt')) {
    return <ImageIcon className="w-5 h-5" />;
  } else if (message.includes('color') || message.includes('contrast')) {
    return <Droplet className="w-5 h-5" />;
  } else if (message.includes('keyboard') || message.includes('focus')) {
    return <Keyboard className="w-5 h-5" />;
  } else if (message.includes('aria') || message.includes('role')) {
    return <Code className="w-5 h-5" />;
  }

  return <FileText className="w-5 h-5" />;
}

// Add this new type for issue filtering
const ISSUE_FILTERS = {
  ALL: 'all',
  CRITICAL: 'critical',
  WARNING: 'serious',
  MODERATE: 'moderate',
};

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

  // Try the axe structure
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

  return issues;
}

function countIssuesBySeverity(issues: any[]) {
  const counts = {
    criticalIssues: 0,
    warnings: 0,
    moderateIssues: 0,
    totalIssues: issues.length,
  };
  issues.forEach((issue) => {
    if (issue.impact === 'critical') counts.criticalIssues++;
    else if (issue.impact === 'serious') counts.warnings++;
    else counts.moderateIssues++;
  });
  return counts;
}

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
    lowerMsg.includes('aria attributes') ||
    lowerMsg.includes('permitted aria') ||
    lowerMsg.includes('labels or instructions') ||
    lowerMsg.includes('error identification')
  ) {
    return 'serious';
  }

  return 'moderate';
}

export default ReportView;2
