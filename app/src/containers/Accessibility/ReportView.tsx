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
import { generatePDF, generateShortPDF } from '@/utils/generatePDF';
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
import useOrganizationName from '@/hooks/useOrganizationName';

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
  if (!url) return null;
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
  const organizationName = useOrganizationName();
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

  // Add organization-specific fact dynamically
  const allAccessibilityFacts = useMemo(() => {
    return [
      ...accessibilityFacts,
      `${organizationName} offers solutions that address over 90% of common WCAG violations`,
    ];
  }, [organizationName]);

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
      setFactIndex((prevIndex) => (prevIndex + 1) % allAccessibilityFacts.length);
    }, 6000); // Change fact every 6 seconds

    return () => clearInterval(interval); // Cleanup the interval on component unmount
  }, [allAccessibilityFacts.length]);

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
                          {allAccessibilityFacts[factIndex]}
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
                                  Fixed by {organizationName}
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

                        {/* {issue.source && (
                          <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                            {issue.source}
                          </span>
                        )} */}

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
  // Only render if siteImg is available
  if (!siteImg) {
    return null;
  }

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
      const pdfBlob = await generatePDF(results, currentLanguage, fullUrl, organizationName);
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

  // Handle short report download
  const handleShortReportDownload = async () => {
    setIsDownloading(true);
    try {
      const pdfBlob = await generateShortPDF(results, currentLanguage, fullUrl);
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
