import React, { useEffect, useState, useRef, useMemo } from 'react';
import './Accessibility.css'; // Ensure your CSS file includes styles for the accordion
import greenSuccessImage from '@/assets/images/green_success.png';
import messageIconImage from '@/assets/images/message_icon.png';
import criticalIconImage from '@/assets/images/critical_icon.png';
import moderateIconImage from '@/assets/images/moderate_icon.png';
import mildIconImage from '@/assets/images/mild_icon.png';
import oneIssuesIconImage from '@/assets/images/1_issues_icon.png';
import twoIssuesIconImage from '@/assets/images/2_issues_icon.png';
import threeIssuesIconImage from '@/assets/images/3_issues_icon.png';
import { AiFillCloseCircle } from 'react-icons/ai';
import { FaGaugeSimpleHigh } from 'react-icons/fa6';
import { FaUniversalAccess, FaCheckCircle, FaCircle } from 'react-icons/fa';
import { Zap, RefreshCw, BarChart3, ChevronDown } from 'lucide-react';
import { TbZoomScanFilled } from 'react-icons/tb';
import { Link } from 'react-router-dom';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import SAVE_ACCESSIBILITY_REPORT from '@/queries/accessibility/saveAccessibilityReport';
import GET_USER_SITES from '@/queries/sites/getSites';
import FETCH_ACCESSIBILITY_REPORT_KEYS from '@/queries/accessibility/fetchAccessibilityReport';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import isValidDomain from '@/utils/verifyDomain';
import Button from '@mui/joy/Button';
import AccordionGroup from '@mui/joy/AccordionGroup';
import Accordion from '@mui/joy/Accordion';
import ToggleButtonGroup from '@mui/joy/ToggleButtonGroup';
import Stack from '@mui/joy/Stack';
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
import { generatePDF, generateShortPDF } from '@/utils/generatePDF';
import Select from 'react-select/creatable';
import { set } from 'lodash';
import Modal from '@/components/Common/Modal';
import Tooltip from '@mui/material/Tooltip';
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

// Helper function to get impact icon based on issue impact
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

