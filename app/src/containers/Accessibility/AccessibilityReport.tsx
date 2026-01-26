import React, { useEffect, useState, useRef, useMemo } from 'react';
import './Accessibility.css'; // Ensure your CSS file includes styles for the accordion
import { AiFillCloseCircle } from 'react-icons/ai';
import { FaGaugeSimpleHigh } from 'react-icons/fa6';
import { FaUniversalAccess, FaCheckCircle, FaCircle, FaTimes, FaClock } from 'react-icons/fa';
import { Zap, RefreshCw, BarChart3, ChevronDown } from 'lucide-react';
import { TbZoomScanFilled } from 'react-icons/tb';
import { Link } from 'react-router-dom';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import SAVE_ACCESSIBILITY_REPORT from '@/queries/accessibility/saveAccessibilityReport';
import GET_USER_SITES from '@/queries/sites/getSites';
import FETCH_ACCESSIBILITY_REPORT_KEYS from '@/queries/accessibility/fetchAccessibilityReport';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';
import { Site } from '@/generated/graphql';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { toast } from 'sonner';
import isValidDomain from '@/utils/verifyDomain';
import Button from '@mui/joy/Button';
import AccordionGroup from '@mui/joy/AccordionGroup';
import Accordion from '@mui/joy/Accordion';
import ToggleButtonGroup from '@mui/joy/ToggleButtonGroup';
import Stack from '@mui/joy/Stack';
import { generatePDF, generateShortPDF } from '@/utils/generatePDF';
import useOrganizationName from '@/hooks/useOrganizationName';
import {
  translateText,
  translateMultipleTexts,
  LANGUAGES,
  deduplicateIssuesByMessage,
  isCodeCompliant,
  CURATED_WCAG_CODES,
} from '@/utils/translator';

import {
  getRootDomain,
  getFullDomain,
  isValidRootDomainFormat,
  isValidFullDomainFormat,
  isIpAddress,
} from '@/utils/domainUtils';
import AccordionDetails, {
  accordionDetailsClasses,
} from '@mui/joy/AccordionDetails';
import AccordionSummary, {
  accordionSummaryClasses,
} from '@mui/joy/AccordionSummary';
import {
  ButtonGroup,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  CircularProgress,
  Input,
  Typography,
  Box,
} from '@mui/material';
import { TbReportSearch } from 'react-icons/tb';
import WebsiteScanAnimation from '@/components/Animations/WebsiteScanAnimation';
import LeftArrowAnimation from '@/components/Animations/LeftArrowAnimation';
import AccessibilityScoreCard from './AccessibiltyScoreCard';
import AccordionCard from './AccordionCard';
import AccessibilityIssuesGroup from './AccessibilityIssuesGroup';
import './AccessibilityReport.css';
import IssueCategoryCard from './IssueCategoryCard';
import SitePreviewSVG from './SitePreviewSVG';
import ByFunctionSVG from './ByFunctionSVG';
import ByWCGAGuildelinesSVG from './ByWCGAGuidlinesSVG';
import { check } from 'prettier';
import ReactToPrint, { useReactToPrint } from 'react-to-print';
import Logo from '@/components/Common/Logo';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { accessibilityTourSteps, tourKeys } from '@/constants/toursteps';
import { report } from 'process';
import { json } from 'stream/consumers';
import jsPDF from 'jspdf';
import autoTable, { __createTable, __drawTable } from 'jspdf-autotable';
import Select from 'react-select/creatable';
import { components } from 'react-select';
import Favicon from '@/components/Common/Favicon';
import { set } from 'lodash';
import Modal from '@/components/Common/Modal';
import Tooltip from '@mui/material/Tooltip';
import notFoundImage from '@/assets/images/not_found_image.png';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import {
  generateReport,
  setIsGenerating,
  setSelectedDomain,
  setJobId,
  clearJobId,
} from '@/features/report/reportSlice';
import getWidgetSettings from '@/utils/getWidgetSettings';
import startAccessibilityReportJob from '@/queries/accessibility/startAccessibilityReportJob';
import getAccessibilityReportByJobId from '@/queries/accessibility/getAccessibilityReportByJobId';
import { baseColors } from '@/config/colors';
const WEBABILITY_SCORE_BONUS = 45;
const MAX_TOTAL_SCORE = 95;

// Helper function to calculate enhanced scores
function calculateEnhancedScore(baseScore: number) {
  const enhancedScore = baseScore;
  return Math.min(enhancedScore, MAX_TOTAL_SCORE);
}

const normalizeDomain = (url: string) =>
  url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

