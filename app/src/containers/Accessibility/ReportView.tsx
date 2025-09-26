import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useLocation, useHistory } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLazyQuery, useQuery } from '@apollo/client';
import greenSuccessImage from '@/assets/images/green_success.png';
import messageIconImage from '@/assets/images/message_icon.png';
import criticalIconImage from '@/assets/images/critical_icon.png';
import moderateIconImage from '@/assets/images/moderate_icon.png';
import mildIconImage from '@/assets/images/mild_icon.png';
import oneIssuesIconImage from '@/assets/images/1_issues_icon.png';
import twoIssuesIconImage from '@/assets/images/2_issues_icon.png';
import threeIssuesIconImage from '@/assets/images/3_issues_icon.png';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';
import { generatePDF } from '@/utils/generatePDF';
import {
  translateText,
  translateMultipleTexts,
  deduplicateIssuesByMessage,
  LANGUAGES,
  CURATED_WCAG_CODES,
  isCodeCompliant,
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
import autoTable, { __createTable, __drawTable } from 'jspdf-autotable';
import { ReactI18NextChild } from 'react-i18next';
import { toast } from 'sonner';
import TechStack from './TechStack';
import { CircularProgress } from '@mui/material';
import GET_PROFILE from '@/queries/auth/getProfile';
import getWidgetSettings from '@/utils/getWidgetSettings';
import { FloatingChatbot } from './FloatingChatbot'; // Adjust path as needed

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
  } = useQuery(GET_PROFILE);

  // Processing state management
  const [isProcessing, setIsProcessing] = useState(true);
  // Fact rotation state
  const [factIndex, setFactIndex] = useState(0);
  const [chatbotReady, setChatbotReady] = useState(false);

  // Add this useEffect to check if chatbot is ready
  useEffect(() => {
    // Check every 500ms if the global function is available
    const checkInterval = setInterval(() => {
      if (typeof window.submitAccessibilityIssue === 'function') {
        setChatbotReady(true);
        clearInterval(checkInterval);
      }
    }, 500);

    // Clean up the interval
    return () => clearInterval(checkInterval);
  }, []);

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

  // Use extractIssuesFromReport to get issues with wcag_code
  const issues = extractIssuesFromReport(report);

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
      {/* Add chatbot ready indicator */}
      {!chatbotReady && (
        <div className="fixed bottom-5 left-5 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded z-10">
          AI Assistant initializing...
        </div>
      )}
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
                      pages_affected?: string[];
                    },
                    index: React.Key | null | undefined,
                  ) => (
                    <div
                      key={index}
                      className="border rounded-lg bg-white p-4 sm:p-5 shadow-sm flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col xl:flex-row xl:items-center gap-2 flex-1 pr-2 sm:pr-4 overflow-hidden">
                          <div className="flex items-center gap-2">
                            {getIssueTypeIcon(issue)}
                            <h2 className="text-base sm:text-lg font-semibold truncate">
                              {issue.message ||
                                issue.help ||
                                'Accessibility Issue'}
                            </h2>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0">
                            {issue.wcag_code &&
                              isCodeCompliant(issue.wcag_code) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full w-fit flex-shrink-0">
                                  <CheckCircle className="w-3 h-3" />
                                  Fixed by WebAbility
                                </span>
                              )}
                          </div>
                        </div>
                        {/* Desktop buttons - shown on desktop only */}
                        <div className="hidden md:flex flex-shrink-0 gap-3">
                          {/* View Evidence Button */}
                          {issue.screenshotUrl && (
                            <button
                              type="button"
                              className="view-affected-element-button"
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
                              <Eye className="w-4 h-4" />
                              View Affected Element
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const issueDetails = `I need help fixing this accessibility issue:

Issue: ${issue.message || issue.help || 'Accessibility Issue'}
Element: ${
                                Array.isArray(issue.context)
                                  ? issue.context[0]
                                  : issue.context || 'Unknown element'
                              }
WCAG: ${issue.code || issue.message || 'N/A'}`;

                              if (
                                typeof window.submitAccessibilityIssue ===
                                'function'
                              ) {
                                window.submitAccessibilityIssue(issueDetails);
                              } else {
                                toast.error(
                                  'AI assistant is initializing. Please try again.',
                                );
                              }
                            }}
                            className="fix-with-ai-button"
                          >
                            <Sparkles className="w-4 h-4" />
                            Fix with AI
                          </button>
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
                            <p className="text-gray-600 text-xs sm:text-base break-words whitespace-pre-wrap overflow-hidden">
                              {issue.recommended_action}
                            </p>
                          </div>
                        )}

                        {issue.pages_affected &&
                          issue.pages_affected.length > 0 && (
                            <div>
                              <h3 className="text-xs sm:text-sm font-semibold mb-2">
                                Affected Pages
                              </h3>
                              <div className="space-y-2">
                                {issue.pages_affected.map((page, pageIndex) => (
                                  <a
                                    key={pageIndex}
                                    href={page}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block bg-gray-50 p-2 sm:p-3 rounded text-xs overflow-x-auto border border-gray-element text-blue-600 hover:text-blue-800 hover:bg-gray-100 transition-colors duration-200 font-mono break-all"
                                  >
                                    {page}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Mobile buttons - shown only on mobile at the bottom */}
                      <div className="flex flex-col md:hidden gap-3 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            const issueDetails = `I need help fixing this accessibility issue:

Issue: ${issue.message || issue.help || 'Accessibility Issue'}
Element: ${
                              Array.isArray(issue.context)
                                ? issue.context[0]
                                : issue.context || 'Unknown element'
                            }
WCAG: ${issue.code || issue.message || 'N/A'}`;

                            if (
                              typeof window.submitAccessibilityIssue ===
                              'function'
                            ) {
                              window.submitAccessibilityIssue(issueDetails);
                            } else {
                              toast.error(
                                'AI assistant is initializing. Please try again.',
                              );
                            }
                          }}
                          className="fix-with-ai-button"
                        >
                          <Sparkles className="w-4 h-4" />
                          Fix with AI
                        </button>
                        {/* View Evidence Button */}
                        {issue.screenshotUrl && (
                          <button
                            type="button"
                            className="view-affected-element-button"
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
                            <Eye className="w-4 h-4" />
                            View Affected Element
                          </button>
                        )}
                      </div>
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
      <FloatingChatbot
        scanResults={{ ...report, url: fullUrl }}
        onScanStart={() => {}} // Not needed in report view
        onScanComplete={() => {}} // Not needed in report view
        isScanning={false}
      />
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
      const pdfBlob = await generatePDF(results, currentLanguage, fullUrl);
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
  const getImpactIcon = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'critical':
        return criticalIconImage;
      case 'moderate':
        return moderateIconImage;
      case 'mild':
        return mildIconImage;
      default:
        return mildIconImage; // default fallback
    }
  };

  // Helper function to get issue count icon based on issue impact
  const getIssueCountIcon = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'critical':
        return oneIssuesIconImage;
      case 'moderate':
        return twoIssuesIconImage;
      case 'mild':
        return threeIssuesIconImage;
      default:
        return oneIssuesIconImage; // default fallback
    }
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

    // Debug: Log the issues count to verify it's showing actual errors

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
        'Your website is partially accessible.\nSome improvements are needed.';
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

    // Set background color for all pages
    const backgroundColor: [number, number, number] = [255, 255, 255]; // White background
    doc.setFillColor(
      backgroundColor[0],
      backgroundColor[1],
      backgroundColor[2],
    );
    doc.rect(
      0,
      0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      'F',
    );

    // Remove old dark header bar; design now uses a clean light background

    // Helper function to add page with background color
    const addPageWithBackground = (
      doc: any,
      backgroundColor: [number, number, number],
    ) => {
      doc.addPage();
      doc.setFillColor(
        backgroundColor[0],
        backgroundColor[1],
        backgroundColor[2],
      );
      doc.rect(
        0,
        0,
        doc.internal.pageSize.getWidth(),
        doc.internal.pageSize.getHeight(),
        'F',
      );
    };

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

        // Logo position - top left corner with minimal padding
        const logoPadding = 8; // Reduced padding from top and left edges
        const logoX = logoPadding;
        const logoY = logoPadding;

        // Add logo image directly without white container
        doc.addImage(img, 'PNG', logoX, logoY, drawWidth, drawHeight);

        if (logoUrl) {
          doc.link(logoX, logoY, drawWidth, drawHeight, {
            url: logoUrl,
            target: '_blank',
          });
        }

        logoBottomY = logoY + drawHeight;
      }
    }

    // --- HEADER AREA (Figma-aligned) ---
    const pageWidth = doc.internal.pageSize.getWidth();
    // Adjust header position to align with logo row
    const headerTopY = Math.max(logoBottomY || 0, 30) + 5; // Ensure minimum spacing from top

    // Date and scanned URL text positioned at top right corner of the page
    const scannedHost = (() => {
      try {
        return new URL(reportData.url).hostname || reportData.url;
      } catch {
        return reportData.url;
      }
    })();
    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(9);
    // Set date color to #A2ADF3
    doc.setTextColor(162, 173, 243);
    const formattedDate = new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
    // Position at top right corner with reduced padding (moved further right)
    const topRightPadding = 12; // Reduced padding to move further right
    const topRightY = 10; // Fixed position from top
    doc.text(`${formattedDate}`, pageWidth - topRightPadding, topRightY, {
      align: 'right',
    });
    // Reset color for scanner info
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${translatedLabel}${scannedHost}`,
      pageWidth - topRightPadding,
      topRightY + 6,
      {
        align: 'right',
      },
    );

    // Compliance status - positioned directly under the WebAbility logo
    const cardX = 8; // Align with logo left edge (logoPadding)
    const cardY = (logoBottomY || 0) + 14; // Moved down to position entire section lower

    // Circular progress indicator with status-specific styling - Figma design
    const badgeCX = cardX + 15; // Position on the left side
    const badgeCY = cardY + 15; // Centered position for larger badge
    const badgeR = 12; // Larger radius to match Figma design

    // Determine colors and icon based on status
    let outerRingColor: [number, number, number];
    let innerFillColor: [number, number, number];
    let iconColor: [number, number, number];
    let progressPercentage: number;

    if (status === 'Compliant') {
      outerRingColor = [34, 197, 94]; // Bright green ring (green-500)
      innerFillColor = [240, 253, 244]; // Light green fill (green-50)
      iconColor = [34, 197, 94]; // Bright green checkmark (green-500)
      progressPercentage = 0.95; // 95% filled
    } else if (status === 'Partially Compliant') {
      outerRingColor = [202, 138, 4]; // yellow-600
      innerFillColor = [254, 252, 232]; // yellow-50
      iconColor = [245, 158, 11]; // yellow-500
      progressPercentage = 0.65; // 65% filled
    } else {
      // Not Compliant
      outerRingColor = [220, 38, 38]; // red-600
      innerFillColor = [254, 242, 242]; // red-50
      iconColor = [239, 68, 68]; // red-500
      progressPercentage = 0.25; // 25% filled
    }

    // Draw outer ring
    doc.setDrawColor(...outerRingColor);
    doc.setLineWidth(3.2);
    doc.circle(badgeCX, badgeCY, badgeR, 'S');

    // Draw inner fill
    doc.setFillColor(...innerFillColor);
    doc.circle(badgeCX, badgeCY, badgeR - 3, 'F');

    // Draw progress arc based on status
    doc.setDrawColor(...iconColor);
    doc.setLineWidth(2.5);
    if ((doc as any).setLineCap) {
      (doc as any).setLineCap('round');
    }

    // Draw progress arc (from top, clockwise)
    const startAngle = -Math.PI / 2; // Start from top
    const endAngle = startAngle + 2 * Math.PI * progressPercentage;

    // Draw the progress arc
    for (let angle = startAngle; angle <= endAngle; angle += 0.1) {
      const x1 = badgeCX + Math.cos(angle) * (badgeR - 1.5);
      const y1 = badgeCY + Math.sin(angle) * (badgeR - 1.5);
      const x2 = badgeCX + Math.cos(angle + 0.1) * (badgeR - 1.5);
      const y2 = badgeCY + Math.sin(angle + 0.1) * (badgeR - 1.5);
      doc.line(x1, y1, x2, y2);
    }

    // Draw status-specific icon in center - compact size
    doc.setDrawColor(...iconColor);
    doc.setLineWidth(1.5); // Reduced line width for smaller icon
    if ((doc as any).setLineCap) {
      (doc as any).setLineCap('round');
    }

    if (status === 'Compliant') {
      // Draw checkmark - larger size for Figma design
      doc.line(badgeCX - 4, badgeCY + 1, badgeCX - 1, badgeCY + 4);
      doc.line(badgeCX - 1, badgeCY + 4, badgeCX + 5, badgeCY - 3);
    } else if (status === 'Partially Compliant') {
      // Draw exclamation mark - larger size
      doc.line(badgeCX, badgeCY - 4, badgeCX, badgeCY + 2);
      doc.line(badgeCX, badgeCY + 4, badgeCX, badgeCY + 5);
    } else {
      // Not Compliant
      // Draw X mark - larger size
      doc.line(badgeCX - 4, badgeCY - 4, badgeCX + 4, badgeCY + 4);
      doc.line(badgeCX + 4, badgeCY - 4, badgeCX - 4, badgeCY + 4);
    }

    // Status text positioned to the right of the icon - Figma design
    doc.setTextColor(0, 0, 0); // Black color for status text
    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(20); // Increased font size for better visibility
    const statusTextX = badgeCX + 18; // Increased spacing from icon
    const statusTextY = badgeCY - 8; // Align with center of icon
    doc.text(status, statusTextX, statusTextY);

    // Percentage pill positioned in the same row as status text - Figma design
    const pillText = `${Math.round(enhancedScore)}%`;
    doc.setFontSize(10); // Increased font size for Figma design
    const textWidth = doc.getTextWidth(pillText);
    const horizontalPadding = 4; // Reduced padding for tighter fit
    const pillTextWidth = textWidth + horizontalPadding * 2; // Total width with padding
    const pillH = 4; // Increased height for better appearance
    const pillX = statusTextX + doc.getTextWidth(status) + 28; // Increased spacing from status text to prevent overlap
    const pillY = statusTextY - 6; // Align with status text
    // Convert #222D73 to RGB: R=34, G=45, B=115
    doc.setFillColor(34, 45, 115);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(pillX, pillY, pillTextWidth, pillH + 4, 4, 4, 'F'); // Increased corner radius for more pill-like appearance
    // Center the text horizontally within the pill
    const textX = pillX + (pillTextWidth - textWidth) / 2;
    const textY = pillY + pillH + 2;
    doc.text(pillText, textX, textY);

    // Sub message positioned below the status text and percentage pill - Figma design
    message = translatedMessage;
    doc.setFontSize(10); // Increased font size for Figma design
    doc.setTextColor(71, 85, 105); // Gray color for message
    // Split message into lines if it contains \n
    const messageLines = message.split('\n');
    let messageY = statusTextY + 12; // Maintained spacing below status text
    messageLines.forEach((line, index) => {
      doc.text(line, statusTextX, messageY + index * 6); // 6px spacing between lines
    });

    // Add "Great job!" message below the main message for Compliant status
    if (status === 'Compliant') {
      doc.setFontSize(9); // Slightly smaller font for secondary message
      doc.setTextColor(71, 85, 105); // Same gray color
      doc.text('Great job!', statusTextX, statusTextY + 20); // Maintained spacing below main message
    }

    // Cards positioned right-aligned with Compliant section on the left - ultra compact layout
    const cardSpacing = 4; // Minimal spacing for compact layout
    const totalErrorsCardWidth = 25; // Further reduced width for Total Errors card
    const totalErrorsCardHeight = 20; // Reduced height for Total Errors card
    const severityCardWidth = 40; // Further reduced width for Severity card
    const severityCardHeight = 20; // Reduced height for Severity card

    // Calculate right-aligned positioning
    const totalCardsWidth =
      totalErrorsCardWidth + severityCardWidth + cardSpacing;
    const rightMargin = 12; // Right margin from page edge
    const totalErrorsCardX = pageWidth - rightMargin - totalCardsWidth; // Right-aligned
    const totalErrorsCardY = cardY; // Same Y as compliance section

    // Total Errors card - no fill with reduced border width
    doc.setDrawColor(162, 173, 243); // Light blue border (#A2ADF3)
    doc.setLineWidth(0.3); // Reduced border line width
    doc.roundedRect(
      totalErrorsCardX,
      totalErrorsCardY,
      totalErrorsCardWidth,
      totalErrorsCardHeight,
      2, // Reduced corner radius
      2,
      'D', // Draw only (no fill)
    );

    // Title: "Total Errors" - dark blue color, positioned to the left
    doc.setTextColor(21, 101, 192); // Dark blue color for title
    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(8); // Increased font size for better readability
    doc.text(
      translatedTotalErrors,
      totalErrorsCardX + 6, // Moved to the left (6px from left edge)
      totalErrorsCardY + 8, // Moved down
      { align: 'left' },
    );

    // Number: Large, prominent display in dark color, positioned to the left with reduced spacing
    doc.setTextColor(30, 30, 30); // Dark, almost black color for the number
    doc.setFontSize(18); // Increased font size for better prominence
    doc.text(
      `${issues.length}`,
      totalErrorsCardX + 6, // Moved to the left (6px from left edge)
      totalErrorsCardY + 14, // Moved down with title
      {
        align: 'left',
      },
    );

    // Severity list card - positioned to the right of Total Errors card (right-aligned)
    let severityCardX = totalErrorsCardX + totalErrorsCardWidth + cardSpacing;
    let severityCardY = cardY; // Same Y as compliance section

    // Ensure severity card doesn't go out of page (should not happen with right-alignment)
    if (severityCardX + severityCardWidth > pageWidth - 12) {
      // If it would overflow, position it below the Total Errors card instead
      severityCardX = totalErrorsCardX;
      severityCardY = cardY + totalErrorsCardHeight + 8;
    }

    // Severity card - no fill with reduced border width
    doc.setDrawColor(162, 173, 243); // Light blue border (#A2ADF3)
    doc.setLineWidth(0.3); // Reduced border line width
    doc.roundedRect(
      severityCardX,
      severityCardY,
      severityCardWidth,
      severityCardHeight,
      2, // Reduced corner radius
      2,
      'D', // Draw only (no fill)
    );

    const severityCounts = {
      severe: issues.filter(
        (i) => i.impact === 'critical' || i.impact === 'serious',
      ).length,
      moderate: issues.filter((i) => i.impact === 'moderate').length,
      mild:
        issues.length -
        (issues.filter((i) => i.impact === 'critical').length +
          issues.filter((i) => i.impact === 'serious').length +
          issues.filter((i) => i.impact === 'moderate').length),
    } as const;

    const sevLineX = severityCardX + 4;
    let sevLineY = severityCardY + 5; // Further reduced starting position for compact height
    doc.setFontSize(8); // Increased font size for better readability
    // Severe - red text (matching image)
    doc.setTextColor(220, 38, 38); // Red color
    doc.text(`${translatedSevere}`, sevLineX, sevLineY);
    doc.setTextColor(30, 30, 30); // Dark, almost black color for count
    doc.text(
      `${severityCounts.severe}`,
      severityCardX + severityCardWidth - 4,
      sevLineY,
      {
        align: 'right',
      },
    );
    // Moderate - orange text (matching image)
    sevLineY += 5; // Further reduced line spacing for compact height
    doc.setTextColor(202, 138, 4); // Orange color
    doc.text(`${translatedModerate}`, sevLineX, sevLineY);
    doc.setTextColor(30, 30, 30); // Dark, almost black color for count
    doc.text(
      `${severityCounts.moderate}`,
      severityCardX + severityCardWidth - 4,
      sevLineY,
      {
        align: 'right',
      },
    );
    // Mild - blue text (matching image)
    sevLineY += 5; // Further reduced line spacing for compact height
    doc.setTextColor(33, 150, 243); // Blue color
    doc.text(`${translatedMild}`, sevLineX, sevLineY);
    doc.setTextColor(30, 30, 30); // Dark, almost black color for count
    doc.text(
      `${severityCounts.mild}`,
      severityCardX + severityCardWidth - 4,
      sevLineY,
      {
        align: 'right',
      },
    );
    // --- END HEADER AREA ---

    // Compute a reference Y for subsequent sections based on header
    // Calculate bottom position based on the compliance status elements
    const complianceBottomY = Math.max(
      badgeCY + badgeR + 10, // Icon bottom + padding
      statusTextY + 12 + 10, // Sub message bottom + padding
    );
    const headerBottomY = Math.max(complianceBottomY, severityCardY + 30);

    // Start Y for category grid
    const yStart = headerBottomY + 12;

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

    let nextY = yStart - 10; // Moved up more from summary boxes

    if (categoryData.length > 0) {
      // Section header
      // No horizontal separator in the new design

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0); // Black color
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text(translatedIssuesDetectedByCategory, 12, nextY + 8, {
        align: 'left',
      });
      let currentY = nextY + 18;

      // Define category colors to match the Figma design - all blue theme
      const categoryColors = new Map<string, [number, number, number]>([
        ['Content', [68, 90, 231]], // #445AE7 - new blue color
        ['Cognitive', [68, 90, 231]], // #445AE7 - new blue color
        ['Low Vision', [68, 90, 231]], // #445AE7 - new blue color
        ['Navigation', [68, 90, 231]], // #445AE7 - new blue color
        ['Mobility', [68, 90, 231]], // #445AE7 - new blue color
        ['Other', [68, 90, 231]], // #445AE7 - new blue color
        ['Forms', [68, 90, 231]], // #445AE7 - new blue color
      ]);

      // Card layout - 2 columns, 3 rows to match the updated design
      const itemsPerRow = 2;
      const cardWidth = 90; // Increased width for better spacing
      const cardHeight = 20; // Height to match Figma
      const cardSpacing = 6; // Increased spacing for 2-column layout
      const startX = 10; // Centered start position for wider 2-column layout
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

        // Transparent card - no fill, just border
        doc.setDrawColor(162, 173, 243); // #A2ADF3 border color
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardWidth, cardHeight, 1, 1, 'D');

        // Category icon in colored rounded rectangle - left side like Figma design
        const iconWidth = 8; // Width for the blue icon section
        const iconHeight = cardHeight - 4; // Full height minus small padding
        const iconX = x + 2;
        const iconY = y + 2;

        // Colored rounded rectangle background for icon - blue like Figma
        doc.setFillColor(...categoryColor);
        doc.roundedRect(iconX, iconY, iconWidth, iconHeight, 1, 1, 'F');

        // Add white icon centered in the blue rectangle
        const svgIcon = iconMap.get(category);
        if (svgIcon) {
          // Add the SVG icon in white (centered in rectangle)
          const svgSize = Math.min(iconWidth - 4, iconHeight - 4); // Fit within rectangle
          const svgOffsetX = (iconWidth - svgSize) / 2; // Center horizontally
          const svgOffsetY = (iconHeight - svgSize) / 2; // Center vertically
          doc.addImage(
            svgIcon,
            'PNG',
            iconX + svgOffsetX,
            iconY + svgOffsetY,
            svgSize,
            svgSize,
          );
        } else {
          // Draw simple white icon shapes centered in rectangle
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.4);

          const iconCenterX = iconX + iconWidth / 2;
          const iconCenterY = iconY + iconHeight / 2;

          if (category === 'Content') {
            // Nested diamond/square outlines like Figma - really tiny
            doc.setLineWidth(0.05);
            // Outer square
            doc.rect(iconCenterX - 0.3, iconCenterY - 0.3, 0.6, 0.6, 'S');
            // Middle square (offset)
            doc.rect(iconCenterX - 0.2, iconCenterY - 0.2, 0.4, 0.4, 'S');
            // Inner square (offset)
            doc.rect(iconCenterX - 0.1, iconCenterY - 0.1, 0.2, 0.2, 'S');
          } else if (category === 'Cognitive') {
            // Simple brain icon - really tiny circle
            doc.setLineWidth(0.05);
            doc.circle(iconCenterX, iconCenterY, 0.25, 'S');
            // Tiny starburst
            doc.line(
              iconCenterX + 0.1,
              iconCenterY - 0.02,
              iconCenterX + 0.15,
              iconCenterY - 0.05,
            );
            doc.line(
              iconCenterX + 0.1,
              iconCenterY - 0.02,
              iconCenterX + 0.12,
              iconCenterY - 0.08,
            );
          } else if (category === 'Low Vision') {
            // Simple eye icon - really tiny
            doc.setLineWidth(0.05);
            doc.ellipse(iconCenterX, iconCenterY, 0.25, 0.15, 'S');
            doc.circle(iconCenterX, iconCenterY, 0.08, 'F');
          } else if (category === 'Navigation') {
            // Simple arrow icon - really tiny
            doc.setLineWidth(0.05);
            doc.line(
              iconCenterX - 0.15,
              iconCenterY + 0.1,
              iconCenterX + 0.15,
              iconCenterY - 0.1,
            );
            doc.line(
              iconCenterX + 0.15,
              iconCenterY - 0.1,
              iconCenterX + 0.08,
              iconCenterY - 0.02,
            );
            doc.line(
              iconCenterX + 0.15,
              iconCenterY - 0.1,
              iconCenterX + 0.12,
              iconCenterY - 0.1,
            );
          } else if (category === 'Mobility') {
            // Simple person in wheelchair icon - really tiny
            doc.setLineWidth(0.05);
            doc.circle(iconCenterX, iconCenterY - 0.1, 0.08, 'F'); // Head
            doc.rect(iconCenterX - 0.02, iconCenterY - 0.02, 0.04, 0.1, 'F'); // Body
            // Wheelchair wheels
            doc.circle(iconCenterX - 0.1, iconCenterY + 0.1, 0.08, 'S');
            doc.circle(iconCenterX + 0.1, iconCenterY + 0.1, 0.08, 'S');
          } else {
            // Simple info icon - three really tiny circles
            doc.setLineWidth(0.05);
            doc.circle(iconCenterX - 0.1, iconCenterY - 0.1, 0.05, 'F');
            doc.circle(iconCenterX, iconCenterY, 0.05, 'F');
            doc.circle(iconCenterX + 0.1, iconCenterY + 0.1, 0.05, 'F');
            doc.line(
              iconCenterX - 0.1,
              iconCenterY - 0.1,
              iconCenterX,
              iconCenterY,
            );
            doc.line(
              iconCenterX,
              iconCenterY,
              iconCenterX + 0.1,
              iconCenterY + 0.1,
            );
          }
        }

        // Category name (to the right of blue rectangle)
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont('NotoSans_Condensed-Regular');
        const categoryX = x + iconWidth + 6; // Start after the blue rectangle
        const categoryY = y + 6;
        doc.text(category, categoryX, categoryY);

        // Right-aligned count text (no pill in Figma)
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.setFont('NotoSans_Condensed-Regular');
        const countText = count.toString();
        const countX = x + cardWidth - 3;
        const countY = categoryY;
        doc.text(countText, countX, countY, { align: 'right' });

        // Progress bar at bottom - matching Figma design
        const progressBarWidth = cardWidth - iconWidth - 10; // Account for blue rectangle
        const progressBarHeight = 2;
        const progressBarX = x + iconWidth + 6; // Start after the blue rectangle
        const progressBarY = y + cardHeight - 10;

        // Progress bar background - light blue-grey like Figma
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(
          progressBarX,
          progressBarY,
          progressBarWidth,
          progressBarHeight,
          1,
          1,
          'F',
        );

        // Progress bar fill - medium blue like Figma
        const fillWidth = (progressBarWidth * percentage) / 100;
        if (fillWidth > 1) {
          doc.setFillColor(68, 90, 231); // #445AE7 - new blue color
          doc.roundedRect(
            progressBarX,
            progressBarY,
            fillWidth,
            progressBarHeight,
            1,
            1,
            'F',
          );
        }

        // Percentage text
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        doc.setFont('NotoSans_Condensed-Regular');
        doc.text(
          `${percentage.toFixed(1)}% of total issues`,
          x + iconWidth + 6, // Start after the blue rectangle
          y + cardHeight - 4,
        );
      });

      // Calculate the actual Y position after all cards are drawn
      const totalRows = Math.ceil(orderedCategoryData.length / itemsPerRow);
      nextY = currentY + totalRows * (cardHeight + 6) + 15; // Added more spacing
    }

    // --- ACCESSIBILITY COMPLIANCE PANEL (matches Figma) ---
    const buildCompliancePanel = async (
      startY: number,
      hasWebAbility: boolean,
    ) => {
      const panelX = 8;
      const panelW = pageWidth - 20;
      const outerY = startY + 4; // Moved up

      // Main container (compliance vs non-compliance styling)
      const containerHeight = 90;
      if (hasWebAbility) {
        // Compliant state - light blue-grey background
        doc.setFillColor(255, 255, 255); // White background
        doc.setDrawColor(162, 173, 243); // Light blue border
      } else {
        // Non-compliant state - light red background
        doc.setFillColor(254, 242, 242); // Light red background (#fef2f2)
        doc.setDrawColor(248, 113, 113); // Red border (#f87171)
      }
      doc.setLineWidth(0.5);
      doc.roundedRect(panelX, outerY, panelW, containerHeight, 4, 4, 'FD');

      // Compliance status icon (top left)
      const shieldX = panelX + 8;
      const shieldY = outerY + 5;
      const shieldSize = 20;

      if (hasWebAbility) {
        // Compliant state - green shield with checkmark
        try {
          const img = new Image();
          img.src = greenSuccessImage;

          // Wait for image to load
          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const TIMEOUT_MS = 3000; // 3 seconds timeout

            const cleanup = () => {
              img.onload = null;
              img.onerror = null;
            };

            const timeoutId = setTimeout(() => {
              if (!settled) {
                settled = true;
                cleanup();
                reject(new Error('Green success image load timed out'));
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
              reject(new Error('Green success image failed to load'));
            };
          });

          // Add the image to PDF
          doc.addImage(img, 'PNG', shieldX, shieldY, shieldSize, shieldSize);
        } catch (error) {
          console.warn(
            'Failed to load green success image, falling back to drawn shield:',
            error,
          );

          // Fallback: Draw green shield background if image fails to load
          doc.setFillColor(34, 197, 94); // Bright green
          doc.setDrawColor(34, 197, 94);
          doc.setLineWidth(0.8);

          // Shield shape (rounded rectangle with pointed bottom)
          doc.roundedRect(
            shieldX,
            shieldY,
            shieldSize * 0.7,
            shieldSize * 0.8,
            2,
            2,
            'F',
          );
          // Pointed bottom of shield
          doc.triangle(
            shieldX + shieldSize * 0.35 - 3,
            shieldY + shieldSize * 0.8,
            shieldX + shieldSize * 0.35,
            shieldY + shieldSize * 0.95,
            shieldX + shieldSize * 0.35 + 3,
            shieldY + shieldSize * 0.8,
            'F',
          );

          // White checkmark inside shield
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(2.5);
          const checkX = shieldX + shieldSize * 0.35;
          const checkY = shieldY + shieldSize * 0.4;
          doc.line(checkX - 4, checkY, checkX - 1.5, checkY + 3);
          doc.line(checkX - 1.5, checkY + 3, checkX + 5, checkY - 3);
        }
      } else {
        // Non-compliant state - red warning icon with exclamation mark
        // Red circle background
        doc.setFillColor(239, 68, 68); // Red background (#ef4444)
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(0.8);
        doc.circle(
          shieldX + shieldSize * 0.5,
          shieldY + shieldSize * 0.5,
          shieldSize * 0.4,
          'F',
        );

        // White exclamation mark inside circle
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(255, 255, 255);

        // Calculate center position of the circle
        const centerX = shieldX + shieldSize * 0.5;
        const centerY = shieldY + shieldSize * 0.5;
        const radius = shieldSize * 0.4;

        // Exclamation mark body (vertical line) - better proportioned
        const lineStartY = centerY - radius * 0.6; // Start higher
        const lineEndY = centerY - radius * 0.1; // End closer to center
        doc.setLineWidth(2.5);
        doc.setLineCap('round');
        doc.line(centerX, lineStartY, centerX, lineEndY);

        // Exclamation mark dot - positioned with proper gap
        const dotY = centerY + radius * 0.3;
        doc.circle(centerX, dotY, 1.3, 'F');
      }

      // Title text (to the right of icon)
      const titleX = shieldX + shieldSize + 4;
      const titleY = shieldY + 8;

      doc.setFont('NotoSans_Condensed-Regular');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0); // Dark text

      if (hasWebAbility) {
        doc.text(translatedAccessibilityComplianceAchieved, titleX, titleY);
      } else {
        doc.text(translatedCriticalViolationsDetected, titleX, titleY);
      }

      // Subtitle text
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105); // Gray text
      if (hasWebAbility) {
        doc.text(translatedWebsiteCompliant, titleX, titleY + 10);
      } else {
        doc.text(translatedLegalActionWarning, titleX, titleY + 10);
      }

      // Nested box for compliance status
      const innerX = panelX + 12;
      const innerY = outerY + 30;
      const innerW = panelW - 24;
      const innerH = 55;

      doc.setFillColor(255, 255, 255);
      if (hasWebAbility) {
        doc.setDrawColor(162, 173, 243); // #A2ADF3 border color for compliant
      } else {
        doc.setDrawColor(248, 113, 113); // Red border for non-compliant
      }
      doc.setLineWidth(0.5);
      doc.roundedRect(innerX, innerY, innerW, innerH, 3, 3, 'FD');

      // Status title
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont('NotoSans_Condensed-Regular');
      if (hasWebAbility) {
        doc.text(translatedComplianceStatus, innerX + 8, innerY + 8);
      } else {
        doc.text(translatedImmediateRisks, innerX + 8, innerY + 8);
      }

      // Status items with checkmarks or crosses
      const itemStartX = innerX + 8;
      const itemStartY = innerY + 16; // Increased spacing from title

      const drawGreenCheck = (x: number, y: number) => {
        // Simple green checkmark without circle background
        doc.setDrawColor(34, 197, 94); // Green color
        doc.setLineWidth(1.2); // Thinner lines for simple appearance
        doc.setLineCap('round'); // Rounded line ends

        // Draw simple checkmark shape
        doc.line(x - 1.5, y - 0.5, x - 0.3, y + 0.7);
        doc.line(x - 0.3, y + 0.7, x + 2, y - 2);
      };

      const drawRedCross = (x: number, y: number) => {
        // Simple red X mark
        doc.setDrawColor(239, 68, 68); // Red color (#ef4444)
        doc.setLineWidth(1.2);
        doc.setLineCap('round');

        // Draw X shape
        doc.line(x - 2, y - 2, x + 2, y + 2);
        doc.line(x - 2, y + 2, x + 2, y - 2);
      };

      if (hasWebAbility) {
        // Compliant state - show green checkmarks
        // First item
        drawGreenCheck(itemStartX, itemStartY);
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(
          translatedWebAbilityProtecting,
          itemStartX + 8,
          itemStartY + 1,
        );

        // Second item
        drawGreenCheck(itemStartX, itemStartY + 10);
        doc.text(
          translatedAutomatedFixesApplied,
          itemStartX + 8,
          itemStartY + 11,
        );

        // WCAG Compliance status
        drawGreenCheck(itemStartX, itemStartY + 20);
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text('WCAG 2.1 AA standards met', itemStartX + 8, itemStartY + 21);

        // Legal protection status
        drawGreenCheck(itemStartX, itemStartY + 30);
        doc.text(
          'Legal compliance maintained',
          itemStartX + 8,
          itemStartY + 31,
        );
      } else {
        // Non-compliant state - show red crosses and warning text
        // First item
        drawRedCross(itemStartX, itemStartY);
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(translatedPotentialLawsuits, itemStartX + 8, itemStartY + 1);

        // Second item
        drawRedCross(itemStartX, itemStartY + 10);
        doc.text(translatedCustomerLoss, itemStartX + 8, itemStartY + 11);

        // Third item
        drawRedCross(itemStartX, itemStartY + 20);
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(translatedSeoPenalties, itemStartX + 8, itemStartY + 21);

        // Fourth item
        drawRedCross(itemStartX, itemStartY + 30);
        doc.text(translatedBrandDamage, itemStartX + 8, itemStartY + 31);
      }

      return outerY + containerHeight + 12; // bottom Y with spacing
    };

    const panelBottomY = await buildCompliancePanel(nextY, hasWebAbility);
    // Update warningY position after warning section is complete
    let warningY = panelBottomY;
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
      addPageWithBackground(doc, backgroundColor);
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
    const wcagIssues = issues.filter((issue) => {
      const wcagCode = issue.wcag_code || '';
      const code = issue.code || '';
      const message = issue.message || '';
      const description = issue.description || '';
      return (
        wcagCode.includes('WCAG') ||
        code.includes('WCAG2AA') ||
        message.includes('WCAG2AA') ||
        description.includes('WCAG2AA')
      );
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
    const codeGroupsWithMessages: {
      [key: string]: { count: number; messages: string[] };
    } = {};

    wcagIssues.forEach((issue) => {
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
      let wcagCardData = groupedWcagCodes.map(
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

      // Append curated WCAG 2.1 AA codes in the same format with count = 1
      // and avoid duplicates (by numeric key like 1.4.3)
      const extractNumericKey = (codeStr: string): string => {
        const match = (codeStr || '').match(/\d+\.\d+(?:\.\d+)?/);
        return match ? match[0] : '';
      };
      const existingNumericKeys = new Set<string>(
        wcagCardData.map((item: any) => extractNumericKey(item.code)),
      );

      const curatedCandidates: { code: string; message: string }[] =
        CURATED_WCAG_CODES;

      const seenCurated = new Set<string>();
      const curatedAdditions = curatedCandidates
        .filter(({ code }) => {
          const key = extractNumericKey(code);
          if (!key || existingNumericKeys.has(key) || seenCurated.has(key)) {
            return false;
          }
          seenCurated.add(key);
          return true;
        })
        .slice(0, 15)
        .map(({ code, message }) => ({
          code,
          count: 1,
          message,
          status: 'FIXED', // ensure green/yellow styling depending on hasWebAbility
        }));

      if (curatedAdditions.length > 0) {
        wcagCardData = wcagCardData.concat(curatedAdditions);
      }

      // Calculate total height needed for the big container card
      const totalRows = Math.ceil(wcagCardData.length / 3);
      const cardsHeight = totalRows * (14 + 3); // card height + spacing
      const containerHeight = 10 + cardsHeight + 24; // ultra compact blue banner, stats, and bottom padding

      // Big container card background
      doc.setFillColor(255, 255, 255); // White background
      doc.setDrawColor(203, 213, 225); // Light border
      doc.setLineWidth(0.5);
      doc.roundedRect(10, currentY - 6, 190, containerHeight, 3, 3, 'FD');

      // Blue banner header section (full width of container) - ultra compact height
      doc.setFillColor(68, 90, 231);
      doc.roundedRect(10, currentY - 6, 190, 20, 3, 3, 'F'); // Ultra compact blue section

      // Cover bottom corners of blue section to make it rectangular at bottom
      doc.setFillColor(68, 90, 231);
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
        `${translatedWcagComplianceIssues} ${reportData.url}`,
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
            addPageWithBackground(doc, backgroundColor);
            currentY = 15; // Reduced top margin for continuation pages
            pageRowCount = 0; // Reset row count for new page
          }

          // Recalculate y position with current page row count
          const cardY = currentY + pageRowCount * (issueCardHeight + 3); // Reduced row spacing for compact layout

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
                const iconOffsetX = -iconSize / 2; // Center horizontally
                const iconOffsetY = -iconSize / 2; // Center vertically
                doc.addImage(
                  eyeIconDataUrl,
                  'PNG',
                  iconX + iconOffsetX,
                  iconY + iconOffsetY,
                  iconSize,
                  iconSize,
                );
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
            while (
              doc.getTextWidth(displayCode + '...') > maxWidth &&
              displayCode.length > 10
            ) {
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
            let messageText = words
              .slice(0, Math.min(10, words.length))
              .join(' ');
            if (words.length > 10) {
              messageText += '...';
            }

            // Further truncate if still too wide
            if (doc.getTextWidth(messageText) > maxWidth) {
              while (
                doc.getTextWidth(messageText + '...') > maxWidth &&
                messageText.length > 20
              ) {
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
        },
      );

      // Add "Fixes 71 more" card at the end - spanning full width of 3 columns
      const fixesMoreRow = pageRowCount; // Use current page row count

      // Check if we need a new page for the fixes more card
      const fixesMoreCardY = currentY + fixesMoreRow * (issueCardHeight + 3);
      if (fixesMoreCardY + issueCardHeight > pageHeight - pageMargin) {
        addPageWithBackground(doc, backgroundColor);
        currentY = 15; // Reset for new page
        pageRowCount = 0;
      }

      // Calculate final position for fixes more card - spanning full width
      const finalFixesMoreCardY =
        currentY + pageRowCount * (issueCardHeight + 3);
      const fixesMoreCardX = cardsStartX; // Start from leftmost position
      const fixesMoreCardWidth = issueCardWidth * 3 + issueCardSpacing * 2; // Width of 3 cards + spacing

      // Card background - green if hasWebAbility, yellow if not
      if (hasWebAbility) {
        doc.setFillColor(240, 253, 244); // Very light green
        doc.setDrawColor(34, 197, 94);
      } else {
        doc.setFillColor(255, 248, 225); // Very light yellow
        doc.setDrawColor(202, 138, 4);
      }

      doc.setLineWidth(0.2);
      doc.roundedRect(
        fixesMoreCardX,
        finalFixesMoreCardY,
        fixesMoreCardWidth,
        issueCardHeight,
        2,
        2,
        'FD',
      );

      // Count badge - green if hasWebAbility, yellow if not
      const countBadgeHeight = 3;
      const countBadgeWidth = 3;
      const countBadgeX = fixesMoreCardX + 3;
      const countBadgeY = finalFixesMoreCardY + 3;
      const countBadgeCircleRadius =
        Math.max(countBadgeWidth, countBadgeHeight) / 2;
      const countBadgeCircleX = countBadgeX + countBadgeWidth / 2;
      const countBadgeCircleY = countBadgeY + countBadgeHeight / 2;

      if (hasWebAbility) {
        doc.setFillColor(34, 197, 94); // Green background
      } else {
        doc.setFillColor(202, 138, 4); // Yellow background
      }

      doc.circle(
        countBadgeCircleX,
        countBadgeCircleY,
        countBadgeCircleRadius,
        'F',
      );

      // Count text "71"
      doc.setFontSize(5);
      doc.setTextColor(255, 255, 255);
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text('71', countBadgeCircleX, countBadgeCircleY + 0.6, {
        align: 'center',
      });

      // Status icon - checkmark if hasWebAbility, eye if not
      const iconX = fixesMoreCardX + fixesMoreCardWidth - 7;
      const iconY = finalFixesMoreCardY + 7;

      if (hasWebAbility) {
        // Green checkmark
        doc.setFillColor(34, 197, 94);
        doc.setDrawColor(22, 163, 74);
        doc.setLineWidth(0.2);
        doc.circle(iconX, iconY, 2, 'FD'); // Increased circle radius from 1.5 to 2

        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.6); // Increased line width from 0.4 to 0.6
        doc.line(iconX - 1, iconY - 0.3, iconX - 0.3, iconY + 0.7); // Made lines longer
        doc.line(iconX - 0.4, iconY + 0.8, iconX + 1.2, iconY - 0.8); // Made lines longer
      } else {
        // Eye icon for can be fixed with WebAbility
        if (eyeIconDataUrl) {
          const iconSize = 4;
          const iconOffsetX = -iconSize / 2;
          const iconOffsetY = -iconSize / 2;
          doc.addImage(
            eyeIconDataUrl,
            'PNG',
            iconX + iconOffsetX,
            iconY + iconOffsetY,
            iconSize,
            iconSize,
          );
        } else {
          // Fallback to yellow circle
          doc.setFillColor(202, 138, 4);
          doc.setDrawColor(161, 98, 7);
          doc.setLineWidth(0.2);
          doc.circle(iconX, iconY, 1.5, 'FD');
        }
      }

      // Heading "Fixes 71 more" - positioned after count badge
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.setFont('NotoSans_Condensed-Regular');
      const textX = countBadgeX + countBadgeWidth + 1.5;
      const codeY = countBadgeCircleY + 0.6;
      doc.text('Fixes 71 more', textX, codeY);

      // Description "We fix 71 more codes" - below heading, left-aligned in the wider card
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('NotoSans_Condensed-Regular');
      const messageY = codeY + 4;
      const messageX = fixesMoreCardX + 7; // Start from left edge with 10px padding
      doc.text('We fix 71 more codes', messageX, messageY, { align: 'left' });

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
          <div className="block xl:hidden w-full">
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
                    'Get Report'
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
        <div className="hidden xl:flex relative mr-0 xl:mr-4 flex-col xl:flex-row items-stretch xl:items-center gap-3 xl:gap-4 w-full xl:w-auto pt-4 xl:pt-0">
          <button
            onClick={handleDownloadSubmit}
            className="whitespace-nowrap w-full xl:w-auto px-6 py-3 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="whitespace-nowrap w-full xl:w-auto px-6 py-3 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
          <div className="relative w-full xl:w-auto">
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
              className="appearance-none w-full xl:w-auto bg-white border border-gray-300 rounded-lg px-6 py-3 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
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
// Helper function to parse WCAG codes similar to PDF generation
function parseWcagCode(wcagCode: string, fallbackCode: string): string {
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
    const commaIndex = fallbackCode.indexOf(',');
    return commaIndex > 0
      ? fallbackCode.substring(0, commaIndex)
      : fallbackCode;
  }

  return result;
}

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

export default ReportView;
2;
