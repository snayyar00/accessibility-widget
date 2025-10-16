import React, { useEffect, useState, useRef, useMemo } from 'react';
import './Accessibility.css'; // Ensure your CSS file includes styles for the accordion
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
import { toast } from 'sonner';
import isValidDomain from '@/utils/verifyDomain';
import Button from '@mui/joy/Button';
import AccordionGroup from '@mui/joy/AccordionGroup';
import Accordion from '@mui/joy/Accordion';
import ToggleButtonGroup from '@mui/joy/ToggleButtonGroup';
import Stack from '@mui/joy/Stack';
import { generatePDF, generateShortPDF } from '@/utils/generatePDF';
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
      reportData.url = processedReportKeys?.[0]?.url || '';
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
        doc.addPage();
        currentY = 15; // Reset for new page
        pageRowCount = 0;
      }

      // Calculate final position for fixes more card - spanning full width
      const finalFixesMoreCardY =
        currentY + pageRowCount * (issueCardHeight + 3);
      const fixesMoreCardX = cardsStartX; // Start from leftmost position
      const fixesMoreCardWidth = issueCardWidth * 3 + issueCardSpacing * 2; // Width of 3 cards + spacing

      // 3D shadow for fixes more card
      doc.setFillColor(220, 220, 220);
      doc.roundedRect(
        fixesMoreCardX + 1,
        finalFixesMoreCardY + 1,
        fixesMoreCardWidth,
        issueCardHeight,
        2,
        2,
        'F',
      );

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

  return (
    <div>
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
              <p
                className="text-2xl font-semibold"
                style={{ color: baseColors.grayDark2 }}
              >
                Scanner
              </p>
              <p
                className="text-base mt-2"
                style={{ color: baseColors.grayText }}
              >
                Evaluate your website's accessibility in seconds. View a history
                of all accessibility scans. Download your reports.
              </p>
            </div>

            {/* Single row: Language, Domain input, Scan Type, Checkbox, and Free Scan button */}
            <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
              {/* Language Selector */}
              <div className="w-full lg:w-auto lg:min-w-[140px]">
                <Tooltip
                  title="Please select a language before scanning."
                  open={showLangTooltip}
                  placement="top"
                  arrow
                >
                  <div className="relative">
                    <select
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
                        style={{ color: baseColors.grayMuted }}
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
                  }}
                />
              </div>

              {/* Scan Type Selector */}
              <div className="w-full lg:w-auto lg:min-w-[220px] scan-type-selector">
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
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
                      style={{ color: baseColors.grayMuted }}
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
                    backgroundColor: '#3343AD',
                    color: baseColors.white,
                    minHeight: '50px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2A3690';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3343AD';
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
                  Free Scan
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
                  background:
                    'linear-gradient(135deg, #222D73 0%, #3A4A8F 100%)',

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
                      <h2
                        className="text-base sm:text-lg font-bold mb-1"
                        style={{ color: baseColors.white }}
                      >
                        Comprehensive Analysis
                      </h2>
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
                  background:
                    'linear-gradient(135deg, #222D73 0%, #3A4A8F 100%)',

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
                      <h2
                        className="text-base sm:text-lg font-bold mb-1"
                        style={{ color: baseColors.white }}
                      >
                        Detailed Reports
                      </h2>
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
                  background:
                    'linear-gradient(135deg, #222D73 0%, #3A4A8F 100%)',

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
                      <h2
                        className="text-base sm:text-lg font-bold mb-1"
                        style={{ color: baseColors.white }}
                      >
                        Improve User Experience
                      </h2>
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
                    <h3
                      className="text-xl sm:text-2xl font-medium"
                      style={{ color: baseColors.grayDark2 }}
                    >
                      Scan history
                    </h3>
                  </div>

                  {/* Column Headers */}
                  <div className="hidden md:grid grid-cols-4 gap-4 mb-4 px-4">
                    <div
                      className="text-sm font-medium uppercase tracking-wider"
                      style={{ color: baseColors.brandPrimary }}
                    >
                      Sites
                    </div>
                    <div
                      className="text-sm font-medium uppercase tracking-wider text-center"
                      style={{ color: baseColors.brandPrimary }}
                    >
                      Last scanned
                    </div>
                    <div
                      className="text-sm font-medium uppercase tracking-wider text-center"
                      style={{ color: baseColors.brandPrimary }}
                    >
                      Score
                    </div>
                    <div
                      className="text-sm font-medium uppercase tracking-wider text-center"
                      style={{ color: baseColors.brandPrimary }}
                    >
                      Action
                    </div>
                  </div>

                  {/* Site Cards */}
                  <div className="space-y-3 max-w-full">
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
                        <div
                          key={row.r2_key}
                          className="block md:grid md:grid-cols-4 gap-4 md:items-center p-3 sm:p-4 rounded-lg border hover:shadow-md transition-all duration-200 group relative overflow-hidden md:overflow-visible w-full cursor-pointer"
                          style={{
                            backgroundColor: baseColors.cardLight,
                            borderColor: baseColors.cardBorder,
                          }}
                          onClick={() => {
                            setReportUrl(
                              `/${row.r2_key}?domain=${encodeURIComponent(
                                row.url,
                              )}`,
                            );
                            setIsSuccessModalOpen(true);
                          }}
                        >
                          {/* Mobile Layout */}
                          <div className="md:hidden space-y-3 w-full max-w-full overflow-hidden">
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
                                  <div
                                    className="font-medium truncate"
                                    style={{ color: baseColors.grayDark2 }}
                                  >
                                    {row.url
                                      .replace(/^https?:\/\//, '')
                                      .replace(/^www\./, '')}
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
                                    className="absolute top-10 w-44 sm:w-48 rounded-lg shadow-lg z-50 py-2"
                                    style={{
                                      backgroundColor: baseColors.white,
                                      border: `1px solid ${baseColors.cardBorderPurple}`,
                                      maxWidth: 'calc(100vw - 3rem)',
                                      minWidth: '180px',
                                      right: '0',
                                      left: 'auto',
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
                                            );
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
                          </div>

                          {/* Site Info - Desktop Only */}
                          <div className="hidden md:flex items-center gap-3">
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
                              <div
                                className="font-medium truncate"
                                style={{ color: baseColors.grayDark2 }}
                              >
                                {row.url
                                  .replace(/^https?:\/\//, '')
                                  .replace(/^www\./, '')}
                              </div>
                            </div>
                          </div>

                          {/* Last Scanned - Desktop Only */}
                          <div className="hidden md:block text-center">
                            <div
                              className="text-sm"
                              style={{ color: baseColors.grayMuted }}
                            >
                              {timeAgo}
                            </div>
                          </div>

                          {/* Desktop Score */}
                          <div className="hidden md:block text-center">
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
                          </div>

                          {/* Desktop 3-Dots Menu */}
                          <div
                            className="hidden md:flex justify-center relative"
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

                            {/* Desktop Dropdown Menu */}
                            {openDropdown === row.r2_key && (
                              <div
                                className="absolute top-10 w-48 rounded-lg shadow-lg z-50 py-2"
                                style={{
                                  backgroundColor: baseColors.white,
                                  border: `1px solid ${baseColors.cardBorderPurple}`,
                                  maxWidth: 'calc(100vw - 3rem)',
                                  minWidth: '180px',
                                  right: '0',
                                  left: 'auto',
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
                                        );
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
                        </div>
                      );
                    })}
                  </div>
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
                    <h3
                      className="text-xl sm:text-2xl font-medium"
                      style={{ color: baseColors.grayDark2 }}
                    >
                      Scan history
                    </h3>
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
                <FaCheckCircle
                  size={64}
                  color="green"
                  className="mx-auto mb-4"
                />
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
      </div>
    </div>
  );
};

export default AccessibilityReport;