const AccessibilityReport = ({ currentDomain }: any) => {
  const { t } = useTranslation();
  const organizationName = useOrganizationName();
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );
  useDocumentHeader({ title: t('Common.title.report') });
  const dispatch = useDispatch();
  // Using baseColors directly instead of getColors()
  const isGenerating = useSelector(
    (state: RootState) => state.report.isGenerating,
  );
  const selectedDomainFromRedux = useSelector(
    (state: RootState) => state.report.selectedDomain,
  );
  const jobId = useSelector((state: RootState) => state.report.jobId);
  const [startJobQuery] = useLazyQuery(startAccessibilityReportJob);
  const [getJobStatusQuery] = useLazyQuery(getAccessibilityReportByJobId);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [score, setScore] = useState(0);
  const [scoreBackup, setScoreBackup] = useState(0);
  const [domain, setDomain] = useState(
    selectedDomainFromRedux || currentDomain,
  );
  const [siteImg, setSiteImg] = useState('');
  const [expand, setExpand] = useState(false);
  const [correctDomain, setcorrectDomain] = useState(currentDomain);
  //console.log('Current domain:', correctDomain);
  // const [accessibilityData, setAccessibilityData] = useState({});
  const { data: sitesData, error: sitesError } = useQuery(GET_USER_SITES);
  const [saveAccessibilityReport] = useMutation(SAVE_ACCESSIBILITY_REPORT);
  const [selectedSite, setSelectedSite] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [enhancedScoresCalculated, setEnhancedScoresCalculated] =
    useState(false);
  const [
    fetchReportKeys,
    {
      data: reportKeysData,
      loading: loadingReportKeys,
      error: reportKeysError,
    },
  ] = useLazyQuery(FETCH_ACCESSIBILITY_REPORT_KEYS);
  const [processedReportKeys, setProcessedReportKeys] = useState<any[]>([]);
  const [getAccessibilityStatsQuery, { data, loading, error }] = useLazyQuery(
    getAccessibilityStats,
  );
  const [
    fetchReportByR2Key,
    { loading: loadingReport, data: reportData, error: reportByR2KeyError },
  ] = useLazyQuery(FETCH_REPORT_BY_R2_KEY);
  type OptionType = { value: string; label: string };
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef: contentRef });

  // Modal state for success message with report link
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [reportUrl, setReportUrl] = useState<string>('');
  // Modal state for full site scan notification
  const [isFullSiteScanModalOpen, setIsFullSiteScanModalOpen] = useState(false);
  const screenReaderAnnouncementRef = useRef<HTMLDivElement>(null);

  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [showLangTooltip, setShowLangTooltip] = useState(false);
  const [scanType, setScanType] = useState<'cached' | 'fresh'>('cached');
  const [isFullSiteScan, setIsFullSiteScan] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  type ScanTypeOption = {
    value: 'cached' | 'fresh';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };

  const scanTypeOptions: ScanTypeOption[] = [
    {
      value: 'cached' as const,
      label: 'Faster (Use saved data)',
      icon: Zap,
      color: 'text-yellow-500',
    },
    {
      value: 'fresh' as const,
      label: 'Slower (Do full scan)',
      icon: RefreshCw,
      color: 'text-blue-500',
    },
  ];

  const selectedScanType = scanTypeOptions.find(
    (option) => option.value === scanType,
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Combine options for existing sites and a custom "Enter a new domain" option
  const siteOptions = useMemo(
    () =>
      sitesData?.getUserSites?.sites?.map((domain: Site | null | undefined) => ({
        value: domain?.url || '',
        label: domain?.url || '',
      })) || [],
    [sitesData],
  );
  const options = [
    ...siteOptions,
    { value: 'new', label: 'Enter a new domain' },
  ];

  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Accessibility tour completed!');
  };

  const errorToastShown = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only show one error toast at a time
    if (errorToastShown.current) return;
    if (error) {
      toast.error('Failed to generate report. Please try again.');
      errorToastShown.current = true;
    } else if (reportByR2KeyError) {
      toast.error('Failed to fetch report. Please try again.');
      errorToastShown.current = true;
    } else if (sitesError) {
      toast.error('Failed to load your sites. Please refresh the page.');
      errorToastShown.current = true;
    }
    // Reset after a short delay so next error can be shown if needed
    if (errorToastShown.current) {
      timeoutRef.current = setTimeout(() => {
        errorToastShown.current = false;
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [error, reportKeysError, reportByR2KeyError, sitesError]);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (selectedDomainFromRedux) {
      if (isMounted.current) {
        setDomain(selectedDomainFromRedux);
      }
    }
  }, [selectedDomainFromRedux]);

  // Show toast and announce to screen readers when success modal opens
  useEffect(() => {
    if (isSuccessModalOpen) {
      // Show toast notification
      toast.success('Report Generated Successfully');
      
      // Announce to screen readers
      if (screenReaderAnnouncementRef.current) {
        screenReaderAnnouncementRef.current.textContent = 'Report Generated Successfully! Your accessibility report is ready to view.';
        // Clear after announcement to allow re-announcement if modal opens again
        setTimeout(() => {
          if (screenReaderAnnouncementRef.current) {
            screenReaderAnnouncementRef.current.textContent = '';
          }
        }, 1000);
      }
    }
  }, [isSuccessModalOpen]);

  useEffect(() => {
    if (selectedDomainFromRedux && siteOptions.length > 0) {
      const matchedOption = siteOptions.find(
        (opt: any) =>
          normalizeDomain(opt.value) ===
          normalizeDomain(selectedDomainFromRedux),
      );
      if (matchedOption) {
        setSelectedOption(matchedOption);
        setSelectedSite(matchedOption.value);
      } else {
        // If not in siteOptions, treat as custom domain
        setSelectedOption({
          value: selectedDomainFromRedux,
          label: selectedDomainFromRedux,
        });
        setSelectedSite(selectedDomainFromRedux);
      }
      setDomain(selectedDomainFromRedux);
    }
  }, [selectedDomainFromRedux, siteOptions]);

  const handleSubmit = async () => {
    const sanitizedDomain = getFullDomain(domain);
    if (
      sanitizedDomain !== 'localhost' &&
      !isIpAddress(sanitizedDomain) &&
      !isValidFullDomainFormat(sanitizedDomain)
    ) {
      if (isMounted.current) {
        setDomain(currentDomain);
      }
      toast.error('You must enter a valid domain name!');
      return;
    }
    const validDomain = sanitizedDomain;
    if (!validDomain) {
      toast.error('Please enter a valid domain!');
      return;
    }
    if (isMounted.current) {
      setcorrectDomain(validDomain);
    }

    // For full site scans, don't show loading and show email notification instead
    if (isFullSiteScan) {
      dispatch(setSelectedDomain(validDomain));
      try {
        const { data } = await startJobQuery({
          variables: {
            url: encodeURIComponent(validDomain),
            use_cache: scanType === 'cached' && !isFullSiteScan,
            full_site_scan: isFullSiteScan,
          },
        });
        if (
          data &&
          data.startAccessibilityReportJob &&
          data.startAccessibilityReportJob.jobId
        ) {
          // Show modal instead of toast
          setIsFullSiteScanModalOpen(true);
          // Don't set jobId or isGenerating - let it run in background
          // The backend will email the user when the report is ready
        } else {
          toast.error('Failed to start report job.');
        }
      } catch (error) {
        toast.error('Failed to start report job.');
      }
      return;
    }

    // Normal scan flow (non-full site scan)
    dispatch(setIsGenerating(true));
    dispatch(setSelectedDomain(validDomain));
    try {
      const { data } = await startJobQuery({
        variables: {
          url: encodeURIComponent(validDomain),
          use_cache: scanType === 'cached' && !isFullSiteScan,
          full_site_scan: isFullSiteScan,
        },
      });
      if (
        data &&
        data.startAccessibilityReportJob &&
        data.startAccessibilityReportJob.jobId
      ) {
        const jobId = data.startAccessibilityReportJob.jobId;

        dispatch(setJobId(jobId));

        toast.info('Report generation started. This may take a few seconds.');
      } else {
        dispatch(setIsGenerating(false));
        toast.error('Failed to start report job.');
      }
    } catch (error) {
      dispatch(setIsGenerating(false));
      toast.error('Failed to start report job.');
    }
  };

  useEffect(() => {
    if (selectedSite) {
      fetchReportKeys({ variables: { url: selectedSite } });
    }
  }, [selectedSite]);

  useEffect(() => {
    if (reportKeysData) {
      const updatedData = reportKeysData.fetchAccessibilityReportFromR2.map(
        (row: any) => {
          const enhancedScore = calculateEnhancedScore(row.score || 0);
          return { ...row, enhancedScore };
        },
      );
      if (isMounted.current) {
        setProcessedReportKeys(updatedData);
        setEnhancedScoresCalculated(true);
      }
    }
  }, [reportKeysData]);

  useEffect(() => {
    if (expand === true) {
      reactToPrintFn();
      if (isMounted.current) {
        setExpand(false);
      }
    }
  }, [expand]);

  // When a domain is selected, fetch all report keys for that domain
  useEffect(() => {
    if (selectedSite) {
      fetchReportKeys({ variables: { url: selectedSite } });
    }
  }, [selectedSite, reportGenerated]);

  const groupByCodeUtil = (issues: any) => {
    const groupedByCode: any = {};
    if (Array.isArray(issues)) {
      issues.forEach((warning) => {
        const { code } = warning;
        if (!groupedByCode[code]) {
          groupedByCode[code] = [];
        }
        groupedByCode[code].push(warning);
      });
    }
    return groupedByCode;
  };

  /**
   * Get the appropriate color for an issue based on compliance status
   * @param issue - The issue object with code and impact
   * @param hasWebAbility - Whether the site has WebAbility enabled
   * @returns Object with colors for different elements
   */

  const getComplianceStatus = (score: number) => {
    if (score >= 80) {
      return 'Compliant';
    } else if (score >= 50) {
      return 'Partially Compliant';
    } else {
      return 'Non-Compliant';
    }
  };

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
              });
            });
          }
        },
      );
    }

    return issues;
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

  const [downloadingRow, setDownloadingRow] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openDropdown && !target.closest('[data-dropdown]')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {}; // Return empty cleanup function when no dropdown is open
  }, [openDropdown]);


  return (
    <div>
      {/* Screen reader announcement region */}
      <div
        ref={screenReaderAnnouncementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />
      <TourGuide
        steps={accessibilityTourSteps}
        tourKey={tourKeys.accessibility}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />
      <div
        className="accessibility-wrapper w-full max-w-full overflow-x-hidden"
        style={{ backgroundColor: baseColors.blueLight }}
      >
        <header className="accessibility-page-header text-left self-start pl-3 sm:pl-6 w-full max-w-full">
          <h1
            className="text-4xl font-semibold mb-2"
            style={{ color: baseColors.grayDark2 }}
          >
            Scan your domain
          </h1>
        </header>

        <div className="w-full pl-6 pr-6 border-none shadow-none flex flex-col justify-center items-center">
          <div
            className="search-bar-container my-6 p-6 rounded-xl w-full shadow-sm"
            style={{
              backgroundColor: baseColors.white,
              border: `1px solid ${baseColors.cardBorderPurple}`,
            }}
          >
            {/* Description text */}
            <div className="mb-6 text-left">
              <h2
                className="text-2xl font-semibold"
                style={{ color: baseColors.grayDark2 }}
              >
                Scanner
              </h2>
              <p
                className="text-base mt-2"
                style={{ color: baseColors.grayText }}
              >
                Evaluate your website's accessibility in seconds. View a history
                of all accessibility scans. Download your reports.
              </p>
            </div>

            {/* Single row: Language, Domain input, Scan Type, Checkbox, and Free Scan button */}
            <div className="flex flex-col lg:flex-row items-end gap-3 w-full">
              {/* Language Selector */}
              <div className="w-full lg:w-auto lg:min-w-[140px]">
                <label
                  htmlFor="language-select"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Language
                </label>
                <Tooltip
                  title="Please select a language before scanning."
                  open={showLangTooltip}
                  placement="top"
                  arrow
                >
                  <div className="relative">
                    <select
                      id="language-select"
                      value={currentLanguage}
                      onChange={(e) => {
                        setCurrentLanguage(e.target.value);
                        setShowLangTooltip(false);
                      }}
                      className="appearance-none w-full px-3 py-2 pr-8 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-all"
                      style={{
                        backgroundColor: baseColors.white,
                        border: `1px solid ${baseColors.cardBorderPurple}`,
                        color: baseColors.grayDark,
                        minHeight: '50px',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          baseColors.brandPrimary;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${baseColors.brandPrimary}20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          baseColors.cardBorder;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
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
                        className="w-4 h-4"
                        style={{ color: '#767676' }}
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
                </Tooltip>
              </div>

              {/* Domain Input */}
              <div className="w-full flex-1">
                <label
                  htmlFor="domain-select-input"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Domain name
                </label>
                <Select
                  inputId="domain-select-input"
                  options={siteOptions}
                  value={
                    selectedOption ||
                    (selectedDomainFromRedux
                      ? siteOptions.find(
                          (opt: any) => opt.value === selectedDomainFromRedux,
                        ) || {
                          value: selectedDomainFromRedux,
                          label: selectedDomainFromRedux,
                        }
                      : null)
                  }
                  onChange={(selected: OptionType | null) => {
                    if (isMounted.current) {
                      setSelectedOption(selected);
                      setSelectedSite(selected?.value ?? '');
                      setDomain(selected?.value ?? '');
                    }
                    dispatch(setSelectedDomain(selected?.value ?? ''));
                  }}
                  onCreateOption={(inputValue: any) => {
                    const newOption = { value: inputValue, label: inputValue };
                    if (isMounted.current) {
                      setSelectedOption(newOption);
                      setSelectedSite(inputValue);
                      setDomain(inputValue);
                    }
                    dispatch(setSelectedDomain(inputValue));
                  }}
                  placeholder="Enter your domain"
                  isSearchable
                  isClearable
                  formatOptionLabel={(option: OptionType) => (
                    <div className="flex items-center gap-2">
                      <Favicon domain={option.value} size={16} />
                      <span>{option.label}</span>
                    </div>
                  )}
                  formatCreateLabel={(inputValue: any) =>
                    `Enter a new domain: "${inputValue}"`
                  }
                  classNamePrefix="react-select"
                  className="w-full"
                  components={{
                    ClearIndicator: (props: any) => {
                      const {
                        innerProps,
                        isDisabled,
                        clearValue,
                      } = props;
                      
                      // Enhance innerProps to make it focusable and keyboard accessible
                      const enhancedInnerProps = {
                        ...innerProps,
                        tabIndex: isDisabled ? -1 : 0,
                        role: 'button',
                        'aria-label': 'Clear selection',
                        onClick: (e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isDisabled && clearValue) {
                            clearValue();
                          }
                          // Also call original onClick if it exists
                          if (innerProps.onClick) {
                            innerProps.onClick(e);
                          }
                        },
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isDisabled && clearValue) {
                              clearValue();
                            }
                          } else if (innerProps.onKeyDown) {
                            innerProps.onKeyDown(e);
                          }
                        },
                      };

                      return components.ClearIndicator({
                        ...props,
                        innerProps: enhancedInnerProps,
                      });
                    },
                  }}
                  styles={{
                    control: (provided: any, state: any) => ({
                      ...provided,
                      borderRadius: '8px',
                      border: state.isFocused
                        ? `2px solid ${baseColors.brandPrimary}`
                        : `1px solid ${baseColors.cardBorderPurple}`,
                      minHeight: '50px',
                      fontSize: '16px',
                      backgroundColor: baseColors.white,
                      boxShadow: state.isFocused
                        ? `0 0 0 3px ${baseColors.brandPrimary}20`
                        : 'none',
                      '&:hover': {
                        border: state.isFocused
                          ? `2px solid ${baseColors.brandPrimary}`
                          : `1px solid ${baseColors.cardBorder}`,
                      },
                    }),
                    placeholder: (provided: any) => ({
                      ...provided,
                      color: baseColors.grayPlaceholder,
                      fontSize: '16px',
                    }),
                    input: (provided: any) => ({
                      ...provided,
                      color: baseColors.grayDark,
                      fontSize: '16px',
                    }),
                    indicatorSeparator: () => ({
                      display: 'none',
                    }),
                    dropdownIndicator: (provided: any) => ({
                      ...provided,
                      color: '#767676',
                      '&:hover': {
                        color: '#767676',
                      },
                    }),
                    clearIndicator: (provided: any) => ({
                      ...provided,
                      color: '#767676',
                      '&:hover': {
                        color: '#767676',
                      },
                    }),
                  }}
                />
              </div>

              {/* Scan Type Selector */}
              <div className="w-full lg:w-auto lg:min-w-[220px] scan-type-selector">
                <label
                  htmlFor="quick-scan-select"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Quick scan
                </label>
                <div ref={dropdownRef} className="relative">
                  <button
                    id="quick-scan-select"
                    type="button"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-3 py-2 pr-8 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-all flex items-center justify-between"
                    style={{
                      backgroundColor: baseColors.white,
                      border: `1px solid ${baseColors.cardBorderPurple}`,
                      color: baseColors.grayDark,
                      minHeight: '50px',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor =
                        baseColors.brandPrimary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${baseColors.brandPrimary}20`;
                    }}
                    onBlur={(e) => {
                      if (!isDropdownOpen) {
                        e.currentTarget.style.borderColor =
                          baseColors.cardBorder;
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      {selectedScanType && (
                        <>
                          <selectedScanType.icon
                            className={`w-4 h-4 ${selectedScanType.color}`}
                          />
                          <span>{selectedScanType.label}</span>
                        </>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                      style={{ color: '#767676' }}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div
                      role="listbox"
                      aria-labelledby="quick-scan-select"
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
                    >
                      {scanTypeOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setScanType(option.value);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-xs font-medium text-left flex items-center space-x-2 ${
                              scanType === option.value
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <IconComponent
                              className={`w-4 h-4 ${option.color}`}
                            />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Checkbox for full site scan */}
              <div className="w-full lg:w-auto full-site-scan-checkbox">
                <div
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg whitespace-nowrap"
                  style={{
                    minHeight: '50px',
                    backgroundColor: baseColors.white,
                  }}
                >
                  <TbZoomScanFilled className="w-4 h-4 text-green-500" />
                  <label
                    htmlFor="fullSiteScan"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Full site scan
                  </label>
                  <input
                    type="checkbox"
                    id="fullSiteScan"
                    checked={isFullSiteScan}
                    onChange={(e) => setIsFullSiteScan(e.target.checked)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Free Scan Button */}
              <div className="w-full lg:w-auto">
                <button
                  type="button"
                  className="search-button px-8 py-3 rounded-lg font-medium text-lg whitespace-nowrap transition-all duration-200 hover:shadow-md w-full"
                  style={{
                    backgroundColor: '#0052CC',
                    color: baseColors.white,
                    minHeight: '50px',
                  }}
                  onClick={() => {
                    if (!currentLanguage || !currentLanguage.trim()) {
                      setShowLangTooltip(true);
                      setTimeout(() => setShowLangTooltip(false), 2000);
                      return;
                    }
                    if (domain) {
                      handleSubmit();
                    } else {
                      toast.error('Please enter or select a domain!');
                    }
                  }}
                  disabled={isGenerating}
                >
                  Analyze My Site
                  {isGenerating && (
                    <CircularProgress
                      size={18}
                      sx={{ color: 'white' }}
                      className="ml-2"
                    />
                  )}
                </button>
              </div>
            </div>

            <div className="w-full mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <Card
                className="w-full"
                style={{
                  backgroundColor: '#13206B',

                  borderRadius: '12px',
                  padding: '16px',
                  position: 'relative',
                  minHeight: '120px',
                  border: `1px solid ${baseColors.cardBorderPurple}`,
                }}
              >
                <CardContent className="p-0">
                  <div className="flex sm:flex-col md:flex-row items-start sm:items-center md:items-start space-x-3 sm:space-x-0 md:space-x-3 sm:space-y-3 md:space-y-0 sm:text-center md:text-left">
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: baseColors.grayIcon,
                      }}
                    >
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 36 36"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9.75 26.25L9.75 21.75M17.25 26.25L17.25 12.75M24.75 26.25V20.25"
                          stroke="#222D73"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <path
                          d="M32.25 8.25C32.25 10.7353 30.2353 12.75 27.75 12.75C25.2647 12.75 23.25 10.7353 23.25 8.25C23.25 5.76472 25.2647 3.75 27.75 3.75C30.2353 3.75 32.25 5.76472 32.25 8.25Z"
                          stroke="#222D73"
                          strokeWidth="3"
                        />
                        <path
                          d="M32.2433 16.5C32.2433 16.5 32.25 17.0093 32.25 18C32.25 24.7176 32.25 28.0763 30.1631 30.1632C28.0763 32.25 24.7175 32.25 18 32.25C11.2825 32.25 7.92373 32.25 5.83686 30.1632C3.75 28.0763 3.75 24.7176 3.75 18C3.75 11.2825 3.75 7.92377 5.83686 5.83691C7.92373 3.75005 11.2825 3.75005 18 3.75005L19.5 3.75"
                          stroke="#222D73"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3
                        className="text-base sm:text-lg font-bold mb-1"
                        style={{ color: baseColors.white }}
                      >
                        Comprehensive Analysis
                      </h3>
                      <p
                        className="text-xs sm:text-sm leading-tight"
                        style={{ color: baseColors.blueStats }}
                      >
                        Our scanner checks for WCAG 2.1 compliance across your
                        entire site.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="w-full"
                style={{
                  backgroundColor: '#13206B',

                  borderRadius: '12px',
                  padding: '16px',
                  position: 'relative',
                  minHeight: '120px',
                  border: `1px solid ${baseColors.cardBorderPurple}`,
                }}
              >
                <CardContent className="p-0">
                  <div className="flex sm:flex-col md:flex-row items-start sm:items-center md:items-start space-x-3 sm:space-x-0 md:space-x-3 sm:space-y-3 md:space-y-0 sm:text-center md:text-left">
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: baseColors.grayIcon,
                      }}
                    >
                      <svg
                        width="24"
                        height="28"
                        viewBox="0 0 29 34"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1.91699 14C1.91699 8.34315 1.91699 5.51472 3.78419 3.75736C5.65138 2 8.65658 2 14.667 2H15.8261C20.7179 2 23.1638 2 24.8624 3.19675C25.3491 3.53964 25.7811 3.94629 26.1454 4.40433C27.417 6.00301 27.417 8.30504 27.417 12.9091V16.7273C27.417 21.172 27.417 23.3944 26.7136 25.1694C25.5828 28.0229 23.1913 30.2737 20.1595 31.338C18.2736 32 15.9123 32 11.1897 32C8.49112 32 7.14182 32 6.06416 31.6217C4.33168 31.0135 2.96512 29.7274 2.31894 28.0968C1.91699 27.0825 1.91699 25.8126 1.91699 23.2727V14Z"
                          stroke="#222D73"
                          strokeWidth="3"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M27.417 17C27.417 19.7614 25.1784 22 22.417 22C21.4183 22 20.2409 21.825 19.2699 22.0852C18.4072 22.3164 17.7333 22.9902 17.5022 23.853C17.242 24.8239 17.417 26.0013 17.417 27C17.417 29.7614 15.1784 32 12.417 32"
                          stroke="#222D73"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8.66699 9.5H19.167"
                          stroke="#222D73"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8.66699 15.5H13.167"
                          stroke="#222D73"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3
                        className="text-base sm:text-lg font-bold mb-1"
                        style={{ color: baseColors.white }}
                      >
                        Detailed Reports
                      </h3>
                      <p
                        className="text-xs sm:text-sm leading-tight"
                        style={{ color: baseColors.blueStats }}
                      >
                        Receive a full breakdown of accessibility issues and how
                        to fix them.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="w-full"
                style={{
                  backgroundColor: '#13206B',

                  borderRadius: '12px',
                  padding: '16px',
                  position: 'relative',
                  minHeight: '120px',
                  border: `1px solid ${baseColors.cardBorderPurple}`,
                }}
              >
                <CardContent className="p-0">
                  <div className="flex sm:flex-col md:flex-row items-start sm:items-center md:items-start space-x-3 sm:space-x-0 md:space-x-3 sm:space-y-3 md:space-y-0 sm:text-center md:text-left">
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: baseColors.grayIcon,
                      }}
                    >
                      <svg
                        width="30"
                        height="28"
                        viewBox="0 0 37 36"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="1.33301"
                          y="1"
                          width="34"
                          height="34"
                          rx="17"
                          stroke="#222D73"
                          strokeWidth="2"
                        />
                        <path
                          d="M18.3333 9.54788C17.5508 9.54788 16.8811 9.27224 16.3244 8.72097C15.7676 8.1697 15.4887 7.50621 15.4878 6.73049C15.4868 5.95476 15.7657 5.29174 16.3244 4.74141C16.883 4.19108 17.5527 3.91497 18.3333 3.9131C19.1139 3.91122 19.784 4.18732 20.3436 4.74141C20.9032 5.2955 21.1816 5.95852 21.1787 6.73049C21.1759 7.50245 20.8975 8.16595 20.3436 8.72097C19.7897 9.276 19.1196 9.55163 18.3333 9.54788ZM15.4129 32.087C14.6685 32.087 14.065 31.4863 14.065 30.7454V15.009C14.065 14.311 13.5272 13.7313 12.8298 13.6579C11.8071 13.5503 10.7724 13.4129 9.72567 13.2457C8.72348 13.0857 7.75436 12.8983 6.81829 12.6837C6.10013 12.5191 5.67286 11.7938 5.85249 11.0824L5.9063 10.8693C6.08973 10.1428 6.83481 9.70891 7.56877 9.87433C9.02474 10.2025 10.5499 10.4519 12.1443 10.6227C14.231 10.8462 16.294 10.9575 18.3333 10.9566C20.3725 10.9556 22.4355 10.8439 24.5222 10.6213C26.1166 10.4512 27.6418 10.2022 29.0977 9.87425C29.8317 9.70891 30.5768 10.1428 30.7602 10.8693L30.814 11.0824C30.9937 11.7938 30.5664 12.5191 29.8482 12.6837C28.9122 12.8983 27.943 13.0857 26.9409 13.2457C25.8941 13.4129 24.8594 13.5503 23.8367 13.6579C23.1394 13.7313 22.6015 14.311 22.6015 15.009V30.7454C22.6015 31.4863 21.998 32.087 21.2536 32.087H21.1039C20.3595 32.087 19.756 31.4863 19.756 30.7454V24.9764C19.756 24.2355 19.1525 23.6348 18.4081 23.6348H18.2584C17.514 23.6348 16.9105 24.2355 16.9105 24.9764V30.7454C16.9105 31.4863 16.3071 32.087 15.5627 32.087H15.4129Z"
                          fill="#222D73"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3
                        className="text-base sm:text-lg font-bold mb-1"
                        style={{ color: baseColors.white }}
                      >
                        Improve User Experience
                      </h3>
                      <p
                        className="text-xs sm:text-sm leading-tight"
                        style={{ color: baseColors.blueStats }}
                      >
                        Make your website accessible to all users, regardless of
                        abilities.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="w-full">
            {siteOptions.some(
              (option: any) =>
                normalizeDomain(option.value) ===
                normalizeDomain(selectedOption?.value ?? ''),
            ) &&
              enhancedScoresCalculated &&
              processedReportKeys.length > 0 && (
                <div
                  className="accessibility-issues-section rounded-xl p-2 sm:p-4 md:p-6 mt-12 shadow w-full overflow-visible box-border"
                  style={{
                    backgroundColor: '#eaecfb',
                    marginLeft: 0,
                    marginRight: 0,
                    border: `1px solid ${baseColors.cardBorderPurple}`,
                  }}
                >
                  <div
                    className="mb-6 pb-4 w-full"
                    style={{
                      borderBottom: `2px solid ${baseColors.cardBorderPurple}`,
                    }}
                  >
                    <h2
                      className="text-xl sm:text-2xl font-medium"
                      style={{ color: baseColors.grayDark2 }}
                    >
                      Scan history
                    </h2>
                  </div>

                  {/* Table for Desktop - Semantic HTML for accessibility */}
                  <table 
                    className="block md:table w-full" 
                    aria-label="Scan history"
                    style={{ borderCollapse: 'separate', borderSpacing: '0 1rem' }}
                  >
                    <caption className="sr-only">
                      Table showing scan history with site URLs, last scanned dates, accessibility scores, and action menus
                    </caption>
                    <thead className="hidden md:table-header-group">
                      <tr className="mb-4">
                        <th
                          className="text-sm font-medium uppercase tracking-wider text-left px-4 pb-4"
                          style={{ color: baseColors.brandPrimary }}
                          scope="col"
                        >
                          Sites
                        </th>
                        <th
                          className="text-sm font-medium uppercase tracking-wider text-center px-4 pb-4"
                          style={{ color: baseColors.brandPrimary }}
                          scope="col"
                        >
                          Last scanned
                        </th>
                        <th
                          className="text-sm font-medium uppercase tracking-wider text-center px-4 pb-4"
                          style={{ color: baseColors.brandPrimary }}
                          scope="col"
                        >
                          Score
                        </th>
                        <th
                          className="text-sm font-medium uppercase tracking-wider text-center px-4 pb-4"
                          style={{ color: baseColors.brandPrimary }}
                          scope="col"
                        >
                          <div className="flex justify-center items-center">Action</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="max-w-full">
                    {processedReportKeys.map((row: any, idx: number) => {
                      const dateObj = new Date(Number(row.created_at));
                      const timeAgo = (() => {
                        const now = new Date();
                        const diffInMs = now.getTime() - dateObj.getTime();
                        const diffInMinutes = Math.floor(
                          diffInMs / (1000 * 60),
                        );
                        const diffInHours = Math.floor(diffInMinutes / 60);
                        const diffInDays = Math.floor(diffInHours / 24);

                        if (diffInMinutes < 60) {
                          return `${diffInMinutes} min ago`;
                        } else if (diffInHours < 24) {
                          return `${diffInHours} h ago`;
                        } else {
                          return `${diffInDays} day${
                            diffInDays > 1 ? 's' : ''
                          } ago`;
                        }
                      })();

                      const complianceStatus = getComplianceStatus(
                        row.enhancedScore,
                      );

                      // Extract favicon from URL
                      const getFaviconUrl = (url: string) => {
                        try {
                          const domain = new URL(
                            url.startsWith('http') ? url : `https://${url}`,
                          ).hostname;
                          return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
                        } catch {
                          return null;
                        }
                      };
                      const actualScore = Math.round(row.enhancedScore || 0);

                      return (
                        <tr
                          key={row.r2_key}
                          className="block md:table-row p-3 sm:p-4 rounded-lg border hover:shadow-md transition-all duration-200 group relative overflow-visible w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#445AE7] mb-4"
                          style={{
                            backgroundColor: baseColors.cardLight,
                            borderColor: baseColors.cardBorder,
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`View accessibility scan report for ${row.url} with score ${actualScore}`}
                          onClick={() => {
                            setReportUrl(
                              `/${row.r2_key}?domain=${encodeURIComponent(
                                row.url,
                              )}`,
                            );
                            setIsSuccessModalOpen(true);
                          }}
                          onKeyDown={(e) => {
                            // Only trigger when the card itself is focused, not when interacting with inner controls
                            if (e.currentTarget !== e.target) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setReportUrl(
                                `/${row.r2_key}?domain=${encodeURIComponent(
                                  row.url,
                                )}`,
                              );
                              setIsSuccessModalOpen(true);
                            }
                          }}
                        >
                          {/* Mobile Layout - Wrapped in td for valid HTML */}
                          <td colSpan={4} className="md:hidden space-y-3 w-full max-w-full overflow-visible block">
                            {/* Site Info with 3-dots menu */}
                            <div className="flex items-center justify-between w-full max-w-full">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  {getFaviconUrl(row.url) ? (
                                    <img
                                      src={getFaviconUrl(row.url)!}
                                      alt=""
                                      className="w-8 h-8 rounded"
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">
                                        {row.url.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {/* Mobile (≤768px): Show 7 letters, Desktop (>768px): Show full with truncate */}
                                  <div
                                    className="font-medium"
                                    style={{ color: baseColors.grayDark2 }}
                                  >
                                    <span className="hidden sm:inline">
                                      {row.url
                                        .replace(/^https?:\/\//, '')
                                        .replace(/^www\./, '')
                                        .substring(0, 7)}
                                      {row.url
                                        .replace(/^https?:\/\//, '')
                                        .replace(/^www\./, '').length > 7 &&
                                        '...'}
                                    </span>
                                    <span className="sm:hidden truncate">
                                      {row.url
                                        .replace(/^https?:\/\//, '')
                                        .replace(/^www\./, '')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile 3-Dots Menu */}
                              <div
                                className="relative flex-shrink-0 ml-2"
                                data-dropdown
                              >
                                <button
                                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(
                                      openDropdown === row.r2_key
                                        ? null
                                        : row.r2_key,
                                    );
                                  }}
                                  aria-label={`Open actions menu for ${row.url}`}
                                  style={{
                                    backgroundColor:
                                      openDropdown === row.r2_key
                                        ? baseColors.white
                                        : 'transparent',
                                  }}
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    style={{ color: baseColors.brandPrimary }}
                                  >
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>

                                {/* Mobile Dropdown Menu */}
                                {openDropdown === row.r2_key && (
                                  <div
                                    className="absolute top-10 w-44 sm:w-48 rounded-lg shadow-lg py-2"
                                    style={{
                                      backgroundColor: baseColors.white,
                                      border: `1px solid ${baseColors.cardBorderPurple}`,
                                      maxWidth: 'calc(100vw - 3rem)',
                                      minWidth: '180px',
                                      right: '0',
                                      left: 'auto',
                                      zIndex: 9999,
                                      position: 'absolute',
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                      style={{ color: baseColors.grayDark2 }}
                                      onClick={() => {
                                        setReportUrl(
                                          `/${
                                            row.r2_key
                                          }?domain=${encodeURIComponent(
                                            row.url,
                                          )}`,
                                        );
                                        setIsSuccessModalOpen(true);
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      View Report
                                    </button>
                                    <button
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                      style={{ color: baseColors.grayDark2 }}
                                      disabled={downloadingRow === row.r2_key}
                                      onClick={async () => {
                                        setOpenDropdown(null);
                                        setDownloadingRow(row.r2_key);
                                        const pdfToastId = toast.loading(
                                          'Generating detailed report...',
                                        );
                                        try {
                                          const { data: fetchedReportData } =
                                            await fetchReportByR2Key({
                                              variables: { r2_key: row.r2_key },
                                            });
                                          if (
                                            fetchedReportData &&
                                            fetchedReportData.fetchReportByR2Key
                                          ) {
                                            fetchedReportData.fetchReportByR2Key.url =
                                              row.url;
                                            const pdfBlob = await generatePDF(
                                              fetchedReportData.fetchReportByR2Key,
                                              currentLanguage,
                                              row.url,
                                              organizationName,
                                              organization?.logo_url || undefined,
                                            );
                                            toast.dismiss(pdfToastId);
                                            const url =
                                              window.URL.createObjectURL(
                                                pdfBlob,
                                              );
                                            const link =
                                              document.createElement('a');
                                            link.href = url;
                                            link.download =
                                              'accessibility-report.pdf';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          } else {
                                            toast.dismiss(pdfToastId);
                                            toast.error(
                                              'Failed to generate PDF. Please try again.',
                                            );
                                          }
                                        } catch (error) {
                                          toast.dismiss(pdfToastId);
                                          console.error(
                                            'Error fetching report:',
                                            error,
                                          );
                                          toast.error(
                                            'Failed to generate PDF. Please try again.',
                                          );
                                        } finally {
                                          setDownloadingRow(null);
                                        }
                                      }}
                                    >
                                      {downloadingRow === row.r2_key ? (
                                        <CircularProgress
                                          size={14}
                                          sx={{ color: baseColors.grayDark2 }}
                                        />
                                      ) : (
                                        'Download Detailed Report'
                                      )}
                                    </button>
                                    <button
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                      style={{ color: baseColors.grayDark2 }}
                                      disabled={downloadingRow === row.r2_key}
                                      onClick={async () => {
                                        setOpenDropdown(null);
                                        setDownloadingRow(row.r2_key);
                                        try {
                                          const { data: fetchedReportData } =
                                            await fetchReportByR2Key({
                                              variables: { r2_key: row.r2_key },
                                            });
                                          if (
                                            fetchedReportData &&
                                            fetchedReportData.fetchReportByR2Key
                                          ) {
                                            fetchedReportData.fetchReportByR2Key.url =
                                              row.url;
                                            const pdfBlob =
                                              await generateShortPDF(
                                                fetchedReportData.fetchReportByR2Key,
                                                currentLanguage,
                                                getRootDomain(row.url),
                                              );
                                            const url =
                                              window.URL.createObjectURL(
                                                pdfBlob,
                                              );
                                            const link =
                                              document.createElement('a');
                                            link.href = url;
                                            link.download =
                                              'accessibility-short-report.pdf';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          } else {
                                            toast.error(
                                              'Failed to generate short report. Please try again.',
                                            );
                                          }
                                        } catch (error) {
                                          console.error(
                                            'Error fetching report:',
                                            error,
                                          );
                                          toast.error(
                                            'Failed to generate short report. Please try again.',
                                          );
                                        } finally {
                                          setDownloadingRow(null);
                                        }
                                      }}
                                    >
                                      {downloadingRow === row.r2_key ? (
                                        <CircularProgress
                                          size={14}
                                          sx={{ color: baseColors.grayDark2 }}
                                        />
                                      ) : (
                                        'Download Prospect Report'
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Last Scanned */}
                            <div className="text-xs">
                              <span style={{ color: baseColors.grayMuted }}>
                                LAST SCANNED
                              </span>
                              <div
                                className="text-sm mt-1"
                                style={{ color: baseColors.grayMuted }}
                              >
                                {timeAgo}
                              </div>
                            </div>

                            {/* Accessibility Score */}
                            <div className="text-xs">
                              <span style={{ color: baseColors.grayMuted }}>
                                ACCESSIBILITY SCORE
                              </span>
                              <div className="flex gap-2 sm:gap-3 mt-2">
                                <div className="flex flex-col items-center">
                                  <span
                                    className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded text-sm sm:text-base font-semibold"
                                    style={{
                                      color:
                                        actualScore >= 80
                                          ? '#166534'
                                          : actualScore >= 50
                                          ? '#d97706'
                                          : '#dc2626',
                                    }}
                                  >
                                    {actualScore}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Site Info - Desktop Only */}
                          <td className="hidden md:table-cell p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                {getFaviconUrl(row.url) ? (
                                  <img
                                    src={getFaviconUrl(row.url)!}
                                    alt=""
                                    className="w-8 h-8 rounded"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      {row.url.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                {/* Mobile (≤768px): Show 5 letters, Desktop (>768px): Show full with truncate */}
                                <div
                                  className="font-medium"
                                  style={{ color: baseColors.grayDark2 }}
                                >
                                  {row.url
                                    .replace(/^https?:\/\//, '')
                                    .replace(/^www\./, '')}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Last Scanned - Desktop Only */}
                          <td className="hidden md:table-cell text-center p-3 sm:p-4">
                            <div
                              className="text-sm"
                              style={{ color: baseColors.grayMuted }}
                            >
                              {timeAgo}
                            </div>
                          </td>

                          {/* Desktop Score */}
                          <td className="hidden md:table-cell text-center p-3 sm:p-4">
                            <span
                              className="inline-flex items-center justify-center w-10 h-10 rounded text-sm font-semibold"
                              style={{
                                color:
                                  actualScore >= 80
                                    ? '#166534'
                                    : actualScore >= 50
                                    ? '#d97706'
                                    : '#dc2626',
                              }}
                            >
                              {actualScore}
                            </span>
                          </td>

                          {/* Desktop 3-Dots Menu */}
                          <td
                            className="hidden md:table-cell text-center p-3 sm:p-4"
                            data-dropdown
                          >
                            <div className="flex justify-center items-center relative">
                              <button
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(
                                    openDropdown === row.r2_key
                                      ? null
                                      : row.r2_key,
                                  );
                                }}
                                aria-label={`Open actions menu for ${row.url}`}
                                style={{
                                  backgroundColor:
                                    openDropdown === row.r2_key
                                      ? baseColors.white
                                      : 'transparent',
                                }}
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  style={{ color: baseColors.brandPrimary }}
                                >
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>

                              {/* Desktop Dropdown Menu */}
                              {openDropdown === row.r2_key && (
                              <div
                                className="absolute top-10 w-48 rounded-lg shadow-lg py-2"
                                style={{
                                  backgroundColor: baseColors.white,
                                  border: `1px solid ${baseColors.cardBorderPurple}`,
                                  maxWidth: 'calc(100vw - 3rem)',
                                  minWidth: '180px',
                                  right: '0',
                                  left: 'auto',
                                  zIndex: 9999,
                                  position: 'absolute',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                  style={{ color: baseColors.grayDark2 }}
                                  onClick={() => {
                                    setReportUrl(
                                      `/${
                                        row.r2_key
                                      }?domain=${encodeURIComponent(row.url)}`,
                                    );
                                    setIsSuccessModalOpen(true);
                                    setOpenDropdown(null);
                                  }}
                                >
                                  View Report
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                  style={{ color: baseColors.grayDark2 }}
                                  disabled={downloadingRow === row.r2_key}
                                  onClick={async () => {
                                    setOpenDropdown(null);
                                    setDownloadingRow(row.r2_key);
                                    const pdfToastId = toast.loading(
                                      'Generating detailed report...',
                                    );
                                    try {
                                      const { data: fetchedReportData } =
                                        await fetchReportByR2Key({
                                          variables: { r2_key: row.r2_key },
                                        });
                                      if (
                                        fetchedReportData &&
                                        fetchedReportData.fetchReportByR2Key
                                      ) {
                                        fetchedReportData.fetchReportByR2Key.url =
                                          row.url;
                                        const pdfBlob = await generatePDF(
                                          fetchedReportData.fetchReportByR2Key,
                                          currentLanguage,
                                          row.url,
                                          organizationName,
                                          organization?.logo_url || undefined,
                                        );
                                        toast.dismiss(pdfToastId);
                                        const url =
                                          window.URL.createObjectURL(pdfBlob);
                                        const link =
                                          document.createElement('a');
                                        link.href = url;
                                        link.download =
                                          'accessibility-report.pdf';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                      } else {
                                        toast.dismiss(pdfToastId);
                                        toast.error(
                                          'Failed to generate PDF. Please try again.',
                                        );
                                      }
                                    } catch (error) {
                                      toast.dismiss(pdfToastId);
                                      console.error(
                                        'Error fetching report:',
                                        error,
                                      );
                                      toast.error(
                                        'Failed to generate PDF. Please try again.',
                                      );
                                    } finally {
                                      setDownloadingRow(null);
                                    }
                                  }}
                                >
                                  {downloadingRow === row.r2_key ? (
                                    <CircularProgress
                                      size={14}
                                      sx={{ color: baseColors.grayDark2 }}
                                    />
                                  ) : (
                                    'Download Detailed Report'
                                  )}
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                  style={{ color: baseColors.grayDark2 }}
                                  disabled={downloadingRow === row.r2_key}
                                  onClick={async () => {
                                    setOpenDropdown(null);
                                    setDownloadingRow(row.r2_key);
                                    try {
                                      const { data: fetchedReportData } =
                                        await fetchReportByR2Key({
                                          variables: { r2_key: row.r2_key },
                                        });
                                      if (
                                        fetchedReportData &&
                                        fetchedReportData.fetchReportByR2Key
                                      ) {
                                        fetchedReportData.fetchReportByR2Key.url =
                                          row.url;
                                        const pdfBlob = await generateShortPDF(
                                          fetchedReportData.fetchReportByR2Key,
                                          currentLanguage,
                                          getRootDomain(row.url),
                                        );
                                        const url =
                                          window.URL.createObjectURL(pdfBlob);
                                        const link =
                                          document.createElement('a');
                                        link.href = url;
                                        link.download =
                                          'accessibility-short-report.pdf';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                      } else {
                                        toast.error(
                                          'Failed to generate short report. Please try again.',
                                        );
                                      }
                                    } catch (error) {
                                      console.error(
                                        'Error fetching report:',
                                        error,
                                      );
                                      toast.error(
                                        'Failed to generate short report. Please try again.',
                                      );
                                    } finally {
                                      setDownloadingRow(null);
                                    }
                                  }}
                                >
                                  {downloadingRow === row.r2_key ? (
                                    <CircularProgress
                                      size={14}
                                      sx={{ color: baseColors.grayDark2 }}
                                    />
                                  ) : (
                                    'Download Prospect Report'
                                  )}
                                </button>
                              </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              )}

            {/* Empty State - Show when no scan results are available */}
            {siteOptions.some(
              (option: any) =>
                normalizeDomain(option.value) ===
                normalizeDomain(selectedOption?.value ?? ''),
            ) &&
              enhancedScoresCalculated &&
              processedReportKeys.length === 0 && (
                <div
                  className="accessibility-issues-section rounded-xl p-2 sm:p-4 md:p-6 mt-12 shadow w-full overflow-visible box-border"
                  style={{
                    backgroundColor: baseColors.blueSection,
                    marginLeft: 0,
                    marginRight: 0,
                    border: `1px solid ${baseColors.cardBorderPurple}`,
                  }}
                >
                  <div
                    className="mb-6 pb-4 w-full"
                    style={{
                      borderBottom: `2px solid ${baseColors.cardBorderPurple}`,
                    }}
                  >
                    <h2
                      className="text-xl sm:text-2xl font-medium"
                      style={{ color: baseColors.grayDark2 }}
                    >
                      Scan history
                    </h2>
                  </div>

                  {/* Empty State Content */}
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="mb-6">
                      <img
                        src={notFoundImage}
                        alt="No scan results found"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <h4
                        className="text-lg font-medium mb-2"
                        style={{ color: baseColors.grayDark2 }}
                      >
                        You currently have no previous scan histories
                      </h4>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Full Site Scan Modal */}
          {isFullSiteScanModalOpen && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              style={{
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                style={{
                  animation: 'fadeIn 0.2s ease-out',
                }}
                onClick={() => setIsFullSiteScanModalOpen(false)}
              />

              {/* Modal */}
              <div
                className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden"
                style={{
                  animation: 'slideUp 0.3s ease-out',
                  boxShadow:
                    '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Modal Header */}
                <div
                  className="p-8 md:p-10 text-white relative overflow-hidden"
                  style={{
                    backgroundColor: '#0052CC',
                  }}
                >
                  {/* Decorative background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
                  </div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                        <FaClock className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold mb-2 leading-tight">
                          Full Site Scan Started
                        </h3>
                        <p className="text-white/90 text-base font-medium">
                          Your comprehensive scan is in progress
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsFullSiteScanModalOpen(false)}
                      className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-all duration-200 hover:scale-105"
                    >
                      <FaTimes className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-8 md:p-10">
                  <div
                    className="rounded-2xl p-7 mb-8 border-2"
                    style={{
                      background:
                        'linear-gradient(135deg, #F8FBFF 0%, #E8F4FD 100%)',
                      borderColor: '#E1F0F7',
                    }}
                  >
                    <ul className="text-base text-gray-700 space-y-4 font-medium">
                      <li className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#0052CC' }}
                        ></div>
                        Full site scan takes time as it scans multiple pages across your website to provide a comprehensive accessibility analysis.
                      </li>
                      <li className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#0052CC' }}
                        ></div>
                        We will inform you once the scan is complete through email. You'll receive a detailed report with all the findings.
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setIsFullSiteScanModalOpen(false)}
                    className="w-full py-4 px-6 text-white rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: '#0052CC',
                      boxShadow:
                        '0 10px 25px -5px rgba(0, 82, 204, 0.4), 0 4px 6px -2px rgba(0, 82, 204, 0.1)',
                    }}
                  >
                    Got it
                  </button>
                </div>
              </div>

              <style>{`
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                  }
                  to {
                    opacity: 1;
                  }
                }
                
                @keyframes slideUp {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </div>
          )}

          {/* Success Modal with link to open report */}
          <Modal 
            isOpen={isSuccessModalOpen}
            ariaLabelledBy="success-modal-title"
            ariaDescribedBy="success-modal-description"
          >
            <div className="p-8 text-center relative">
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div className="mb-6">
                <FaCheckCircle
                  size={64}
                  color="green"
                  className="mx-auto mb-4"
                />
                <h2 
                  id="success-modal-title" 
                  className="text-2xl font-bold text-gray-800 mb-2"
                  tabIndex={-1}
                >
                  Report Generated Successfully!
                </h2>
                <p id="success-modal-description" className="text-gray-600">
                  Your accessibility report is ready to view.
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    const newTab = window.open(reportUrl, '_blank');
                    if (newTab) newTab.focus();
                    setIsSuccessModalOpen(false);
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Open Report
                </button>
                <button
                  onClick={() => setIsSuccessModalOpen(false)}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityReport;