const AccessibilityReport = ({ currentDomain }: any) => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.report') });
  const dispatch = useDispatch();
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
      sitesData?.getUserSites?.map((domain: any) => ({
        value: domain.url,
        label: domain.url,
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

  return (
    <>
      <TourGuide
        steps={accessibilityTourSteps}
        tourKey={tourKeys.accessibility}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />
      <div className="accessibility-wrapper">
        <header className="accessibility-page-header text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Scanner</h1>
          <p className="text-xl text-gray-600">
            Evaluate your website's accessibility in seconds. View a history of
            all accessibility scans. Download your reports.
          </p>
        </header>

        <div className="w-full pl-6 pr-6 border-none shadow-none flex flex-col justify-center items-center">
          <div className="search-bar-container bg-white my-6 p-3 sm:p-4 rounded-xl w-full">
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full">
              <div className="relative w-full md:flex-1 min-w-0 md:min-w-[130px] md:max-w-[140px]">
                <Tooltip
                  title="Please select a language before scanning."
                  open={showLangTooltip}
                  placement="top"
                  arrow
                >
                  <select
                    value={currentLanguage}
                    onChange={(e) => {
                      setCurrentLanguage(e.target.value);
                      setShowLangTooltip(false);
                    }}
                    className="appearance-none bg-white border border-gray-300 rounded-md px-2 py-2 pr-6 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[38px] w-full"
                  >
                    <option value="en">English</option>
                    {Object.values(LANGUAGES).map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.nativeName}
                      </option>
                    ))}
                  </select>
                </Tooltip>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg
                    className="w-3 h-3 text-gray-400"
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

              <div className="w-full md:flex-1 min-w-0">
                <Select
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
                  placeholder="Select or enter a domain"
                  isSearchable
                  isClearable
                  formatCreateLabel={(inputValue: any) =>
                    `Enter a new domain: "${inputValue}"`
                  }
                  classNamePrefix="react-select"
                  className="w-full min-w-0"
                  styles={{
                    control: (provided: any, state: any) => ({
                      ...provided,
                      borderRadius: '6px',
                      border: state.isFocused
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                      minHeight: '38px',
                      boxShadow: state.isFocused
                        ? '0 0 0 2px rgba(59, 130, 246, 0.1)'
                        : 'none',
                      '&:hover': {
                        border: state.isFocused
                          ? '1px solid #3b82f6'
                          : '1px solid #d1d5db',
                      },
                    }),
                  }}
                />
              </div>

              <div className="w-full md:flex-1 min-w-0 md:min-w-[320px] md:max-w-[400px]">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Dropdown for scan type options */}
                  <div ref={dropdownRef} className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[38px] flex items-center justify-between"
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
                        className={`w-3 h-3 text-gray-400 transition-transform ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
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

                  {/* Checkbox for full site scan */}
                  <div className="flex items-center space-x-2 p-2 border border-gray-300 rounded-md whitespace-nowrap">
                    <TbZoomScanFilled className="w-4 h-4 text-green-500" />
                    <label
                      htmlFor="fullSiteScan"
                      className="text-xs font-medium text-gray-700 cursor-pointer"
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
              </div>
            </div>

            <div className="flex justify-center mt-4 w-full">
              <button
                type="button"
                className="search-button bg-primary text-white px-4 py-2 rounded whitespace-nowrap w-full"
                style={{ width: '100%' }}
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
                Free Scan
                {isGenerating && (
                  <CircularProgress
                    size={14}
                    sx={{ color: 'white' }}
                    className="ml-2 my-auto"
                  />
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 pl-6 pr-6 grid md:grid-cols-3 gap-6 text-center">
            <Card>
              <CardContent className="my-8">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">
                  Comprehensive Analysis
                </h2>
                <p className="text-gray-600 mb-4">
                  Our scanner checks for WCAG 2.1 compliance across your entire
                  site.
                </p>
                <div className="flex justify-center w-full">
                  <FaCheckCircle size={90} color="green" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="my-8">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">
                  Detailed Reports
                </h2>
                <p className="text-gray-600 mb-4">
                  Receive a full breakdown of accessibility issues and how to
                  fix them.
                </p>
                <div className="flex justify-center w-full">
                  <TbReportSearch size={95} color="green" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="my-8">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">
                  Improve User Experience
                </h2>
                <p className="text-gray-600 mb-4">
                  Make your website accessible to all users, regardless of
                  abilities.
                </p>
                <div className="flex justify-center w-full">
                  <FaUniversalAccess size={95} color="blue" />
                </div>
              </CardContent>
            </Card>
          </div>

          {siteOptions.some(
            (option: any) =>
              normalizeDomain(option.value) ===
              normalizeDomain(selectedOption?.value ?? ''),
          ) &&
            enhancedScoresCalculated &&
            processedReportKeys.length > 0 && (
              <div className="accessibility-issues-section bg-white rounded-xl p-6 mt-12 shadow mr-6 ml-6">
                <div className="flex items-center justify-between mb-6 border-b-2 border-gray-300 pb-2">
                  <h3 className="text-2xl font-medium text-gray-800">
                    Your audit history
                  </h3>
                </div>
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-gray-500 text-sm uppercase">
                      <th className="py-2 px-4">Webpage</th>
                      <th className="py-2 px-4">Date</th>
                      <th className="py-2 px-4">Time</th>
                      <th className="py-2 px-4">Compliance Status</th>
                      <th className="py-2 px-4">Accessibility Score</th>
                      <th className="print-report-button py-2 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedReportKeys.map((row: any, idx: number) => {
                      const dateObj = new Date(Number(row.created_at));
                      const date = dateObj.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      });
                      const time = dateObj.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const complianceStatus = getComplianceStatus(
                        row.enhancedScore,
                      );

                      return (
                        <tr
                          key={row.r2_key}
                          className={`bg-${
                            idx % 2 === 0 ? 'white' : 'gray-50'
                          } hover:bg-blue-50 transition`}
                          style={{ borderRadius: 8 }}
                        >
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {row.url}
                          </td>
                          <td className="py-3 px-4">{date}</td>
                          <td className="py-3 px-4">{time}</td>
                          <td className="py-3 px-4">
                            {complianceStatus === 'Compliant' ? (
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                Compliant
                              </span>
                            ) : complianceStatus === 'Partially Compliant' ? (
                              <span className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded text-xs">
                                Partially Compliant
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                                {complianceStatus}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              {row.score}
                            </span>
                          </td>
                          <td className="py-3 px-4 flex gap-2">
                            <button
                              className="text-blue-600 underline font-medium"
                              onClick={() => {
                                setReportUrl(
                                  `/${row.r2_key}?domain=${encodeURIComponent(
                                    row.url,
                                  )}`,
                                );
                                setIsSuccessModalOpen(true);
                              }}
                            >
                              View
                            </button>
                            <button
                              className="text-blue-600 underline font-medium flex items-center gap-2"
                              disabled={downloadingRow === row.r2_key}
                              onClick={async () => {
                                setDownloadingRow(row.r2_key);
                                try {
                                  // Fetch the report for the clicked row and wait for the response
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
                                    );
                                    const url =
                                      window.URL.createObjectURL(pdfBlob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = 'accessibility-report.pdf';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                  } else {
                                    toast.error(
                                      'Failed to generate PDF. Please try again.',
                                    );
                                  }
                                } catch (error) {
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
                              <span className="flex justify-end items-center w-full">
                                {downloadingRow === row.r2_key ? (
                                  <CircularProgress
                                    size={14}
                                    sx={{ color: 'blue', marginLeft: 4 }}
                                  />
                                ) : (
                                  'Detailed Report'
                                )}
                              </span>
                            </button>
                            <button
                              className="text-green-600 underline font-medium flex items-center gap-2"
                              disabled={downloadingRow === row.r2_key}
                              onClick={async () => {
                                setDownloadingRow(row.r2_key);
                                try {
                                  // Fetch the report for the clicked row and wait for the response
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
                                      row.url,
                                    );
                                    const url =
                                      window.URL.createObjectURL(pdfBlob);
                                    const link = document.createElement('a');
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
                              <span className="flex justify-end items-center w-full">
                                {downloadingRow === row.r2_key ? (
                                  <CircularProgress
                                    size={14}
                                    sx={{ color: 'green', marginLeft: 4 }}
                                  />
                                ) : (
                                  'Prospect report'
                                )}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* Success Modal with link to open report */}
        <Modal isOpen={isSuccessModalOpen}>
          <div className="p-8 text-center relative">
            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              aria-label="Close modal"
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
              <FaCheckCircle size={64} color="green" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Report Generated Successfully!
              </h2>
              <p className="text-gray-600">
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
    </>
  );
};

export default AccessibilityReport;
