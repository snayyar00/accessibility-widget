import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import './Accessibility.css'; // Ensure your CSS file includes styles for the accordion
import { AiFillCloseCircle } from 'react-icons/ai';
import { FaGaugeSimpleHigh } from 'react-icons/fa6';
import { FaUniversalAccess, FaCheckCircle, FaCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import SAVE_ACCESSIBILITY_REPORT from '@/queries/accessibility/saveAccessibilityReport'
import GET_USER_SITES from '@/queries/sites/getSites';
import FETCH_ACCESSIBILITY_REPORT_KEYS from '@/queries/accessibility/fetchAccessibilityReport';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import isValidDomain, { validateDomainWithDetails } from '@/utils/verifyDomain';
import Button from '@mui/joy/Button';
import AccordionGroup from '@mui/joy/AccordionGroup';
import Accordion from '@mui/joy/Accordion';
import ToggleButtonGroup from '@mui/joy/ToggleButtonGroup';
import Stack from '@mui/joy/Stack';
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
  Input, Typography, Box
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
import WebAbilityMetadata from './WebAbilityMetadata';
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
import autoTable from 'jspdf-autotable';
import Select from 'react-select/creatable';
import { set } from 'lodash';
import Modal from '@/components/Common/Modal';

const WEBABILITY_SCORE_BONUS = 45;
const MAX_TOTAL_SCORE = 95;

// Helper function to calculate enhanced scores
function calculateEnhancedScore(baseScore: number) {
  const enhancedScore = baseScore + WEBABILITY_SCORE_BONUS;
  return Math.min(enhancedScore, MAX_TOTAL_SCORE);
}

const normalizeDomain = (url: string) =>
  url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

// Helper function to extract domain initial
const getDomainInitial = (url: string): string => {
  try {
    // Remove protocol and www, then get first character of domain
    const cleanDomain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return cleanDomain.charAt(0).toUpperCase() || '?';
  } catch {
    return '?';
  }
};



const AccessibilityReport = ({ currentDomain }: any) => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.report') });
  const [score, setScore] = useState(0);
  const [scoreBackup, setScoreBackup] = useState(0);
  const [domain, setDomain] = useState(currentDomain);
  const [siteImg, setSiteImg] = useState('');
  const [expand, setExpand] = useState(false);
  const [correctDomain, setcorrectDomain] = useState(currentDomain);
  //console.log('Current domain:', correctDomain);
  // const [accessibilityData, setAccessibilityData] = useState({});
  const { data: sitesData } = useQuery(GET_USER_SITES);
  const [saveAccessibilityReport] = useMutation(SAVE_ACCESSIBILITY_REPORT);
  const [selectedSite, setSelectedSite] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [enhancedScoresCalculated, setEnhancedScoresCalculated] = useState(false);
  const [scanProgress, setScanProgress] = useState({ 
    step: '', 
    estimatedTime: 0, 
    elapsed: 0,
    phase: 'initializing', // initializing, analyzing, processing, finalizing
    confidence: 'high' // high, medium, low (for time estimates)
  });
  const [fetchReportKeys, { data: reportKeysData, loading: loadingReportKeys }] = useLazyQuery(FETCH_ACCESSIBILITY_REPORT_KEYS);
  const [processedReportKeys, setProcessedReportKeys] = useState<any[]>([]);
  const [getAccessibilityStatsQuery, { data, loading, error }] = useLazyQuery(
    getAccessibilityStats
  );
  const [fetchReportByR2Key, { loading: loadingReport, data: reportData }] = useLazyQuery(FETCH_REPORT_BY_R2_KEY);
  type OptionType = { value: string; label: string };
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null)
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef: contentRef });
  
  // Modal state for success message with report link
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [reportUrl, setReportUrl] = useState<string>('');
  
  // Enhanced data state
  const [webabilityMetadata, setWebabilityMetadata] = useState<any>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    scoreRange: '',
    sortBy: 'date-desc'
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Combine options for existing sites and a custom "Enter a new domain" option
  const siteOptions = sitesData?.getUserSites?.map((domain: any) => ({
    value: domain.url,
    label: domain.url,
  })) || [];

   // Handle tour completion
  const handleTourComplete = () => {
    console.log('Accessibility tour completed!');
  };

  // Improved progress tracking with adaptive timing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (loading) {
      const startTime = Date.now();
      setScanProgress({ 
        step: 'Initializing accessibility scanner', 
        estimatedTime: 45, 
        elapsed: 0,
        phase: 'initializing',
        confidence: 'high'
      });
      
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        
        // Adaptive timing based on current phase
        let estimatedTime, step, phase, confidence;
        
        if (elapsed <= 5) {
          step = 'Initializing accessibility scanner';
          estimatedTime = Math.max(40 - elapsed, 30);
          phase = 'initializing';
          confidence = 'high';
        } else if (elapsed <= 15) {
          step = 'Loading website structure and analyzing DOM';
          estimatedTime = Math.max(35 - elapsed, 25);
          phase = 'analyzing';
          confidence = 'high';
        } else if (elapsed <= 30) {
          step = 'Running comprehensive WCAG compliance tests';
          estimatedTime = Math.max(30 - elapsed, 15);
          phase = 'analyzing';
          confidence = 'medium';
        } else if (elapsed <= 45) {
          step = 'Analyzing color contrast and navigation patterns';
          estimatedTime = Math.max(20 - elapsed, 10);
          phase = 'processing';
          confidence = 'medium';
        } else if (elapsed <= 60) {
          step = 'Processing scan results and generating report';
          estimatedTime = Math.max(15 - elapsed, 5);
          phase = 'finalizing';
          confidence = 'low';
        } else {
          // Handle extended scan times gracefully
          step = 'Performing deep accessibility analysis (complex site detected)';
          estimatedTime = 10; // Keep showing reasonable estimate
          phase = 'finalizing';
          confidence = 'low';
        }
        
        setScanProgress({ step, estimatedTime, elapsed, phase, confidence });
      }, 1000);
    } else {
      setScanProgress({ 
        step: '', 
        estimatedTime: 0, 
        elapsed: 0,
        phase: 'initializing',
        confidence: 'high'
      });
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  useEffect(() => {
    if (data) {
      const result = data.getAccessibilityReport;
      if (result) {
        let score = result.score;
        let allowed_sites_id = null;
        
        // Check if this is a scan error
        const hasScanError = result.processing_stats?.scan_error;
        if (hasScanError) {
          console.log('🔧 Scan error detected:', hasScanError);
          const strategiesAttempted = result.processing_stats?.strategies_attempted || 1;
          
          if (hasScanError === 'PA11Y_COMPATIBILITY_ISSUE') {
            toast.warning(
              `This website has compatibility issues with automated accessibility scanners. We attempted ${strategiesAttempted} different scanning approaches but encountered technical limitations. The website may still have accessibility issues that weren't detected. Consider trying individual pages or manual testing.`,
              { autoClose: 12000 }
            );
          } else if (hasScanError === 'PA11Y_SERVER_ERROR') {
            toast.warning(
              'This website has technical compatibility issues with our scanner. The scan was partially completed. For comprehensive results, try scanning a different page or contact support.',
              { autoClose: 8000 }
            );
          } else {
            toast.warning(
              'There was a technical issue scanning this website. The report may be incomplete.',
              { autoClose: 6000 }
            );
          }
        }
        
        //console.log('Accessibility report data:', result);
        
        // Extract WebAbility metadata if available
        if (result.webability_metadata) {
          setWebabilityMetadata(result.webability_metadata);
          console.log('🎯 WebAbility metadata found:', result.webability_metadata);
        }
        
        if (sitesData && sitesData.getUserSites) {
          const matchedSite = sitesData.getUserSites.find(
            (site: any) => normalizeDomain(site.url) == normalizeDomain(correctDomain)
          );
          allowed_sites_id = matchedSite ? matchedSite.id : null;
        }
        saveAccessibilityReport({
          variables: {
            report: result,
            url: normalizeDomain(correctDomain),
            allowed_sites_id,
            score: typeof score === 'object' ? score : { value: score },
          },
        }).then(({ data }) => {
          setReportGenerated((prev) => !prev);
          const isNewDomain = !siteOptions.some((option: any) => normalizeDomain(option.value) === normalizeDomain(correctDomain));

          console.log('🔍 Save report success:', {
            isNewDomain,
            correctDomain: normalizeDomain(correctDomain),
            siteOptionsCount: siteOptions.length,
            saveDataExists: !!data?.saveAccessibilityReport
          });

          if (data && data.saveAccessibilityReport) {
            const savedReport = data.saveAccessibilityReport;
            const r2Key = savedReport.key;
            const savedUrl = savedReport.report.url;
            
            // Always show success modal for completed scans
            console.log('✅ Setting up success modal with key:', r2Key);
            setReportUrl(`/${r2Key}?domain=${encodeURIComponent(savedUrl)}`);
            setIsSuccessModalOpen(true);
          } else {
            console.log('⚠️ No saved report data, showing toast instead');
            toast.success('Report successfully generated! You can view or download it below.');
          }
        }).catch((saveError) => {
          console.error('❌ Error saving report:', saveError);
          toast.error('Report generated but failed to save. Please try again.');
        });
        // Fallback: If save operation somehow fails but we have scan results,
        // still try to show a basic success message
        if (result && !isSuccessModalOpen) {
          console.log('🔄 Fallback: scan completed successfully, showing toast notification');
          toast.success('Accessibility scan completed successfully!', { autoClose: 5000 });
        }

        const { htmlcs } = result;
        groupByCode(htmlcs);
      }
      setSiteImg(result?.siteImg);
      setScoreBackup(Math.min(result?.score || 0, 95));
      setScore(Math.min(result?.score || 0, 95));
      // setAccessibilityData(htmlcs);
    }
  }, [data]);

  useEffect(() => {
    if (selectedSite) {
      fetchReportKeys({ variables: { url: selectedSite } });
    }
  }, [selectedSite]);

  useEffect(() => {
    if (reportKeysData) {
      const updatedData = reportKeysData.fetchAccessibilityReportFromR2.map((row: any) => {
        const enhancedScore = calculateEnhancedScore(row.score || 0);
        return { ...row, enhancedScore };
      });
      setProcessedReportKeys(updatedData);
      setEnhancedScoresCalculated(true);
    }
  }, [reportKeysData]);

  useEffect(() => {
    if (expand === true) {
      reactToPrintFn();
      setExpand(false);
    }
  }, [expand]);

  // When a domain is selected, fetch all report keys for that domain
  useEffect(() => {
    if (selectedSite) {
      fetchReportKeys({ variables: { url: selectedSite } });
    }
  }, [selectedSite, reportGenerated]);

  const handleSubmit = async () => {
    const validationResult = validateDomainWithDetails(domain);
    if (!validationResult.isValid) {
      console.log('Invalid domain:', domain, 'Reason:', validationResult.error);
      setDomain(currentDomain);
      toast.error(`Invalid domain: ${validationResult.error}`);
      return;
    }
    
    // Ensure we have a valid domain before setting correctDomain and making the query
    const validDomain = domain.trim();
    if (!validDomain) {
      toast.error('Please enter a valid domain!');
      return;
    }
    
    setcorrectDomain(validDomain);
    
    try {
      // Pass the domain directly to the query to avoid using empty correctDomain
      // Encode URL for safe transmission
      await getAccessibilityStatsQuery({ 
        variables: { url: encodeURIComponent(validDomain) } 
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    }
  };

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

  const groupByCode = (issues: any) => {
    console.log('group code called');
    if (issues && typeof issues === 'object') {
      issues.errors = groupByCodeUtil(issues.errors);
      issues.warnings = groupByCodeUtil(issues.warnings);
      issues.notices = groupByCodeUtil(issues.notices);
    }
  };

  const getComplianceStatus = (score: number) => {
    if (score >= 80) {
      return 'Compliant';
    } else if (score >= 50) {
      return 'Partially Compliant';
    } else {
      return 'Non-Compliant';
    }
  };

  // Memoized filter function for performance
  const filterReports = useCallback((row: any) => {
    // Status filter
    if (filters.status) {
      const status = getComplianceStatus(row.enhancedScore);
      if (filters.status === 'compliant' && status !== 'Compliant') return false;
      if (filters.status === 'partial' && status !== 'Partially Compliant') return false;
      if (filters.status === 'non-compliant' && status !== 'Non-Compliant') return false;
    }
    
    // Score range filter
    if (filters.scoreRange) {
      const score = row.score;
      if (filters.scoreRange === '90-100' && (score < 90 || score > 100)) return false;
      if (filters.scoreRange === '70-89' && (score < 70 || score >= 90)) return false;
      if (filters.scoreRange === '50-69' && (score < 50 || score >= 70)) return false;
      if (filters.scoreRange === '0-49' && (score < 0 || score >= 50)) return false;
    }
    
    return true;
  }, [filters.status, filters.scoreRange]);

  // Memoized sort function for performance
  const sortReports = useCallback((a: any, b: any) => {
    switch (filters.sortBy) {
      case 'date-desc':
        return Number(b.created_at) - Number(a.created_at);
      case 'date-asc':
        return Number(a.created_at) - Number(b.created_at);
      case 'score-desc':
        return b.score - a.score;
      case 'score-asc':
        return a.score - b.score;
      case 'domain-asc':
        return a.url.localeCompare(b.url);
      case 'domain-desc':
        return b.url.localeCompare(a.url);
      default:
        return Number(b.created_at) - Number(a.created_at);
    }
  }, [filters.sortBy]);

  // Memoized filtered and sorted audit history for performance
  const filteredReportKeys = useMemo(() => {
    return processedReportKeys
      .filter(filterReports)
      .sort(sortReports);
  }, [processedReportKeys, filterReports, sortReports]);

  // Shared utility functions to reduce code duplication
  const formatReportDate = useCallback((timestamp: number) => {
    const dateObj = new Date(timestamp);
    const date = dateObj.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const time = dateObj.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return { date, time, dateObj };
  }, []);

     const getReportData = useCallback((row: any) => {
     const { date, time } = formatReportDate(Number(row.created_at));
     const complianceStatus = getComplianceStatus(row.enhancedScore);
     const urlInitial = getDomainInitial(row.url);
    
    return {
      date,
      time,
      complianceStatus,
      urlInitial,
      score: row.score,
      url: row.url,
      r2_key: row.r2_key,
      enhancedScore: row.enhancedScore
    };
  }, [formatReportDate]);

  // Update active filters for display
  const updateActiveFilters = () => {
    const active: string[] = [];
    if (filters.status) {
      const statusLabel = filters.status === 'compliant' ? 'Compliant' : 
                         filters.status === 'partial' ? 'Partially Compliant' : 'Non-Compliant';
      active.push(statusLabel);
    }
    if (filters.scoreRange) active.push(`Score: ${filters.scoreRange}%`);
    setActiveFilters(active);
  };

  // Update active filters when filters change
  useEffect(() => {
    updateActiveFilters();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      status: '',
      scoreRange: '',
      sortBy: 'date-desc'
    });
  };

  // Remove individual filter
  const removeFilter = (filterToRemove: string) => {
    if (['Compliant', 'Partially Compliant', 'Non-Compliant'].includes(filterToRemove)) {
      handleFilterChange('status', '');
    } else if (filterToRemove.startsWith('Score:')) {
      handleFilterChange('scoreRange', '');
    }
  };

  const generatePDF = (reportData: { score: number; widgetInfo: { result: string; }; }, enhancedScore: number, url: string) => {
    const doc = new jsPDF();
    const logoUrl = '/images/logo.png';

    try {
      if (typeof window !== 'undefined' && window.Image) {
        doc.addImage(logoUrl, 'PNG', 8, 6, 50, 18, undefined, 'FAST');
      }
    } catch (error) {
      console.error('Error loading logo image:', error);
    }

    // Extract issues for PDF
    const issues = extractIssuesFromReport(reportData);

    // Compliance logic based on enhanced score
    let status, message, statusColor: [number, number, number];
    if (enhancedScore >= 80) {
      status = "Compliant";
      message = "Your website meets the basic requirements for accessibility.";
      statusColor = [43, 168, 74]; // green
    } else if (enhancedScore >= 50) {
      status = "Partially Compliant";
      message = "Your website meets some accessibility requirements but needs improvement.";
      statusColor = [243, 182, 31]; // yellow
    } else {
      status = "Non-compliant";
      message = "Your website needs significant accessibility improvements.";
      statusColor = [255, 27, 28]; // red
    }

    // Overview Section
    let y = 32;

    doc.setFontSize(16);
    doc.setFont('Helvetica', 'normal');
    const scanResultsText = 'Scan Results for';
    const urlText = url || '';
    doc.text(scanResultsText, 8, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(urlText, 7 + doc.getTextWidth(scanResultsText), y);

    // Compliance status and message
    y += 10;
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...statusColor);
    const statusLabel = `${status}: `;
    doc.text(statusLabel, 8, y);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(message, 11 + doc.getTextWidth(statusLabel), y);

    // Accessibility Score
    y += 10;
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    const scoreLabel = 'Accessibility Score: ';
    doc.text(scoreLabel, 8, y);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const scoreText = `${enhancedScore}%`;
    doc.text(scoreText, 12 + doc.getTextWidth(scoreLabel), y);

    if (reportData.widgetInfo?.result === 'WebAbility') {
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(43, 168, 74);
      const bonusText = `(Base: ${reportData.score}% + ${WEBABILITY_SCORE_BONUS}% WebAbility Bonus)`;
      doc.text(bonusText, 14 + doc.getTextWidth(scoreLabel + scoreText), y);
    }

    // Issue counts
    y += 12;
    doc.setFontSize(13);
    doc.setTextColor(60, 60, 60);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Total Issues: ${issues.length}`, 8, y);

    y += 8;

    // Table of Issues
    if (issues.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: 8, right: 8 },
        head: [['Code', 'Message', 'Context', 'Suggested Fix']],
        body: issues.map(issue => [
          (issue.code ? `${issue.code} (${issue.impact})` : ''),
          issue.message || '',
          (Array.isArray(issue.context) ? issue.context[0] : issue.context) || '',
          issue.recommended_action || ''
        ]),
        didParseCell: function (data) {
          if (data.section === 'body') {
            const issue = issues[data.row.index];
            if (issue) {
              if (issue.impact === 'critical') data.cell.styles.fillColor = [255, 204, 204];
              else if (issue.impact === 'serious') data.cell.styles.fillColor = [255, 236, 179];
              else data.cell.styles.fillColor = [204, 229, 255];
              data.cell.styles.textColor = [0, 0, 0];
            }
          }
        },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 60 },
          2: { cellWidth: 50 },
          3: { cellWidth: 50 }
        }
      });
    }

    return doc.output("blob");
  };

  // Extract issues from report structure including WebAbility enhancements
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
              functionality: funcGroup.FunctionalityName,
              // Include WebAbility enhancements
              screenshotUrl: error.screenshotUrl,
              helpUrl: error.helpUrl,
              wcagLevel: error.wcagLevel,
              runner: error.runner
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
              functionality: funcGroup.FunctionalityName,
              screenshotUrl: error.screenshotUrl,
              helpUrl: error.helpUrl,
              wcagLevel: error.wcagLevel,
              runner: error.runner
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
              functionality: funcGroup.FunctionalityName,
              screenshotUrl: error.screenshotUrl,
              helpUrl: error.helpUrl,
              wcagLevel: error.wcagLevel,
              runner: error.runner
            })
          })
        }
      })
    }

    return issues;
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

  return (
    <>
    <TourGuide
        steps={accessibilityTourSteps}
        tourKey={tourKeys.accessibility}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />
          <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
          <div className="text-center accessibility-page-header">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Enterprise Trusted • AI-Powered
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Enterprise Accessibility<br />Intelligence Platform
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Protect your brand with AI-powered compliance monitoring. Eliminate ADA lawsuit risk and unlock the $13 trillion disability market with enterprise-grade technology.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl">
                <div className="flex flex-col gap-4">
                  <div className="relative z-10">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
                        </svg>
                      </div>
                    </div>
                    <Select
                      options={siteOptions || []}
                      value={selectedOption}
                      onChange={(selected: OptionType | null) => {
                        try {
                          setSelectedOption(selected);
                          setSelectedSite(selected?.value ?? '');
                          setDomain(selected?.value ?? '');
                        } catch (error) {
                          console.error('Error handling select change:', error);
                        }
                      }}
                                           onCreateOption={(inputValue: any) => {
                         try {
                           // Enhanced validation for input value with type checking
                           let cleanedValue = '';
                           if (typeof inputValue === 'string' && inputValue.trim()) {
                             cleanedValue = inputValue.trim();
                           } else if (inputValue && typeof inputValue.toString === 'function') {
                             cleanedValue = inputValue.toString().trim();
                           }
                           
                           if (!cleanedValue) {
                             console.warn('Empty or invalid input value for domain creation:', inputValue);
                             return; // Don't create option for empty values
                           }
                           
                           // Ensure proper option structure
                           const newOption = { 
                             value: cleanedValue, 
                             label: cleanedValue,
                             __isNew__: true 
                           };
                           
                           console.log('Creating new option:', newOption);
                           setSelectedOption(newOption);
                           setSelectedSite(cleanedValue);
                           setDomain(cleanedValue);
                         } catch (error) {
                           console.error('Error creating option:', error);
                         }
                       }}
                      placeholder="Enter your enterprise domain (e.g., your-company.com)"
                      isSearchable
                      isClearable
                                           formatCreateLabel={(inputValue: any) => {
                         // Proper type checking for inputValue
                         let safeValue = 'domain';
                         if (typeof inputValue === 'string' && inputValue.trim()) {
                           safeValue = inputValue.trim();
                         } else if (inputValue && typeof inputValue.toString === 'function') {
                           safeValue = inputValue.toString().trim() || 'domain';
                         }
                         
                         return (
                           <div className="flex items-center gap-2 py-1">
                             <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                               <span className="text-white text-xs">+</span>
                             </div>
                             <span>Audit <strong>"{safeValue}"</strong></span>
                           </div>
                         );
                       }}
                      components={{
                                               Option: ({ innerRef, innerProps, data, isSelected, isFocused }: any) => {
                           // Add error handling for undefined or invalid data
                           if (!data) {
                             return null;
                           }
                           
                           // Debug logging to understand data structure
                           if (process.env.NODE_ENV === 'development') {
                             console.log('Option data:', data);
                           }
                           
                           // Handle both regular options and created options with proper type checking
                           let displayValue = '';
                           if (typeof data.label === 'string' && data.label.trim()) {
                             displayValue = data.label.trim();
                           } else if (typeof data.value === 'string' && data.value.trim()) {
                             displayValue = data.value.trim();
                           } else if (data.__isNew__ && typeof data.inputValue === 'string') {
                             displayValue = data.inputValue.trim();
                           } else {
                             // Last resort: try to extract any string value
                             console.warn('Unexpected data structure in Option:', data);
                             displayValue = 'Unknown domain';
                           }
                           
                           const safeLabel = displayValue;
                           const firstChar = getDomainInitial(displayValue);
                          
                          return (
                            <div
                              ref={innerRef}
                              {...innerProps}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-blue-600 text-white' 
                                  : isFocused 
                                    ? 'bg-blue-50 text-gray-900' 
                                    : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-sm ${
                                isSelected 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-blue-600 text-white'
                              }`}>
                                {firstChar}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{safeLabel}</div>
                                <div className={`text-xs ${
                                  isSelected ? 'text-white/80' : 'text-gray-500'
                                }`}>
                                  Enterprise compliant
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        },
                                               SingleValue: ({ data }: any) => {
                           // Add error handling for undefined or invalid data
                           if (!data) {
                             return null;
                           }
                           
                           // Debug logging to understand data structure  
                           if (process.env.NODE_ENV === 'development') {
                             console.log('SingleValue data:', data);
                           }
                           
                           // Handle both regular options and created options with proper type checking
                           let displayValue = '';
                           if (typeof data.label === 'string' && data.label.trim()) {
                             displayValue = data.label.trim();
                           } else if (typeof data.value === 'string' && data.value.trim()) {
                             displayValue = data.value.trim();
                           } else if (data.__isNew__ && typeof data.inputValue === 'string') {
                             displayValue = data.inputValue.trim();
                           } else {
                             // Last resort: try to extract any string value
                             console.warn('Unexpected data structure in SingleValue:', data);
                             displayValue = 'Unknown domain';
                           }
                           
                           const safeLabel = displayValue;
                           const firstChar = getDomainInitial(displayValue);
                          
                          return (
                            <div className="absolute inset-0 flex items-center justify-center gap-3">
                              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">
                                  {firstChar}
                                </span>
                              </div>
                              <span className="text-gray-900 font-medium">{safeLabel}</span>
                            </div>
                          );
                        },
                        DropdownIndicator: () => (
                          <div className="px-3">
                            <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        ),
                        ClearIndicator: ({ innerProps }: any) => (
                          <div {...innerProps} className="px-2" title="Clear selection">
                            <div className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          </div>
                        ),
                      }}
                      styles={{
                        control: (provided: any, state: any) => ({
                          ...provided,
                          minHeight: '64px',
                          borderRadius: '16px',
                          border: `2px solid ${state.isFocused ? '#3b82f6' : '#e5e7eb'}`,
                          boxShadow: state.isFocused ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none',
                          backgroundColor: 'white',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          '&:hover': {
                            borderColor: '#3b82f6',
                            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.05)',
                          },
                        }),
                        placeholder: (provided: any) => ({
                          ...provided,
                          color: '#6b7280',
                          fontSize: '16px',
                          fontWeight: '400',
                          paddingLeft: '40px',
                        }),
                        input: (provided: any) => ({
                          ...provided,
                          paddingLeft: '40px',
                          fontSize: '16px',
                          color: '#111827',
                        }),
                        menu: (provided: any) => ({
                          ...provided,
                          borderRadius: '16px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                          overflow: 'visible',
                          marginTop: '8px',
                          zIndex: 99999,
                          position: 'absolute',
                          width: '100%',
                          minWidth: '300px',
                        }),
                        menuPortal: (provided: any) => ({
                          ...provided,
                          zIndex: 99999,
                        }),
                        menuList: (provided: any) => ({
                          ...provided,
                          padding: '4px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          borderRadius: '16px',
                        }),
                        option: () => ({
                          // Custom option styling handled by component
                        }),
                        singleValue: () => ({
                          // Custom single value styling handled by component
                        }),
                        indicatorSeparator: () => ({
                          display: 'none',
                        }),
                        loadingIndicator: (provided: any) => ({
                          ...provided,
                          color: '#3b82f6',
                        }),
                      }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>

                  <button
                    type="button"
                    className={`search-button w-full relative overflow-hidden font-bold py-6 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 border group ${
                      loading 
                        ? 'bg-blue-600 border-blue-600 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-blue-600 hover:border-blue-700 active:scale-[0.98]'
                    }`}
                    disabled={loading}
                    onClick={() => {
                      if (domain) {
                        handleSubmit();
                      } else {
                        toast.error('Please enter a valid enterprise domain for analysis.');
                      }
                    }}
                  >
                    {/* Enhanced Loading State */}
                    {loading ? (
                      <div 
                        className="absolute inset-0 bg-blue-600 rounded-2xl flex flex-col items-center justify-center gap-4 z-10 px-6 py-4 animate-in fade-in duration-300"
                        role="status" 
                        aria-live="polite" 
                        aria-label={`Scanning website for accessibility issues: ${scanProgress.step}`}
                      >
                        {/* Header with enhanced spinner */}
                        <div className="flex items-center gap-4">
                          <div className="relative" aria-hidden="true">
                            {/* Multi-layer spinner animation */}
                            <div className="w-8 h-8 relative">
                              {/* Outer ring */}
                              <div className="absolute inset-0 border-3 border-white/20 rounded-full"></div>
                              {/* Spinning ring */}
                              <div className="absolute inset-0 border-3 border-transparent border-t-white rounded-full animate-spin"></div>
                              {/* Inner pulse */}
                              <div className="absolute inset-2 bg-white/30 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          <span className="text-lg font-semibold text-white" id="scan-status">
                            Analyzing Enterprise Assets
                          </span>
                        </div>
                        
                        {/* Progress Details */}
                        {scanProgress.step && (
                          <div className="w-full max-w-md space-y-3">
                            {/* Current Step */}
                            <div className="text-center">
                              <div className="text-sm text-blue-100 font-medium mb-2" aria-describedby="scan-status">
                                {scanProgress.step}
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-blue-800/50 rounded-full h-2 mb-3">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                                    scanProgress.phase === 'initializing' ? 'bg-yellow-400 w-1/4' :
                                    scanProgress.phase === 'analyzing' ? 'bg-blue-400 w-1/2' :
                                    scanProgress.phase === 'processing' ? 'bg-orange-400 w-3/4' :
                                    'bg-green-400 w-5/6'
                                  }`}
                                ></div>
                              </div>
                            </div>
                            
                            {/* Timing Information */}
                            <div className="flex items-center justify-center gap-4 text-xs text-blue-200">
                              {/* Elapsed Time */}
                              <span className="inline-flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {scanProgress.elapsed > 0 && (
                                  <span className="font-medium">{scanProgress.elapsed}s elapsed</span>
                                )}
                              </span>
                              
                              {/* Estimated Time with Confidence */}
                              <span className="inline-flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">
                                  ~{scanProgress.estimatedTime}s remaining
                                  {scanProgress.confidence === 'low' && (
                                    <span className="text-blue-300 ml-1">*</span>
                                  )}
                                </span>
                              </span>
                            </div>
                            
                            {/* Extended Time Notice */}
                            {(scanProgress.elapsed > 45 || scanProgress.confidence === 'low') && (
                              <div className="mt-3 p-3 bg-blue-800/40 rounded-lg border border-blue-400/30 animate-in slide-in-from-bottom duration-500">
                                <div className="flex items-start gap-2 text-xs text-blue-100">
                                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  <div>
                                    <div className="font-medium">Complex site detected</div>
                                    <div className="text-blue-200 mt-1">
                                      Large sites with dynamic content may take longer to analyze thoroughly. 
                                      We're ensuring comprehensive coverage of all accessibility aspects.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Timeout Warning */}
                            {scanProgress.elapsed > 90 && (
                              <div className="mt-2 p-3 bg-yellow-600/20 rounded-lg border border-yellow-400/30 animate-in slide-in-from-bottom duration-500">
                                <div className="flex items-center gap-2 text-xs text-yellow-100">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <span className="font-medium">
                                    Taking longer than expected. You can refresh the page to try again if needed.
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Normal State with Enhanced Animation */
                      <div className="flex items-center justify-center gap-4 py-2 transition-all duration-300 group-hover:gap-5">
                        {/* Left Icon */}
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
                          <svg className="w-5 h-5 text-white transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        
                        {/* Text */}
                        <span className="text-xl font-bold tracking-wide text-white transition-all duration-300 group-hover:tracking-wider">
                          Start Compliance Scan
                        </span>
                        
                        {/* Right Arrow */}
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:translate-x-1">
                          <svg className="w-4 h-4 text-white transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Easy Setup, Immediate Results */}
          <div className="group bg-white rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300 h-full flex flex-col">
            <div className="mb-6 flex-shrink-0">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                Rapid Deployment,<br />Instant ROI
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed mt-auto">
                Enterprise compliance in 48 hours • Reduce legal costs by 97%
              </p>
            </div>
          </div>

          {/* Legal Protection */}
          <div className="group bg-white rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-green-300 h-full flex flex-col">
            <div className="mb-6 flex-shrink-0">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                Lawsuit Protection<br />& Risk Mitigation
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed mt-auto">
                Shield your enterprise from ADA lawsuits • $400K average settlement protection
              </p>
            </div>
          </div>

          {/* Universal Compatibility */}
          <div className="group bg-white rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-gray-300 h-full flex flex-col">
            <div className="mb-6 flex-shrink-0">
              <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                Enterprise Integration<br />& Scalability
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed mt-auto">
                Seamless deployment across all tech stacks • Scale to thousands of pages
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Indicators */}
        <div className="mt-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8">
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </div>
                <span className="text-gray-900 font-semibold">WCAG 2.1 AA</span>
              </div>
              
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-gray-900 font-semibold">AI-Powered</span>
              </div>
              
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-gray-900 font-semibold">Enterprise Grade</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WebAbility Enhanced Metadata Section */}
      {webabilityMetadata && data && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WebAbilityMetadata 
            metadata={webabilityMetadata}
            issues={extractIssuesFromReport(data.getAccessibilityReport)}
          />
        </div>
      )}

      {/* Audit History Section */}
      {siteOptions.some((option: any) => normalizeDomain(option.value) === normalizeDomain(selectedOption?.value ?? '')) && enhancedScoresCalculated && processedReportKeys.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
          <div className="accessibility-issues-section bg-white rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Compliance Dashboard</h2>
                <p className="text-gray-600">Monitor enterprise accessibility performance and ROI metrics</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>{processedReportKeys.length} enterprise audit{processedReportKeys.length !== 1 ? 's' : ''} completed</span>
              </div>
            </div>
            
            {/* Filters Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              {/* Modern Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Filter by:</span>
                </div>
                
                <select 
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-gray-700 hover:border-gray-400 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <option value="">All Status</option>
                  <option value="compliant">✓ Compliant</option>
                  <option value="partial">⚠ Partial</option>
                  <option value="non-compliant">✗ Non-Compliant</option>
                </select>

                <select
                  value={filters.scoreRange}
                  onChange={(e) => handleFilterChange('scoreRange', e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-gray-700 hover:border-gray-400 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <option value="">All Scores</option>
                  <option value="90-100">90-100%</option>
                  <option value="70-89">70-89%</option>
                  <option value="50-69">50-69%</option>
                  <option value="0-49">0-49%</option>
                </select>

                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-gray-700 hover:border-gray-400 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <option value="date-desc">Latest</option>
                  <option value="date-asc">Oldest</option>
                  <option value="score-desc">High Score</option>
                  <option value="score-asc">Low Score</option>
                  <option value="domain-asc">A-Z</option>
                  <option value="domain-desc">Z-A</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="flex items-center gap-3">
                {activeFilters.length > 0 && (
                  <div className="flex items-center gap-2">
                    {activeFilters.map((filter, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        {filter}
                        <button 
                          onClick={() => removeFilter(filter)}
                          className="ml-1.5 inline-flex items-center p-0.5 rounded-full text-blue-500 hover:bg-blue-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    <button 
                      onClick={clearAllFilters}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors px-2 py-1 hover:bg-gray-100 rounded-full"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                
                <div className="bg-gray-100 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-700">
                  {filteredReportKeys.length} of {processedReportKeys.length}
                </div>
              </div>
            </div>
            
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Website
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Scan Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReportKeys.map((row: any) => {
                    const reportData = getReportData(row);

                    return (
                      <tr key={reportData.r2_key} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                              <span className="text-white font-semibold text-sm">
                                {reportData.urlInitial}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                {reportData.url}
                              </div>
                              <div className="text-xs text-gray-500">
                                {reportData.date} at {reportData.time}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {reportData.date}
                        </td>
                        <td className="px-6 py-4">
                          {reportData.complianceStatus === 'Compliant' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                              Compliant
                            </span>
                          ) : reportData.complianceStatus === 'Partially Compliant' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                              Partially Compliant
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                              Non-Compliant
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(reportData.score, 5)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {reportData.score}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setReportUrl(`/${row.r2_key}?domain=${encodeURIComponent(row.url)}`);
                                setIsSuccessModalOpen(true);
                              }}
                              className="print-report-button flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl border border-blue-600 hover:border-blue-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Report
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const { data: fetchedReportData } = await fetchReportByR2Key({ 
                                    variables: { r2_key: row.r2_key } 
                                  });
                                  
                                  if (fetchedReportData && fetchedReportData.fetchReportByR2Key) {
                                    const pdfBlob = generatePDF(fetchedReportData.fetchReportByR2Key, row.enhancedScore, row.url);
                                    const url = window.URL.createObjectURL(pdfBlob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = 'accessibility-report.pdf';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                  } else {
                                    toast.error('Failed to generate PDF. Please try again.');
                                  }
                                } catch (error) {
                                  console.error('Error fetching report:', error);
                                  toast.error('Failed to generate PDF. Please try again.');
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl border border-green-600 hover:border-green-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {filteredReportKeys.map((row: any) => {
                const reportData = getReportData(row);

                return (
                  <div key={row.r2_key} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                    {/* Header Section */}
                    <div className="flex items-center mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                          <span className="text-white font-semibold text-base">
                            {getDomainInitial(row.url)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-gray-900 truncate mb-1">
                          {row.url}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {reportData.date} at {reportData.time}
                        </div>
                      </div>
                    </div>
                    
                    {/* Score Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Accessibility Score</span>
                        <span className="text-2xl font-bold text-gray-900">{reportData.score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(reportData.score, 5)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        {reportData.complianceStatus === 'Compliant' ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Compliant
                          </span>
                        ) : reportData.complianceStatus === 'Partially Compliant' ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            Non-Compliant
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setReportUrl(`/${row.r2_key}?domain=${encodeURIComponent(row.url)}`);
                            setIsSuccessModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl border border-blue-600 hover:border-blue-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const { data: fetchedReportData } = await fetchReportByR2Key({ 
                                variables: { r2_key: row.r2_key } 
                              });
                              
                              if (fetchedReportData && fetchedReportData.fetchReportByR2Key) {
                                const pdfBlob = generatePDF(fetchedReportData.fetchReportByR2Key, row.enhancedScore, row.url);
                                const url = window.URL.createObjectURL(pdfBlob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = 'accessibility-report.pdf';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } else {
                                toast.error('Failed to generate PDF. Please try again.');
                              }
                            } catch (error) {
                              console.error('Error fetching report:', error);
                              toast.error('Failed to generate PDF. Please try again.');
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl border border-green-600 hover:border-green-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Success Modal */}
      <Modal isOpen={isSuccessModalOpen}>
        <div className="relative p-8 text-center">
          <button
            onClick={() => setIsSuccessModalOpen(false)}
            className="absolute top-4 right-4 w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-red-700 hover:border-red-800 hover:scale-110"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCheckCircle size={32} className="text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Report Generated Successfully!
          </h3>
          <p className="text-gray-600 mb-8">
            Your accessibility report is ready to view. Get detailed insights and actionable recommendations.
          </p>
          
                     <div className="flex flex-col sm:flex-row gap-4">
             <button
               onClick={() => {
                 const newTab = window.open(reportUrl, '_blank');
                 if (newTab) newTab.focus();
                 setIsSuccessModalOpen(false);
               }}
               className="flex items-center justify-center gap-3 flex-1 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-extrabold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:shadow-blue-500/50 border-2 border-blue-800 hover:border-blue-900 hover:scale-[1.02] active:scale-[0.98]"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
               </svg>
               Open Report
             </button>
             <button
               onClick={() => setIsSuccessModalOpen(false)}
               className="flex items-center justify-center gap-3 flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold py-5 px-8 rounded-2xl transition-all duration-200 shadow-2xl hover:shadow-red-500/50 border-2 border-red-700 hover:border-red-800 hover:scale-[1.02] active:scale-[0.98]"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
               </svg>
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