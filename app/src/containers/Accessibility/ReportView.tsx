import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useLocation, useHistory } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLazyQuery, useQuery } from '@apollo/client';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';

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
  Shield
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReactI18NextChild } from 'react-i18next';
import { toast } from 'sonner';
import TechStack from './TechStack';
import { CircularProgress } from '@mui/material';
import getProfileQuery from '@/queries/auth/getProfile';
import getLogoUrlOnly from '@/utils/getWidgetSettings'

// Add this array near the top of the file
const accessibilityFacts = [
  "Over 60% of accessibility issues are related to poor color contrast",
  "Screen readers cannot interpret images without alt text",
  "1 in 4 adults in the US has some type of disability that may impact website usage",
  "Keyboard navigation is essential for people with motor disabilities",
  "WCAG 2.1 has 78 success criteria across three conformance levels",
  "Accessible websites typically rank higher in search engine results",
  "The ADA applies to websites even though it was written before the internet was widely used",
  "Video captions benefit people learning a new language, not just those with hearing impairments",
  "Voice recognition software users need clickable elements large enough to target accurately",
  "Headings help screen reader users understand the structure of your content",
  "Accessibility overlaps with mobile-friendly design - both require thoughtful structure",
  "Accessible forms should have clearly associated labels for each input field",
  "In 2023, over 4,000 website accessibility lawsuits were filed in the US alone",
  "Semantic HTML elements like <nav> and <button> provide built-in accessibility features",
  "People with cognitive disabilities benefit from clear, simple language and consistent design",
  "ARIA attributes can enhance accessibility but aren't a substitute for native HTML elements",
  "Automatic media playback can interfere with screen readers and assistive technologies",
  "Providing a visible focus indicator helps keyboard users navigate your site",
  "Proper color contrast benefits people with color blindness and those using devices in bright sunlight",
  "Accessibility is a continuous process, not a one-time fix",
  "The global market of people with disabilities has over $13 trillion in disposable income",
  "Accessible websites often have up to 30% better usability for all users",
  "WebAbility offers solutions that address over 90% of common WCAG violations"
]

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
  const enhancedScore = baseScore + WEBABILITY_SCORE_BONUS;
  return Math.min(enhancedScore, MAX_TOTAL_SCORE);
}

const queryParams = new URLSearchParams(location.search);
const fullUrl = queryParams.get('domain') || '';

// const cleanUrl = fullUrl.trim().replace(/^(https?:\/\/)?(www\.)?/, '');
// const urlParam = `https://${cleanUrl}`;

