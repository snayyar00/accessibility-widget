import React, { useEffect, useState, useRef } from 'react';
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
import isValidDomain from '@/utils/verifyDomain';
import Button from '@mui/joy/Button';
import AccordionGroup from '@mui/joy/AccordionGroup';
import Accordion from '@mui/joy/Accordion';
import ToggleButtonGroup from '@mui/joy/ToggleButtonGroup';
import Stack from '@mui/joy/Stack';
import { translateText,translateSingleText,LANGUAGES } from '@/utils/translator';

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
import Tooltip from '@mui/material/Tooltip';

import getWidgetSettings from '@/utils/getWidgetSettings'
const WEBABILITY_SCORE_BONUS = 45;
const MAX_TOTAL_SCORE = 95;

// Helper function to calculate enhanced scores
function calculateEnhancedScore(baseScore: number) {
  const enhancedScore = baseScore + WEBABILITY_SCORE_BONUS;
  return Math.min(enhancedScore, MAX_TOTAL_SCORE);
}

const normalizeDomain = (url: string) =>
  url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');



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

  
  const [currentLanguage, setCurrentLanguage] = useState<string>('');
  const [showLangTooltip, setShowLangTooltip] = useState(false);
  // Combine options for existing sites and a custom "Enter a new domain" option
  const siteOptions = sitesData?.getUserSites?.map((domain: any) => ({
    value: domain.url,
    label: domain.url,
  })) || [];
  const options = [
    ...siteOptions,
    { value: 'new', label: 'Enter a new domain' },
  ];

   // Handle tour completion
  const handleTourComplete = () => {
    console.log('Accessibility tour completed!');
  };

  useEffect(() => {
    if (data) {
      const result = data.getAccessibilityReport;
      if (result) {
        let score = result.score;
        let allowed_sites_id = null;
        //console.log('Accessibility report data:', result);
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

          if (isNewDomain && data && data.saveAccessibilityReport) {
            const savedReport = data.saveAccessibilityReport;
            const r2Key = savedReport.key;
            const savedUrl = savedReport.report.url;
            // Show success modal with link to open report
            setReportUrl(`/${r2Key}?domain=${encodeURIComponent(savedUrl)}`);
            setIsSuccessModalOpen(true);
          } else {
          toast.success('Report successfully generated! You can view or download it below.');
          }
        });
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
    if (!isValidDomain(domain)) {
      console.log('Invalid domain:', domain);
      setDomain(currentDomain);
      toast.error('You must enter a valid domain name!');
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


  
  const generatePDF = async (reportData: {
    score: number;
    widgetInfo: { result: string };
    url: string;
  }): Promise<Blob> => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    if (!reportData.url) {
      reportData.url = processedReportKeys?.[0]?.url || "";
    }
    const { logoImage, logoUrl, accessibilityStatementLinkUrl } =
      await getWidgetSettings(reportData.url);
    const WEBABILITY_SCORE_BONUS = 45;
    const MAX_TOTAL_SCORE = 95;
    const issues = extractIssuesFromReport(reportData);

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

    status = await translateSingleText(status, currentLanguage);
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

        // Add a link to logoUrl if available
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
    let  label = 'Scan results for ';
    label = await translateSingleText(label, currentLanguage);

    const url = `${reportData.url}`;
    const labelWidth = doc.getTextWidth(label);
    const urlWidth = doc.getTextWidth(url);
    const totalWidth = labelWidth + urlWidth;
    // Calculate starting X so the whole line is centered
    const startX = 105 - totalWidth / 2;
    // Draw the label
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-800 for message
    doc.text(label, startX, textY, { align: 'left' });
    // Draw the URL in bold, immediately after the label, no overlap
    doc.setFont('helvetica', 'bold');
    doc.text(url, startX + labelWidth, textY, { align: 'left' });
    doc.setFont('helvetica', 'normal');

    textY += 12;
    doc.setFontSize(20);
    doc.setTextColor(...statusColor);
    doc.setFont('helvetica', 'bold');
    doc.text(status, 105, textY, { align: 'center' });

    message = await translateSingleText(message, currentLanguage);
    textY += 9;
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85); 
    doc.setFont('helvetica', 'normal');
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19); 
    doc.setTextColor(255, 255, 255); 

    doc.text(`${issues.length}`, circle1X, circleY, {
      align: 'center',
      baseline: 'middle',
    });

    doc.setFontSize(10); 
    doc.setTextColor(21, 101, 192); 
    doc.setFont('helvetica', 'normal');
    doc.text(await translateSingleText('Total Errors', currentLanguage), circle1X, circleY + circleRadius + 9, {
      align: 'center',
    });

    doc.setDrawColor(33, 150, 243); 
    doc.setLineWidth(1.5);
    doc.setFillColor(33, 150, 243); 
    doc.circle(circle2X, circleY, circleRadius, 'FD');
    doc.setFont('helvetica', 'bold');
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
    doc.setFont('helvetica', 'normal');
    doc.text(await translateSingleText('Score', currentLanguage), circle2X, circleY + circleRadius + 9, {
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
        label: await translateSingleText('Severe', currentLanguage),
        count: counts.critical + counts.serious,
        color: [255, 204, 204],
      },
      { label: await translateSingleText('Moderate', currentLanguage), count: counts.moderate, color: [187, 222, 251] },
      {
        label: await translateSingleText('Mild', currentLanguage),
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
      doc.setFont('helvetica', 'bold');
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
    const translatedIssues = await translateText(issues, currentLanguage);

    const translatedIssue = await translateSingleText('Issue', currentLanguage);
    const translatedMessage = await translateSingleText('Message', currentLanguage);
    const translatedContext = await translateSingleText('Context', currentLanguage);
    const translatedFix = await translateSingleText('Fix', currentLanguage);


    translatedIssues.forEach((issue, issueIdx) => {
      // Add header row for each issue with beautiful styling
      tableBody.push([
        {
          content: translatedIssue,
          colSpan: 2,
          styles: {
            fillColor: [255, 255, 255], // white background
            textColor: [0, 0, 0], // black text
            fontStyle: 'bold',
            fontSize: 14,
            halign: 'center',
            cellPadding: 8,

          },
        },
        {
          content: translatedMessage,
          colSpan: 2,
          styles: {
            fillColor: [255, 255, 255], // matching white background
            textColor: [0, 0, 0], // black text
            fontStyle: 'bold',
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
            fontStyle: 'bold',
            fontSize: 12,
            textColor: [30, 41, 59], // dark navy text
            halign: 'left',
            cellPadding: 10,
            fillColor: issue.impact === 'critical'
              ? [255, 204, 204] 
              : issue.impact === 'Mild'
                ? [225, 245, 254] 
                : issue.impact === 'moderate'
                  ? [187, 222, 251] 
                  : [248, 250, 252], 
            font: 'courier',
            minCellHeight: 30,
          },
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
            fillColor: issue.impact === 'critical'
            ? [255, 204, 204] 
            : issue.impact === 'Mild'
              ? [225, 245, 254] 
              : issue.impact === 'moderate'
                ? [187, 222, 251] 
                : [248, 250, 252], 
            font: 'courier',
            minCellHeight: 30,
          },
        },
      ]);

      // Contexts block (styled like code snapshots with numbers and black rounded boxes)
      const contexts = toArray(issue.context).filter(Boolean);

      if (contexts.length > 0) {
        // Heading: "Context:"
        tableBody.push([
          {
            content: translatedContext,
            colSpan: 4,
            styles: {
              fontStyle: 'bolditalic',
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
                font: 'courier',
                fontSize: 10,
                textColor: [255, 255, 255], // This will be overridden by didDrawCell
                fillColor: [255, 255, 255], // White background for the cell
                halign: 'left',
                valign: 'top',
                cellPadding: 8,
                lineWidth: 0,
                minCellHeight: Math.max(20, Math.ceil(combinedContent.length / 50) * 6), // Dynamic height based on content
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
              fontStyle: 'bolditalic',
              fontSize: 11,
              textColor: [0, 0, 0], // black text
              halign: 'left',
              cellPadding: 5,
              fillColor: [255, 255, 255], // white background
              lineWidth: 0,
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
                fontStyle: 'normal',
                fontSize: 11,
                textColor: [0, 0, 0], // black text
                halign: 'left',
                cellPadding: { top: 10, right: 8, bottom: 10, left: 8 }, // more vertical space for separation
                fillColor: [255, 255, 255], // white background for back container
                lineWidth: 0,
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
    });

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
          
          doc.setFont('courier', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(codeContent, availableWidth);
          
          // More accurate height calculation
          const lineHeight = 4; // Line spacing
          const topPadding = 8; // Top padding
          const bottomPadding = 4; // Bottom padding
          const textHeight = (lines.length * lineHeight) + topPadding + bottomPadding;
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
          doc.setFont('courier', 'normal');
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
            width - (padding * 2),
            height - (padding * 2),
            cornerRadius,
            cornerRadius,
            'FD' // Fill and Draw
          );
          
          // Draw the lighter blue section for the index number (left side)
          doc.setFillColor(51, 65, 85); // slate-700 (lighter blue than the main background)
          doc.roundedRect(
            x + padding,
            y + padding,
            indexWidth,
            height - (padding * 2),
            cornerRadius,
            cornerRadius,
            'F' // Fill only
          );
          
          // Fix the right side of the index section to not be rounded
          doc.setFillColor(51, 65, 85); // slate-700
          doc.rect(
            x + padding + indexWidth - cornerRadius,
            y + padding,
            cornerRadius,
            height - (padding * 2),
            'F'
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
          const availableWidth = width - (padding * 2) - indexWidth - 8;
          
          // Split code content into lines
          const lines = doc.splitTextToSize(codeContent, availableWidth);
          let codeTextY = y + padding + 8;
          
          lines.forEach((line: string) => {
            doc.text(line, codeTextX, codeTextY);
            codeTextY += 4; // Line spacing
          });
        }
        
        // Add bottom border only to header rows (Issue/Message rows)
        if (data.cell.raw && data.cell.raw.styles && data.cell.raw.styles.fontStyle === 'bold' && data.cell.raw.styles.fontSize === 14) {
          const { x, y, width, height } = data.cell;
          doc.setDrawColor(226, 232, 240); // Light gray
          doc.setLineWidth(0.5);
          doc.line(x, y + height, x + width, y + height); // Bottom border
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
          Evaluate your website's accessibility in seconds. View a history of all accessibility scans. Download your reports.
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
                    <option value="">Select Language</option>
                    {Object.values(LANGUAGES).map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.nativeName}
                      </option>
                    ))}
                  </select>
                </Tooltip>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>


              
              <div className="w-full md:flex-1 min-w-0">
                <Select
                  options={siteOptions}
                  value={selectedOption}
                  onChange={(selected: OptionType | null) => {
                    setSelectedOption(selected);
                    setSelectedSite(selected?.value ?? ''); // Update the selectedSite state
                    setDomain(selected?.value ?? ''); // Update the domain state
                  }}
                  onCreateOption={(inputValue: any) => {
                    // Handle new domain creation
                    const newOption = { value: inputValue, label: inputValue };
                    setSelectedOption(newOption);
                    setSelectedSite(inputValue); // Update the selectedSite state
                    setDomain(inputValue); // Update the domain state
                  }}
                  placeholder="Select or enter a domain"
                  isSearchable
                  isClearable
                  formatCreateLabel={(inputValue: any) => `Enter a new domain: \"${inputValue}\"`}
                  classNamePrefix="react-select"
                  className="w-full min-w-0"
                  styles={{
                    control: (provided: any, state: any) => ({
                      ...provided,
                      borderRadius: '6px',
                      border: state.isFocused ? '1px solid #3b82f6' : '1px solid #d1d5db',
                      minHeight: '38px',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
                      '&:hover': {
                        border: state.isFocused ? '1px solid #3b82f6' : '1px solid #d1d5db',
                      },
                    }),
                  }}
                />
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
              >
                Free Scan
                {loading && <CircularProgress size={14} sx={{ color: 'white' }} className="ml-2 my-auto" />}
              </button>
            </div>
          </div>

        <div className="mt-6 pl-6 pr-6 grid md:grid-cols-3 gap-6 text-center">
          <Card>
            <CardContent className="my-8">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Comprehensive Analysis</h2>
              <p className="text-gray-600 mb-4">
                Our scanner checks for WCAG 2.1 compliance across your entire site.
              </p>
              <div className="flex justify-center w-full">
                <FaCheckCircle size={90} color="green" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="my-8">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Detailed Reports</h2>
              <p className="text-gray-600 mb-4">
                Receive a full breakdown of accessibility issues and how to fix them.
              </p>
              <div className="flex justify-center w-full">
                <TbReportSearch size={95} color="green" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="my-8">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Improve User Experience</h2>
              <p className="text-gray-600 mb-4">
                Make your website accessible to all users, regardless of abilities.
              </p>
              <div className="flex justify-center w-full">
                <FaUniversalAccess size={95} color="blue" />
              </div>
            </CardContent>
          </Card>
        </div>

        
        {siteOptions.some((option: any) => normalizeDomain(option.value) === normalizeDomain(selectedOption?.value ?? '')) && enhancedScoresCalculated && processedReportKeys.length > 0 &&  (
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
                  const date = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                  const time = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  const complianceStatus = getComplianceStatus(row.enhancedScore);

                  return (
                    <tr
                      key={row.r2_key}
                      className={`bg-${idx % 2 === 0 ? 'white' : 'gray-50'} hover:bg-blue-50 transition`}
                      style={{ borderRadius: 8 }}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">{row.url}</td>
                      <td className="py-3 px-4">{date}</td>
                      <td className="py-3 px-4">{time}</td>
                      <td className="py-3 px-4">
                        {complianceStatus === 'Compliant' ? (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Compliant</span>
                        ) : complianceStatus === 'Partially Compliant' ? (
                          <span className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded text-xs">Partially Compliant</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">{complianceStatus}</span>
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
                            setReportUrl(`/${row.r2_key}?domain=${encodeURIComponent(row.url)}`);
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
                              const { data: fetchedReportData } = await fetchReportByR2Key({ variables: { r2_key: row.r2_key } });
                              if (fetchedReportData && fetchedReportData.fetchReportByR2Key) {
                                fetchedReportData.fetchReportByR2Key.url = row.url;
                                const pdfBlob = await generatePDF(fetchedReportData.fetchReportByR2Key);
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
                            } finally {
                              setDownloadingRow(null);
                            }
                          }}
                        >
                          <span className="flex justify-end items-center w-full">
                            {downloadingRow === row.r2_key ? (
                              <CircularProgress size={14} sx={{ color: 'blue', marginLeft: 4 }} className="ml-2" />
                            ) : (
                              'Download'
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
            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="mb-6">
            <FaCheckCircle size={64} color="green" className="mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Report Generated Successfully!</h2>
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