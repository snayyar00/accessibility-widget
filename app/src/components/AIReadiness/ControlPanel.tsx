import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLazyQuery } from '@apollo/client';
import { useHistory } from 'react-router-dom';
import FETCH_ACCESSIBILITY_REPORT_KEYS from '@/queries/accessibility/fetchAccessibilityReport';
import {
  Globe,
  FileText,
  Code,
  Shield,
  Search,
  Zap,
  Database,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Bot,
  FileCode,
  Network,
  Info,
  Eye,
  Image,
  Brain,
} from 'lucide-react';
import ScoreChart from './ScoreChart';
import RadarChart from './RadarChart';
import MetricBars from './MetricBars';

// AI Readiness Control Panel Component

interface ControlPanelProps {
  isAnalyzing: boolean;
  showResults: boolean;
  url: string;
  analysisData?: any;
  heatmapData?: any;
  onReset: () => void;
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  status: 'pending' | 'checking' | 'pass' | 'fail' | 'warning';
  score?: number;
  details?: string;
  recommendation?: string;
  actionItems?: string[];
  tooltip?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isAnalyzing,
  showResults,
  url,
  analysisData,
  heatmapData,
  onReset,
}) => {
  const history = useHistory();
  const [combinedChecks, setCombinedChecks] = useState<CheckItem[]>([]);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [selectedHeatmapCategory, setSelectedHeatmapCategory] = useState<
    string | null
  >(null);
  const heatmapRef = useRef<HTMLDivElement | null>(null);

  // State for accessibility score
  const [accessibilityScore, setAccessibilityScore] = useState<number | null>(
    null,
  );

  // GraphQL query for accessibility reports
  const [fetchAccessibilityReports] = useLazyQuery(
    FETCH_ACCESSIBILITY_REPORT_KEYS,
    {
      onCompleted: (data) => {
        if (data?.fetchAccessibilityReportFromR2?.length > 0) {
          const mostRecent = data.fetchAccessibilityReportFromR2[0];
          console.log('Accessibility Score:', mostRecent.score);
          setAccessibilityScore(mostRecent.score);
        } else {
          console.log('No accessibility reports found');
          setAccessibilityScore(null);
        }
      },
      onError: (error) => {
        console.error('Error fetching accessibility reports:', error);
      },
    },
  );

  // Handle responsive screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };

    // Check on mount
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Normalize domain function
  const normalizeDomain = (domain: string) => {
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  };

  // Fetch accessibility score when URL changes
  useEffect(() => {
    if (url) {
      const normalizedDomain = normalizeDomain(url);
      console.log(
        'Fetching accessibility reports for domain:',
        normalizedDomain,
      );

      fetchAccessibilityReports({
        variables: {
          url: normalizedDomain,
        },
      });
    }
  }, [url, fetchAccessibilityReports]);

  const [checks, setChecks] = useState<CheckItem[]>([
    {
      id: 'heading-structure',
      label: 'Heading Hierarchy',
      description: 'H1-H6 structure',
      icon: FileText,
      status: 'pending',
    },
    {
      id: 'readability',
      label: 'Readability',
      description: 'Content clarity',
      icon: Globe,
      status: 'pending',
    },
    {
      id: 'meta-tags',
      label: 'Metadata Quality',
      description: 'Title, desc, author',
      icon: FileCode,
      status: 'pending',
    },
    {
      id: 'semantic-html',
      label: 'Semantic HTML',
      description: 'Proper HTML5 tags',
      icon: Code,
      status: 'pending',
    },
    {
      id: 'accessibility',
      label: 'Accessibility',
      description: 'Alt text & ARIA',
      icon: Eye,
      status: 'pending',
    },
    {
      id: 'llms-txt',
      label: 'LLMs.txt',
      description: 'AI permissions',
      icon: Bot,
      status: 'pending',
    },
    {
      id: 'robots-txt',
      label: 'Robots.txt',
      description: 'Crawler rules',
      icon: Shield,
      status: 'pending',
    },
    {
      id: 'sitemap',
      label: 'Sitemap',
      description: 'Site structure',
      icon: Network,
      status: 'pending',
    },
  ]);

  const [overallScore, setOverallScore] = useState(0);
  const [currentCheckIndex, setCurrentCheckIndex] = useState(-1);
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);
  const [hoveredCheck, setHoveredCheck] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'grid' | 'chart' | 'bars' | 'heatmap'
  >('grid');

  useEffect(() => {
    if (analysisData && analysisData.checks && showResults) {
      // Use real data from API
      const mappedChecks = analysisData.checks.map((check: any) => ({
        ...check,
        icon: checks.find((c) => c.id === check.id)?.icon || FileText,
        description:
          check.details || checks.find((c) => c.id === check.id)?.description,
      }));
      setChecks(mappedChecks);
      setCombinedChecks(mappedChecks); // Initialize with basic checks
      setOverallScore(analysisData.overallScore || 0);
      setCurrentCheckIndex(-1);
    } else if (isAnalyzing) {
      // Reset all checks when starting analysis
      const resetChecks = checks.map((check) => ({
        ...check,
        status: 'pending' as const,
      }));
      setChecks(resetChecks);
      setCombinedChecks(resetChecks); // Reset combined checks too
      setCurrentCheckIndex(0);
      setOverallScore(0);

      // Visual animation while waiting for real results
      const checkInterval = setInterval(() => {
        setCurrentCheckIndex((prev) => {
          if (prev >= checks.length - 1) {
            clearInterval(checkInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 200);

      return () => clearInterval(checkInterval);
    }

    // Return undefined for the first branch to satisfy TypeScript
    return undefined;
  }, [isAnalyzing, showResults, analysisData]);

  useEffect(() => {
    if (
      currentCheckIndex >= 0 &&
      currentCheckIndex < checks.length &&
      isAnalyzing
    ) {
      // Mark current as checking during animation
      setChecks((prev) =>
        prev.map((check, index) => {
          if (index === currentCheckIndex) {
            return { ...check, status: 'checking' };
          }
          if (index < currentCheckIndex) {
            return { ...check, status: 'checking' };
          }
          return check;
        }),
      );

      // Update combinedChecks to show the animation
      setCombinedChecks((prev) =>
        prev.map((check, index) => {
          if (index === currentCheckIndex) {
            return { ...check, status: 'checking' };
          }
          if (index < currentCheckIndex) {
            return { ...check, status: 'checking' };
          }
          return check;
        }),
      );
    }
  }, [currentCheckIndex, checks.length, isAnalyzing]);

  const getStatusIcon = (status: CheckItem['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      case 'pass':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border border-gray-300" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Heatmap helper functions
  const getAvailableHeatmapCategories = () => {
    if (!heatmapData?.insights?.data?.heatmap_urls) return [];

    const categoryMeta: Record<
      string,
      { heading: string; description: string; icon: string }
    > = {
      conversion_focus: {
        heading: 'Conversion Impact Heatmap',
        description:
          'Shows which buttons or links people click the most, so you can see whats working and get more sales or sign-ups.',
        icon: '',
      },
      customer_journey: {
        heading: 'Interaction Flow Heatmap',
        description:
          'Shows the path people take through your website where they start, where they click, and where they leave so you can make it easier for them to find what they need.',
        icon: '',
      },
      roi_detailed: {
        heading: 'Precision ROI Heatmap',
        description:
          'Shows exactly which parts of your page are making you money, using a very detailed scan that highlights whats worth keeping and whats not.',
        icon: '',
      },
    };

    const availableCategoryIds = Object.keys(
      heatmapData.insights.data.heatmap_urls,
    );

    return availableCategoryIds
      .map((categoryId) => {
        const meta = categoryMeta[categoryId];
        if (!meta) return null;

        const url = heatmapData.insights.data.heatmap_urls[categoryId];
        const style = heatmapData.insights.data.heatmap_styles[categoryId];

        if (!url || !style) return null;

        return {
          id: categoryId,
          name: meta.heading,
          heading: meta.heading,
          description: meta.description,
          icon: meta.icon,
          url: url,
          style: style,
        };
      })
      .filter(
        (category): category is NonNullable<typeof category> =>
          category !== null,
      );
  };

  const getSelectedHeatmapUrl = () => {
    if (!heatmapData?.insights?.data?.heatmap_urls || !selectedHeatmapCategory)
      return null;
    return heatmapData.insights.data.heatmap_urls[selectedHeatmapCategory];
  };

  // Auto-select first heatmap category when heatmap view is selected
  useEffect(() => {
    if (viewMode === 'heatmap' && !selectedHeatmapCategory && heatmapData) {
      const availableCategories = getAvailableHeatmapCategories();
      if (availableCategories.length > 0) {
        setSelectedHeatmapCategory(availableCategories[0].id);
      }
    }
  }, [viewMode, heatmapData, selectedHeatmapCategory]);

  // Scroll to heatmap when category is selected
  useEffect(() => {
    if (
      selectedHeatmapCategory &&
      getSelectedHeatmapUrl() &&
      viewMode === 'heatmap'
    ) {
      heatmapRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [selectedHeatmapCategory, viewMode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl mx-auto"
    >
      {/* Header */}
      <motion.div
        className="text-center mb-12 pt-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Enhanced Header Section */}
        <div className="relative">
          {/* Background gradient decoration */}

          {/* Main content */}
          <div className="relative">
            {/* Icon with enhanced styling */}
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl mb-6 shadow-2xl"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Brain className="w-10 h-10 text-white drop-shadow-sm" />
            </motion.div>

            {/* Title with enhanced typography */}
            <motion.h2
              className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              AI Readiness Analysis
            </motion.h2>

            {/* Subtitle with better styling */}
            <motion.div
              className="inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
                <p className="text-lg text-gray-700 font-medium">
                  Single-page snapshot of{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                    {url}
                  </span>
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {showResults && (
          <>
            {/* View Mode Toggle - Moved above score */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 mb-8 flex justify-center gap-4"
            >
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'chart'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Radar Chart
              </button>
              {heatmapData && getAvailableHeatmapCategories().length > 0 && (
                <button
                  onClick={() => setViewMode('heatmap')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'heatmap'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Heatmap
                </button>
              )}
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.5 }}
              className="flex justify-center"
            >
              <ScoreChart score={overallScore} size={180} />
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Conditional rendering based on view mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-4 gap-4 mb-10 px-4 relative">
          {combinedChecks.map((check, index) => {
            const isActive = index === currentCheckIndex;

            return (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{
                  delay: index * 0.1,
                  scale: { type: 'spring', stiffness: 300 },
                }}
                className={`
                   relative p-4 rounded-lg transition-all bg-white border border-gray-200
                   ${isActive ? 'border-orange-300 shadow-lg' : ''}
                   ${
                     check.status !== 'pending' && check.status !== 'checking'
                       ? 'cursor-pointer hover:shadow-md'
                       : ''
                   }
                 `}
                onClick={() => {
                  if (
                    check.status !== 'pending' &&
                    check.status !== 'checking'
                  ) {
                    setSelectedCheck(
                      selectedCheck === check.id ? null : check.id,
                    );
                  }
                }}
                onMouseEnter={() => setHoveredCheck(check.id)}
                onMouseLeave={() => setHoveredCheck(null)}
              >
                <div className="relative">
                  <div className="flex items-start justify-end mb-3">
                    {getStatusIcon(check.status)}
                  </div>

                  <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
                    {check.label}
                    {check.tooltip && (
                      <div className="relative inline-block">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 transition-colors" />
                        <AnimatePresence>
                          {hoveredCheck === check.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50 pointer-events-none"
                            >
                              {check.tooltip}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </h3>

                  <p className="text-xs text-gray-600">{check.description}</p>

                  {/* Display accessibility score for accessibility card */}
                  {check.id === 'accessibility' && accessibilityScore !== null && (
                    <div className="mt-2 text-xs text-gray-700">
                      <div>Accessibility Score: {accessibilityScore}</div>
                    </div>
                  )}

                  {check.status !== 'pending' && check.status !== 'checking' && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2"
                      >
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className={`
                              h-full rounded-full
                              ${check.status === 'pass' ? 'bg-green-500' : ''}
                              ${
                                check.status === 'warning'
                                  ? 'bg-yellow-500'
                                  : ''
                              }
                              ${check.status === 'fail' ? 'bg-red-500' : ''}
                            `}
                            initial={{ width: 0 }}
                            animate={{ width: `${check.score}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-xs text-gray-400 mt-1 text-center"
                      >
                        Click for details
                      </motion.div>
                    </>
                  )}
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {selectedCheck === check.id && check.details && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-gray-200"
                    >
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            Status
                          </div>
                          <div className="text-xs text-gray-900">
                            {check.details}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            Recommendation
                          </div>
                          <div className="text-xs text-gray-600">
                            {check.recommendation}
                          </div>
                          {check.actionItems && check.actionItems.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {check.actionItems.map(
                                (item: string, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-xs text-gray-600"
                                  >
                                    <span className="text-orange-500 mt-0.5">
                                      •
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ),
                              )}
                            </ul>
                          )}
                        </div>

                        {/* Display accessibility score link in details for accessibility card */}

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => history.push('/scanner')}
                            className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors duration-200"
                          >
                            Click here to check latest score
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Radar Chart View */}
      {viewMode === 'chart' && showResults && (
        <div>
          <motion.div
            className="flex justify-center gap-10 mb-10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Basic Analysis Chart */}
            <div className="flex flex-col items-center">
              <h3 className="text-lg text-gray-900 mb-4 font-medium">
                Basic Analysis
              </h3>
              <RadarChart
                data={checks
                  .filter(
                    (check) =>
                      check.status !== 'pending' && check.status !== 'checking',
                  )
                  .slice(0, 8)
                  .map((check) => ({
                    label:
                      check.label.length > 12
                        ? check.label.substring(0, 12) + '...'
                        : check.label,
                    score: check.score || 0,
                  }))}
                size={isSmallScreen ? 250 : 350}
              />
              <div className="mt-4 text-center">
                <div className="text-2xl text-gray-900">{overallScore}%</div>
                <div className="text-sm text-gray-500">Overall Score</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bar Chart View */}
      {viewMode === 'bars' && showResults && (
        <motion.div
          className="px-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MetricBars
            metrics={combinedChecks
              .filter(
                (check) =>
                  check.status !== 'pending' && check.status !== 'checking',
              )
              .map((check) => ({
                label: check.label,
                score: check.score || 0,
                status: check.status as 'pass' | 'warning' | 'fail',
                category: ['robots-txt', 'sitemap', 'llms-txt'].includes(
                  check.id,
                )
                  ? 'domain'
                  : 'page',
                details: check.details,
                recommendation: check.recommendation,
                actionItems: check.actionItems,
              }))}
          />
        </motion.div>
      )}

      {/* Heatmap View */}
      {viewMode === 'heatmap' && showResults && heatmapData && (
        <motion.div
          className="px-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Heatmap Categories */}
          <div className="bg-white rounded-xl p-5 sm:p-7 shadow-lg mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              Available Heatmap Categories
            </h3>
            <div className="flex flex-wrap gap-3 sm:gap-4 sm:justify-center">
              {getAvailableHeatmapCategories().map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedHeatmapCategory(category.id)}
                  className={`sm:w-full px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-xs sm:text-base ${
                    selectedHeatmapCategory === category.id
                      ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Heatmap Display */}
          {selectedHeatmapCategory && getSelectedHeatmapUrl() && (
            <div
              ref={heatmapRef}
              className="bg-white rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 sm:p-7 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3 lg:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Image className="w-5 h-5 sm:w-6 sm:h-6 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {
                          getAvailableHeatmapCategories().find(
                            (cat) => cat.id === selectedHeatmapCategory,
                          )?.name
                        }
                      </h3>
                      <p className="text-gray-600 text-sm sm:text-base">
                        {
                          getAvailableHeatmapCategories().find(
                            (cat) => cat.id === selectedHeatmapCategory,
                          )?.description
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Click image to view full size</span>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <div className="relative overflow-hidden rounded-lg shadow-lg">
                  <img
                    src={getSelectedHeatmapUrl() || '/placeholder.svg'}
                    alt={`${
                      getAvailableHeatmapCategories().find(
                        (cat) => cat.id === selectedHeatmapCategory,
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
          {heatmapData && !selectedHeatmapCategory && (
            <div className="bg-blue-100 rounded-xl p-5 sm:p-10 text-center shadow-lg">
              <div className="w-12 h-12 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-6">
                <Image className="w-6 h-6 sm:w-10 sm:h-10 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                Select a Heatmap Category
              </h3>
              <p className="text-gray-600 text-xs sm:text-base px-2 sm:px-0">
                Choose a heatmap category from above to view the detailed
                analysis and insights.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ControlPanel;