const ReportView: React.FC = () => {
  const { r2_key } = useParams<ReportParams>();
  const location = useLocation();
  const history = useHistory();
  const adjustedKey = `reports/${r2_key}`;
  const [fetchReport, { data, loading, error }] = useLazyQuery(FETCH_REPORT_BY_R2_KEY);
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
      fetchReport({ variables: { r2_key: adjustedKey } }).then(({ data }) => {
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
          console.warn("No report data found.");
        }
      })
        .catch((error) => {
          console.error("Error fetching report:", error);
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
  if (organization === "function") {
    filtered = activeTab === "all"
      ? issues
      : (issuesByFunction[activeTab] || []);
  } else {
    // Filter by structure (content, navigation, forms)
    if (activeTab === "all") {
      filtered = issues;
    } else {
      filtered = issues.filter((issue: { selectors: string[] }) => {
        const selector = issue.selectors?.[0]?.toLowerCase() || '';

        if (activeTab === "content") {
          return selector.includes("p") ||
            selector.includes("h") ||
            selector.includes("img") ||
            selector.includes("span");
        }
        if (activeTab === "navigation") {
          return selector.includes("a") ||
            selector.includes("nav") ||
            selector.includes("button");
        }
        if (activeTab === "forms") {
          return selector.includes("form") ||
            selector.includes("input") ||
            selector.includes("select") ||
            selector.includes("textarea");
        }
        return false;
      });
    }
  }

  // Then filter by severity if not showing all
  if (issueFilter !== ISSUE_FILTERS.ALL) {
    filtered = filtered.filter((issue: { impact: string }) => issue.impact === issueFilter);
  }

  return filtered;
}, [issues, activeTab, organization, issuesByFunction, issueFilter]);

  // Reset activeTab when changing organization
  useEffect(() => {
    setActiveTab("all");
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
                    {loading ? "Scanning website..." : "Processing results..."}
                  </h3>

                  {/* Loader in the middle */}
                  <CircularProgress size={36} sx={{ color: 'blue-400' }} className="mb-6 mx-auto my-auto" />

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
    <div className="bg-report-blue text-foreground min-h-screen pt-20 pr-28 pb-20 pl-28">
      <div className="absolute top-4 left-10">
        <button
          onClick={handleBackToDashboard}
          className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Back to Dashboard
        </button>
      </div>

      <header className="text-center relative z-10 mb-16">
        <h1 className="mb-4">
          <span className="block text-3xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight break-words">
            Free
            <br />
            Website <span className="bg-gradient-to-r from-blue-300 to-blue-100 text-transparent bg-clip-text">Accessibility</span>
            <br />
            Checker
          </span>
          <span className="text-xl sm:text-2xl font-medium text-blue-300/90 tracking-wide block mt-2">
            WCAG, AODA & ADA Compliance Tool
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-blue-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          Instantly analyze your website for accessibility compliance.
          <span className="hidden sm:inline"><br /></span>
          Get a detailed report on WCAG 2.1 violations and actionable steps to protect your business.
        </p>
        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2 text-blue-200 bg-white/5 px-4 py-2 rounded-full">
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-blue-100">WCAG 2.1 AA Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-blue-200 bg-white/5 px-4 py-2 rounded-full">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-blue-100">ADA & Section 508</span>
          </div>
          <div className="flex items-center gap-2 text-blue-200 bg-white/5 px-4 py-2 rounded-full">
            <FileText className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-blue-100">Detailed Reports</span>
          </div>
        </div>
        <h1 className="mb-2">
          <span className="block text-xl sm:text-5xl lg:text-4xl font-medium text-white leading-tight tracking-tight break-words">
            <br />
            Scan results for <span className="bg-gradient-to-r from-blue-300 to-blue-100 font-medium text-transparent bg-clip-text">{fullUrl}</span>
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
              value={(totalStats.criticalIssues + totalStats.warnings).toString()}
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
          <OrganizationTabs
            active={organization}
            onChange={setOrganization}
          />

          {organization === "structure" ? (
            <StructureTabs
              active={activeTab}
              onChange={setActiveTab}
            />
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
              <h3 className="text-xl font-medium text-gray-700">No issues found!</h3>
              <p className="text-gray-500 mt-2">
                {issueFilter !== ISSUE_FILTERS.ALL
                  ? `No ${issueFilter} issues found.`
                  : "No accessibility issues detected for this category."}
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

              {filteredIssues.map((issue: { message: any; help: any; context: string | any[]; code: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | Iterable<ReactI18NextChild> | null | undefined; impact: string; category: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | Iterable<ReactI18NextChild> | null | undefined; source: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | Iterable<ReactI18NextChild> | null | undefined; description: any; selectors: string | any[]; recommended_action: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | Iterable<ReactI18NextChild> | null | undefined; }, index: React.Key | null | undefined) => (
                <div key={index} className="border rounded-lg bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 flex-1 pr-4 overflow-hidden">
                      {getIssueTypeIcon(issue)}
                      <h2 className="text-lg font-semibold truncate">
                        {issue.message || issue.help || 'Accessibility Issue'}
                      </h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${issue.impact === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : issue.impact === 'serious'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                      }`}>
                      {issue.impact === 'critical' ? 'Critical' :
                        issue.impact === 'serious' ? 'Serious' : 'Moderate'}
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
                      <h3 className="text-sm font-semibold mb-2">Description</h3>
                      <p className="text-gray-600">
                        {issue.description || 'No description available'}
                      </p>
                    </div>

                    {issue.context && issue.context.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Affected Element</h3>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border border-gray-element">
                          {issue.context[0]}
                        </pre>
                      </div>
                    )}

                    {issue.selectors && issue.selectors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">CSS Selector</h3>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border border-gray-element">
                          {issue.selectors[0]}
                        </pre>
                      </div>
                    )}

                    {issue.recommended_action && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Suggested Fix</h3>
                        <p className="text-gray-600">
                          {issue.recommended_action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                  <p className="text-blue-600 text-sm mt-1">
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
            className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4 relative"
          >
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-green-800 text-lg font-medium mb-1">
                  WebAbility Widget Detected! 🎉
                </h3>
                <p className="text-green-700">
                  Your website's accessibility score has been enhanced because you're using WebAbility's accessibility solution.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Base Score: {totalStats.originalScore}%
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-200 text-green-800">
                    Enhanced Score: {calculateEnhancedScore(totalStats.originalScore)}%
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

const IssuesSummary: React.FC<IssuesSummaryProps> = ({ filteredIssues, activeTab, organization, onFilterChange, activeFilter }) => {
  const criticalCount = filteredIssues.filter(i => i.impact === 'critical').length
  const warningCount = filteredIssues.filter(i => i.impact === 'serious').length
  const moderateCount = filteredIssues.filter(i => i.impact === 'moderate').length

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">
            Showing {filteredIssues.length} issues
            {activeTab !== "all" && organization === "function" ? ` for ${activeTab}` : ''}
          </h3>
        </div>

        {/* Add "All" filter button */}
        <button
          onClick={() => onFilterChange(ISSUE_FILTERS.ALL)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${activeFilter === ISSUE_FILTERS.ALL
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${activeFilter === ISSUE_FILTERS.CRITICAL
              ? 'bg-red-600 text-white'
              : 'bg-red-50 border border-red-100 hover:bg-red-100'
              }`}
          >
            <AlertTriangle className={`w-4 h-4 ${activeFilter === ISSUE_FILTERS.CRITICAL ? 'text-white' : 'text-red-600'
              }`} />
            <span className="text-sm">
              <span className={`font-semibold ${activeFilter === ISSUE_FILTERS.CRITICAL ? 'text-white' : 'text-red-700'
                }`}>{criticalCount}</span>
              <span className={
                activeFilter === ISSUE_FILTERS.CRITICAL ? 'text-white' : 'text-red-600'
              }> critical</span>
            </span>
          </button>
        )}

        {warningCount > 0 && (
          <button
            onClick={() => onFilterChange(ISSUE_FILTERS.WARNING)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${activeFilter === ISSUE_FILTERS.WARNING
              ? 'bg-amber-500 text-white'
              : 'bg-amber-50 border border-amber-100 hover:bg-amber-100'
              }`}
          >
            <AlertCircle className={`w-4 h-4 ${activeFilter === ISSUE_FILTERS.WARNING ? 'text-white' : 'text-amber-600'
              }`} />
            <span className="text-sm">
              <span className={`font-semibold ${activeFilter === ISSUE_FILTERS.WARNING ? 'text-white' : 'text-amber-700'
                }`}>{warningCount}</span>
              <span className={
                activeFilter === ISSUE_FILTERS.WARNING ? 'text-white' : 'text-amber-600'
              }> warnings</span>
            </span>
          </button>
        )}

        {moderateCount > 0 && (
          <button
            onClick={() => onFilterChange(ISSUE_FILTERS.MODERATE)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${activeFilter === ISSUE_FILTERS.MODERATE
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
              }`}
          >
            <Info className={`w-4 h-4 ${activeFilter === ISSUE_FILTERS.MODERATE ? 'text-white' : 'text-blue-600'
              }`} />
            <span className="text-sm">
              <span className={`font-semibold ${activeFilter === ISSUE_FILTERS.MODERATE ? 'text-white' : 'text-blue-700'
                }`}>{moderateCount}</span>
              <span className={
                activeFilter === ISSUE_FILTERS.MODERATE ? 'text-white' : 'text-blue-600'
              }> moderate</span>
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

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
        animate={{ top: "100%" }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute left-0 right-0 h-1 bg-blue-500/50 shadow-lg"
        style={{
          boxShadow: '0 0 20px 10px rgba(59, 130, 246, 0.3)'
        }}
      />

      {/* Scanning overlay */}
      <motion.div
        initial={{ top: 0 }}
        animate={{ top: "100%" }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute left-0 right-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent"
        style={{ transform: 'translateY(-50%)' }}
      />
    </div>
  )
}

const FunctionTabs: React.FC<FunctionTabsProps> = ({ active, onChange, functionalityNames }) => {
  // Function to assign relevant icons to functionality names
  const getIconForFunction = (name: string) => {
    const normalizedName = name.toLowerCase();
    if (normalizedName.includes('blind')) return <Eye className="w-4 h-4" />;
    if (normalizedName.includes('cognitive')) return <Brain className="w-4 h-4" />;
    if (normalizedName.includes('visual')) return <Eye className="w-4 h-4" />;
    if (normalizedName.includes('form')) return <FormInput className="w-4 h-4" />;
    if (normalizedName.includes('content')) return <FileText className="w-4 h-4" />;
    if (normalizedName.includes('navigation')) return <NavigationIcon className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />; // Default icon
  };

  return (
    <div className="bg-blue-900 w-full border-t border-blue-800">
      <div className="flex flex-wrap">
        <button
          onClick={() => onChange("all")}
          className={`px-4 py-2 text-sm transition-colors flex items-center gap-1.5 ${active === "all"
            ? "text-blue-400 border-b-2 border-blue-400"
            : "text-blue-100 hover:text-white"
            }`}
        >
          <LayoutGrid className="w-4 h-4" />
          All Issues
        </button>

        {functionalityNames.map(name => (
          <button
            key={name}
            onClick={() => onChange(name)}
            className={`px-4 py-2 text-sm transition-colors flex items-center gap-1.5 ${active === name
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-blue-100 hover:text-white"
              }`}
          >
            {getIconForFunction(name)}
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}


const OrganizationTabs: React.FC<OrganizationTabsProps> = ({ active, onChange }) => {
  return (
    <div className="bg-blue-100 rounded-lg p-1 mb-0">
      <div className="flex">
        <button
          onClick={() => onChange("structure")}
          className={`py-3 px-6 flex-1 text-center rounded-lg transition-colors ${active === "structure"
            ? "bg-white text-blue-900 border border-blue-300 shadow-sm"
            : "bg-transparent text-gray-700 hover:bg-blue-50"
            }`}
        >
          By Structure
        </button>
        <button
          onClick={() => onChange("function")}
          className={`py-3 px-6 flex-1 text-center rounded-lg transition-colors ${active === "function"
            ? "bg-white text-blue-900 border border-blue-300 shadow-sm"
            : "bg-transparent text-gray-700 hover:bg-blue-50"
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
    { id: "all", label: "All", icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "content", label: "Content", icon: <FileText className="w-4 h-4" /> },
    { id: "navigation", label: "Navigation", icon: <NavigationIcon className="w-4 h-4" /> },
    { id: "forms", label: "Forms", icon: <FormInput className="w-4 h-4" /> }
  ];

  return (
    <div className="bg-blue-900 w-full border-t border-blue-800">
      <div className="flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 text-sm transition-colors flex items-center gap-1.5 ${active === tab.id
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-blue-100 hover:text-white"
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
                {Math.min((originalScore ?? 0) + WEBABILITY_SCORE_BONUS, MAX_TOTAL_SCORE)}%
              </span>
            </span>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
              Web Ability Enhancement Applied
            </span>
          </div>
        )}
        <div className="text-gray-500">{description}</div>
      </div>
      {title === "Accessibility Score" && (
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
                    width: `${Math.min(WEBABILITY_SCORE_BONUS, 100 - (originalScore ?? 0))}%`
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

const ComplianceStatus: React.FC<ComplianceStatusProps> = ({ score, results }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');

  let status, message, icon, bgColor, textColor;

  if (score >= 80) {
    status = "Compliant";
    message = "Your website meets the basic requirements for accessibility.";
    icon = <CheckCircle className="w-8 h-8 text-green-600" />;
    bgColor = "bg-green-compliant";
    textColor = "text-green-800";
  } else if (score >= 50) {
    status = "Partially Compliant";
    message = "Your website meets some accessibility requirements but needs improvement.";
    icon = <AlertCircle className="w-8 h-8 text-yellow-600" />;
    bgColor = "bg-yellow-50";
    textColor = "text-yellow-800";
  } else {
    status = "Non-compliant";
    message = "Your website needs significant accessibility improvements.";
    icon = <AlertTriangle className="w-8 h-8 text-red-600" />;
    bgColor = "bg-red-not-compliant";
    textColor = "text-red-800";
  }

  // Email validation helper
  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Handle PDF generation and download only
  const handleDownloadSubmit = async () => {
    try {
      // Generate PDF using the same logic as ScannerHero
      const pdfBlob = generatePDF(results);

      // Create download link for immediate download
      const url = window.URL.createObjectURL(await pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'accessibility-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded!");
    } catch (error) {
      toast.error("Failed to generate the report. Please try again.");
      console.error('PDF generation error:', error);
    }
  };

  // Helper to convert Blob to base64
  function blobToBase64(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve((reader.result as string).split(",")[1]);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const generatePDF = async (
    reportData: { score: number; widgetInfo: { result: string }; url: string }
  ): Promise<Blob> => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    if (!reportData.url) {
      reportData.url = queryParams.get("domain") || "";
    }

    const { logoImage, logoUrl, accessibilityStatementLinkUrl } = await getLogoUrlOnly(reportData.url);
    const WEBABILITY_SCORE_BONUS = 45;
    const MAX_TOTAL_SCORE = 95;
    const issues = extractIssuesFromReport(reportData);

    const baseScore = reportData.score || 0;
    const hasWebAbility = reportData.widgetInfo?.result === "WebAbility";
    const enhancedScore = hasWebAbility ? Math.min(baseScore + WEBABILITY_SCORE_BONUS, MAX_TOTAL_SCORE) : baseScore;

    // Use the same logic as the UI status/message/color block above
    // Use the same colors and messages as in the UI
    let status: string, message: string, statusColor: [number, number, number];
    if (enhancedScore >= 80) {
      status = "Compliant";
      message = "Your website is highly accessible. Great job!";
      statusColor = [22, 163, 74]; // green-600
    } else if (enhancedScore >= 50) {
      status = "Partially Compliant";
      message = "Your website is partially accessible. Some improvements are needed.";
      statusColor = [202, 138, 4]; // yellow-600
    } else {
      status = "Not Compliant";
      message = "Your website needs significant accessibility improvements.";
      statusColor = [220, 38, 38]; // red-600
    }

    doc.setFillColor(21, 101, 192); // dark blue background
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F'); // increased height from 70 to 100
    
    
    
    let logoBottomY = 0; // Track where the logo ends vertically

    if (logoImage) {
      const img = new Image();
      img.src = logoImage;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          // Make the logo and container bigger
          const maxWidth = 48, maxHeight = 36; // increased size for a bigger logo
          let drawWidth = img.width, drawHeight = img.height;
          const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
          drawWidth *= scale; drawHeight *= scale;

          // Logo position
          const logoX = 0;   // further left (was 5)
          const logoY = 3;   // move the logo a little above (was 0 or undefined)

          // Draw a white rounded rectangle container behind the logo, but keep it as before
          const padding = 14; // a little more padding for bigger logo
          const containerX = logoX - padding;
          // Keep the container as before, do not move it up
          const containerYOffset = 10;
          const containerY = logoY - padding - containerYOffset;
          const containerW = drawWidth + 2 * padding-10;
          const containerH = drawHeight + 2 * padding;
          doc.setFillColor(255, 255, 255); // white
          doc.roundedRect(containerX, containerY, containerW, containerH, 8, 8, 'F'); // slightly larger radius

          // Draw the logo image on top of the white container, moved a little above
          doc.addImage(img, 'PNG', logoX, logoY, drawWidth, drawHeight);

          // Add a link to logoUrl if available
          if (logoUrl) {
            doc.link(logoX, logoY, drawWidth, drawHeight, {
              url: logoUrl,
              target: '_blank'
            });
          }

          // Calculate the bottom Y of the logo+container to position the next section
          logoBottomY = Math.max(logoY + drawHeight, containerY + containerH);
          resolve();
        };
        img.onerror = () => {
          // If image fails to load, just use default offset
          logoBottomY = 0;
          resolve();
        };
      });
    }

    // Define container dimensions and position
    const containerWidth = 170;
    const containerHeight = 60;
    const containerX = 105 - containerWidth / 2;
    // Place the container after the logo image (with some vertical gap)
    const containerY = (logoBottomY || 0) + 10; // 10 units gap after logo

    // Draw white rounded rectangle container with black outline
    doc.setFillColor(255, 255, 255); // white fill
    doc.setDrawColor(220, 220, 220); // light grey outline
    doc.setLineWidth(0.2); // default line width
    doc.roundedRect(containerX, containerY, containerWidth, containerHeight, 10, 10, 'FD');

    // Now draw the text inside the container, moved down accordingly
    let textY = containerY + 13; // first line, some padding from top

    doc.setFontSize(15);
    doc.setTextColor(0,0,0); 
    // Compose the full string and measure widths
    const label = "Scan results for ";
    const url = `${reportData.url}`;
    const labelWidth = doc.getTextWidth(label);
    const urlWidth = doc.getTextWidth(url);
    const totalWidth = labelWidth + urlWidth;
    // Calculate starting X so the whole line is centered
    const startX = 105 - totalWidth / 2;
    // Draw the label
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85); // slate-800 for message
    doc.text(label, startX, textY, { align: "left" });
    // Draw the URL in bold, immediately after the label, no overlap
    doc.setFont("helvetica", "bold");
    doc.text(url, startX + labelWidth, textY, { align: "left" });
    doc.setFont("helvetica", "normal");

    textY += 12;
    doc.setFontSize(20);
    doc.setTextColor(...statusColor);
    doc.setFont("helvetica", "bold");
    doc.text(status, 105, textY, { align: "center" });

    textY += 9;
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85); // slate-800 for message
    doc.setFont("helvetica", "normal");
    doc.text(message, 105, textY, { align: "center" });

    textY += 9;
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-800 for message
    doc.text(`${new Date().toDateString()}`, 105, textY, { align: "center" });

    // Add extra space after the container before the next section
    // --- END REPLACEMENT BLOCK ---

    // --- ADD CIRCLES FOR TOTAL ERRORS AND PERCENTAGE ---
    // Draw two circles farther down below the hero section, farther apart and centered horizontally
    // Circle 1: Total Errors
    // Circle 2: Percentage (Score)
    // Dynamically position the circles below the container, with extra spacing
    const circleY = containerY + containerHeight + 25; // 25 units gap after the container
    const circleRadius = 15;
    // Move the circles farther apart, centered horizontally
    const centerX = 105;
    const gap = 40; // increased gap for more distance between circles
    const circle1X = centerX - circleRadius - gap / 2;
    const circle2X = centerX + circleRadius + gap / 2;

    // Circle 1: Total Errors (filled dark blue)
    doc.setDrawColor(21, 101, 192); // dark blue border
    doc.setLineWidth(1.5);
    doc.setFillColor(21, 101, 192); // dark blue fill
    doc.circle(circle1X, circleY, circleRadius, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19); // Increased font size for better visibility
    doc.setTextColor(255, 255, 255); // White text

    // Center the number vertically and horizontally in the circle
    doc.text(`${issues.length}`, circle1X, circleY, { align: "center", baseline: "middle" });
    // The label "Total Errors" is not visible because the text color is white on a dark blue background,
    // but the label is placed below the circle, which is on a white/light background.
    // Change the text color to a dark blue for visibility.
    doc.setFontSize(10); // Slightly larger label
    doc.setTextColor(21, 101, 192); // dark blue for visibility on white background
    doc.setFont("helvetica", "normal");
    doc.text("Total Errors", circle1X, circleY + circleRadius + 9, { align: "center"  });

    // Circle 2: Percentage (Score) (filled normal blue)
    doc.setDrawColor(33, 150, 243); // normal blue border
    doc.setLineWidth(1.5);
    doc.setFillColor(33, 150, 243); // normal blue fill
    doc.circle(circle2X, circleY, circleRadius, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19); // Increased font size for better visibility
    doc.setTextColor(255, 255, 255); // White text
    const scoreText = `${Math.round(enhancedScore)}%`;
    const scoreFontSize = 19;
    doc.setFontSize(scoreFontSize);
    // Estimate text height: jsPDF uses approx 0.35 * fontSize for text height
    const textHeight = scoreFontSize * 0.35;
    // Center vertically: circleY + (textHeight / 2) is a good approximation
    doc.text(scoreText, circle2X, circleY , { align: "center", baseline: "middle" });

    doc.setFontSize(10); // Slightly larger label
    doc.setTextColor(21, 101, 192); // dark blue for visibility on white background
    doc.setFont("helvetica", "normal");
    doc.text("Score", circle2X, circleY + circleRadius + 9, { align: "center" });
    // --- END CIRCLES ---

    // SEVERITY SUMMARY BOXES
    // Place the summary boxes just below the circles, with a 30 unit gap
    const yStart = circleY + circleRadius + 30;
    const total = issues.length;
    const counts = {
      critical: issues.filter(i => i.impact === 'critical').length,
      serious: issues.filter(i => i.impact === 'serious').length,
      moderate: issues.filter(i => i.impact === 'moderate').length
    };
    // Use blue shades for all summary boxes
    const summaryBoxes = [
      { label: "Severe", count: counts.critical + counts.serious, color: [21, 101, 192] }, // dark blue
      { label: "Moderate", count: counts.moderate, color: [33, 150, 243] }, // normal blue
      { label: "Mild", count: total - (counts.critical + counts.serious + counts.moderate), color: [187, 222, 251] } // light blue
    ];

    let x = 20;
    for (const box of summaryBoxes) {
      doc.setFillColor(box.color[0], box.color[1], box.color[2]);
      doc.roundedRect(x, yStart, 55, 20, 3, 3, 'F');
      doc.setTextColor(box.label === "Mild" ? 33 : 255, box.label === "Mild" ? 33 : 255, box.label === "Mild" ? 33 : 255); // dark text for light blue, white for others
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${box.count}`, x + 4, yStart + 8);
      doc.setFontSize(10);
      doc.text(box.label, x + 4, yStart + 16);
      x += 60;
    }

    // SCAN RESULT BLOCK
    // Do NOT write status, message, and date again here (already in hero section)
    // TABLE
    const yTable = yStart + 40;

    // --- CUSTOM TABLE LAYOUT: Issue/Message row, then Contexts, then Fixes ---
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerHeight = 15; // Height reserved for the footer (in jsPDF units)

    // Helper to ensure array
    const toArray = (val: any) => Array.isArray(val) ? val : (val ? [val] : []);

    // Build the rows
    let tableBody: any[] = [];

    issues.forEach((issue, issueIdx) => {
      // Add header row for each issue with beautiful styling
      tableBody.push([
        {
          content: 'Issue',
          colSpan: 2,
          styles: {
            fillColor: [255, 255, 255], // white background
            textColor: [0, 0, 0], // black text
            fontStyle: 'bold',
            fontSize: 14,
            halign: 'center',
            cellPadding: 8,
            lineWidth: 1,
            lineColor: [226, 232, 240], // subtle border
          }
        },
        {
          content: 'Message',
          colSpan: 2,
          styles: {
            fillColor: [255, 255, 255], // matching white background
            textColor: [0, 0, 0], // black text
            fontStyle: 'bold',
            fontSize: 14,
            halign: 'center',
            cellPadding: 8,
            lineWidth: 1,
            lineColor: [226, 232, 240], // subtle border
          }
        }
      ]);

      // Row 1: Issue + Message with elegant code block styling
      tableBody.push([
        {
          content: `${issue.code ? `${issue.code} (${issue.impact})` : ''}`,
          colSpan: 2,
          styles: {
            fontStyle: 'bold',
            fontSize: 12,
            textColor: [30, 41, 59], // dark navy text
            halign: 'left',
            cellPadding: 10,
            fillColor: [248, 250, 252], // elegant light gray
            lineWidth: 1,
            lineColor: [226, 232, 240], // subtle border
            font: 'courier',
            minCellHeight: 30
          }
        },
        {
          content: `${issue.message || ''}`,
          colSpan: 2,
          styles: {
            fontStyle: 'normal',
            fontSize: 12,
            textColor: [30, 41, 59], // dark navy text
            halign: 'left',
            cellPadding: 10,
            fillColor: [248, 250, 252], // elegant light gray
            lineWidth: 1,
            lineColor: [226, 232, 240], // subtle border
            font: 'courier',
            minCellHeight: 30
          }
        }
      ]);

// Contexts block (styled like code snapshots with numbers and black rounded boxes)
const contexts = toArray(issue.context).filter(Boolean);

if (contexts.length > 0) {
  // Heading: "Context:"
  tableBody.push([
    {
      content: 'Context:',
      colSpan: 4,
      styles: {
        fontStyle: 'bolditalic',
        fontSize: 11,
        textColor: [0, 0, 0],
        halign: 'left',
        cellPadding: 5,
        fillColor: [255, 255, 255],
        lineWidth: 0
      }
    }
  ]);

  contexts.forEach((ctx, index) => {
    // Row: number label + code block
    tableBody.push([
      {
        content: `${index + 1}`,
        pageBreak:"avoid",
        styles: {
          fontStyle: 'bold',
          fontSize: 11,
          textColor: [255, 255, 255],
          fillColor: [30, 41, 59], // dark navy
          halign: 'center',
          valign: 'middle',
          cellPadding: 6,
          lineWidth: 0,
          minCellHeight: 25
        },
      },
      {
        content: ctx,
        colSpan: 3,
        pageBreak:"avoid",
        styles: {
          font: 'courier',
          fontSize: 10,
          textColor: [255, 255, 255],
          fillColor: [15, 23, 42], // deeper navy background
          halign: 'left',
          valign: 'middle',
          cellPadding: 10,
          lineWidth: 0,
          minCellHeight: 25
        },
        _isCodeBlock: true,
      }
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
            minCellHeight: 8
          }
        }
      ]);
    }
  });
}



      // Row 3: Fix(es) - display heading first, then each fix in its own white back container with spacing
      const fixes = toArray(issue.recommended_action);
      if (fixes.length > 0 && fixes.some(f => !!f)) {
        // Heading row for Fix
        tableBody.push([
          {
            content: 'Fix:',
            colSpan: 4,
            styles: {
              fontStyle: 'bolditalic',
              fontSize: 11,
              textColor: [0, 0, 0], // black text
              halign: 'left',
              cellPadding: 5,
              fillColor: [255, 255, 255], // white background
              lineWidth: 0
            }
          }
        ]);
        // Each fix in its own row/container, with white background and spacing
        const filteredFixes = fixes.filter(Boolean);
        filteredFixes.forEach((fix, fixIdx) => {
          tableBody.push([
            {
              content: `${fixIdx + 1}. ${fix}`,
              colSpan: 4,
              styles: {
                fontStyle: 'normal',
                fontSize: 11,
                textColor: [0, 0, 0], // black text
                halign: 'left',
                cellPadding: { top: 10, right: 8, bottom: 10, left: 8 }, // more vertical space for separation
                fillColor: [255, 255, 255], // white background for back container
                lineWidth: 0
              }
            }
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
                  minCellHeight: 6 // vertical space between containers
                }
              }
            ]);
          }
        });
      }
    });

    // No global table header, since each issue has its own header row
    autoTable(doc, {
      startY: yTable,
      margin: { left: 15, right: 15, top: 0, bottom: footerHeight },
      head: [],
      body: tableBody,
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 38 },
        2: { cellWidth: 50 },
        3: { cellWidth: 45 }
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
        doc.link(15, footerY - 3, doc.getTextWidth('Accessibility Statement'), 4, {
          url: accessibilityStatementLinkUrl,
          target: '_blank'
        });
      }
    }

    return doc.output("blob");
  };

  return (
    <>
      <div className={`${bgColor} rounded-lg shadow-sm mb-6 flex justify-between items-center min-h-[120px]`}>
        <div className="flex items-center p-4">
          <div className="bg-white/70 p-2 rounded-full mr-4">
            {icon}
          </div>
          <div>
            <h3 className={`text-xl font-semibold ${textColor}`}>{status}</h3>
            <p className={`${textColor}/80`}>{message}</p>
          </div>
        </div>

        <div className="relative mr-4">
          <button
             onClick={handleDownloadSubmit}
            className="whitespace-nowrap px-6 py-3 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700 transition-colors"
          >
            Get Free Report
          </button>
        </div>
      </div>

      {/* Email Modal
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Download Your Accessibility Report</h3>
            <p className="text-gray-600 mb-4">
              Enter your email address to receive and download the accessibility report as a PDF.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="text-xs text-gray-500 mb-4">
              By submitting this form, you consent to receive updates about WebAbility and its services.
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadSubmit}
                disabled={!isValidEmail(email)}
                className={`px-4 py-2 rounded-lg text-white ${!isValidEmail(email)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                Download Report
              </button>
            </div>
          </div>
        </div>
      )} */}
    </>
  );
};

// Helper function to get issue category icon
function getIssueTypeIcon(issue: { message: any; help?: any; context?: string | any[]; code?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | Iterable<ReactI18NextChild> | null | undefined; impact?: string; category?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | Iterable<ReactI18NextChild> | null | undefined; source?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | Iterable<ReactI18NextChild> | null | undefined; description?: any; selectors?: string | any[]; recommended_action?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | Iterable<ReactI18NextChild> | null | undefined; }) {
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
  MODERATE: 'moderate'
};

// Extract issues from report structure
function extractIssuesFromReport(report: any) {
  const issues: any[] = []

  // Check if we have the new data structure with top-level ByFunctions
  if (report?.ByFunctions && Array.isArray(report.ByFunctions)) {
    report.ByFunctions.forEach((funcGroup: { FunctionalityName: any; Errors: any[]; }) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach(error => {
          const impact = mapIssueToImpact(error.message, error.code)

          issues.push({
            ...error,
            impact,
            source: error.__typename === 'htmlCsOutput' ? 'HTML_CS' : 'AXE Core',
            functionality: funcGroup.FunctionalityName
          })
        })
      }
    })
  }

  // Try the axe structure
  if (report?.axe?.ByFunction && Array.isArray(report.axe.ByFunction)) {
    report.axe.ByFunction.forEach((funcGroup: { FunctionalityName: any; Errors: any[]; }) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach(error => {
          const impact = mapIssueToImpact(error.message, error.code)

          issues.push({
            ...error,
            impact,
            source: 'AXE Core',
            functionality: funcGroup.FunctionalityName
          })
        })
      }
    })
  }

  // Try the htmlcs structure
  if (report?.htmlcs?.ByFunction && Array.isArray(report.htmlcs.ByFunction)) {
    report.htmlcs.ByFunction.forEach((funcGroup: { FunctionalityName: any; Errors: any[]; }) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach(error => {
          const impact = mapIssueToImpact(error.message, error.code)

          issues.push({
            ...error,
            impact,
            source: 'HTML_CS',
            functionality: funcGroup.FunctionalityName
          })
        })
      }
    })
  }

  return issues;
}

function countIssuesBySeverity(issues: any[]) {
  const counts = { criticalIssues: 0, warnings: 0, moderateIssues: 0, totalIssues: issues.length };
  issues.forEach((issue) => {
    if (issue.impact === 'critical') counts.criticalIssues++;
    else if (issue.impact === 'serious') counts.warnings++;
    else counts.moderateIssues++;
  });
  return counts;
}

function mapIssueToImpact(message: string, code: any) {
  if (!message && !code) return 'moderate'

  const lowerMsg = (message || '').toLowerCase()
  const lowerCode = (code || '').toLowerCase()

  // Critical issues
  if (
    lowerMsg.includes('color contrast') ||
    lowerMsg.includes('minimum contrast') ||
    lowerCode.includes('1.4.3') ||
    (lowerMsg.includes('aria hidden') && lowerMsg.includes('focusable')) ||
    lowerMsg.includes('links must be distinguishable')
  ) {
    return 'critical'
  }

  // Serious issues
  if (
    lowerMsg.includes('aria attributes') ||
    lowerMsg.includes('permitted aria') ||
    lowerMsg.includes('labels or instructions') ||
    lowerMsg.includes('error identification')
  ) {
    return 'serious'
  }

  return 'moderate'
}

export default ReportView;