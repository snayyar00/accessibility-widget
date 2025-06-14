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
  Typography, Box
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
import { report } from 'process';
import { json } from 'stream/consumers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Select from 'react-select/creatable';
import { set } from 'lodash';

const WEBABILITY_SCORE_BONUS = 45;
const MAX_TOTAL_SCORE = 95;

// Helper function to calculate enhanced scores
function calculateEnhancedScore(baseScore: number) {
  const enhancedScore = baseScore + WEBABILITY_SCORE_BONUS;
  return Math.min(enhancedScore, MAX_TOTAL_SCORE);
}

const normalizeDomain = (url: string) =>
  url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { accessibilityTourSteps, tourKeys } from '@/constants/toursteps';

const AccessibilityReport = ({ currentDomain }: any) => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.report') });
  const [score, setScore] = useState(0);
  const [scoreBackup, setScoreBackup] = useState(0);
  const [domain, setDomain] = useState(currentDomain);
  const [siteImg, setSiteImg] = useState('');
  const [expand, setExpand] = useState(false);
  const [correctDomain, setcorrectDomain] = useState(currentDomain);
  const [webAbilityScore,setWebAbilityScore] = useState(Math.floor(Math.random() * (95 - 90 + 1)) + 90);
  // const [accessibilityData, setAccessibilityData] = useState({});
  const { data: sitesData } = useQuery(GET_USER_SITES);
  const [saveAccessibilityReport] = useMutation(SAVE_ACCESSIBILITY_REPORT);
  const [selectedSite, setSelectedSite] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [enhancedScoresCalculated, setEnhancedScoresCalculated] = useState(false);
  const [fetchReportKeys, { data: reportKeysData, loading: loadingReportKeys }] = useLazyQuery(FETCH_ACCESSIBILITY_REPORT_KEYS);
  const [processedReportKeys, setProcessedReportKeys] = useState<any[]>([]);
  const [getAccessibilityStatsQuery, { data, loading, error }] = useLazyQuery(
    getAccessibilityStats,
    {
      variables: { url: correctDomain },
    },
  );
  const [fetchReportByR2Key, { loading: loadingReport, data: reportData }] = useLazyQuery(FETCH_REPORT_BY_R2_KEY);
  type OptionType = { value: string; label: string };
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null)
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef: contentRef });

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
        console.log('Accessibility report data:', result);
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
            const savedReport = data.saveAccessibilityReport; // Access the returned report
            const r2Key = savedReport.key;
            const savedUrl = savedReport.report.url;
            // Open the ReportView for the new domain in a new tab
            const newTab = window.open(`/${r2Key}?domain=${encodeURIComponent(savedUrl)}`, '_blank');
            if (newTab) newTab.focus();
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
    // Transform domain similar to SignUp form
    const transformedDomain = domain
      .replace(/^https?:\/\//, '') // Remove http:// or https://
      .replace(/\/+$/, ''); // Remove trailing slashes
    
    if (!isValidDomain(transformedDomain)) {
      setDomain(currentDomain);
      toast.error('You must enter a valid domain name!');
      return;
    }
    setcorrectDomain(domain);
    //checkScript();
    try {
      await getAccessibilityStatsQuery(); // Manually trigger the query
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
    const criticalCount = issues.filter(i => i.impact === 'critical').length;
    const seriousCount = issues.filter(i => i.impact === 'serious').length;
    const moderateCount = issues.filter(i => i.impact === 'moderate').length;

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

  return (
    <div className="accessibility-wrapper">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Web Accessibility Scanner</h1>
        <p className="text-xl text-gray-600">
          Evaluate your website's accessibility in seconds. View a history of all accessibility scans. Download your reports below.
        </p>
      </header>

      <div className="w-full pl-6 pr-6 border-none shadow-none flex flex-col justify-center items-center">
        <div className="bg-white my-6 p-3 sm:p-4 rounded-xl w-full">
          <div className="flex flex-col gap-4">
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
              formatCreateLabel={(inputValue: any) => `Enter a new domain: "${inputValue}"`}
            />

            <button
              type="button"
              className="bg-primary text-white px-4 py-2 rounded"
              onClick={() => {
                if (domain) {
                  //checkScript();
                  handleSubmit();
                } else {
                  toast.error('Please enter or select a domain!');
                }
              }}
            >
              Generate Report
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
          <div className="bg-white rounded-xl p-6 mt-12 shadow mr-6 ml-6">
            <h3 className="text-2xl font-medium text-gray-800 mb-6 border-b-2 border-gray-300 pb-2">
              Your audit history
            </h3>
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-gray-500 text-sm uppercase">
                  <th className="py-2 px-4">Webpage</th>
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4">Time</th>
                  <th className="py-2 px-4">Compliance Status</th>
                  <th className="py-2 px-4">Accessibility Score</th>
                  <th className="py-2 px-4">Action</th>
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
                            const newTab = window.open(`/${row.r2_key}?domain=${encodeURIComponent(row.url)}`, '_blank');
                            if (newTab) newTab.focus();
                          }}
                        >
                          View
                        </button>
                        <button
                          className="text-blue-600 underline font-medium"
                          onClick={async () => {
                            try {
                              // Fetch the report for the clicked row
                              await fetchReportByR2Key({ variables: { r2_key: row.r2_key } });

                              if (reportData && reportData.fetchReportByR2Key) {
                                const pdfBlob = generatePDF(reportData.fetchReportByR2Key, row.enhancedScore, row.url);
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
                        >
                          Download
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
    </div>
  );
};

export default AccessibilityReport;
