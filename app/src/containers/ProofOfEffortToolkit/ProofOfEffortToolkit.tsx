import React, { useState, useEffect } from 'react';
import {
  MdFileDownload,
  MdEmail,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdVisibility,
} from 'react-icons/md';
import { FiFile } from 'react-icons/fi';
import { useLazyQuery, useMutation } from '@apollo/client';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import FETCH_ACCESSIBILITY_REPORT_KEYS from '@/queries/accessibility/fetchAccessibilityReport';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';
import { SEND_PROOF_OF_EFFORT_TOOLKIT } from '@/queries/proofOfEffort/sendToolkit';
import { RootState } from '@/config/store';
import {
  translateText,
  translateMultipleTexts,
  deduplicateIssuesByMessage,
} from '@/utils/translator';
import greenSuccessImage from '@/assets/images/green_success.png';
import messageIconImage from '@/assets/images/message_icon.png';
import criticalIconImage from '@/assets/images/critical_icon.png';
import moderateIconImage from '@/assets/images/moderate_icon.png';
import mildIconImage from '@/assets/images/mild_icon.png';
import oneIssuesIconImage from '@/assets/images/1_issues_icon.png';
import twoIssuesIconImage from '@/assets/images/2_issues_icon.png';
import threeIssuesIconImage from '@/assets/images/3_issues_icon.png';
import getWidgetSettings from '@/utils/getWidgetSettings';
import EmailModal from '@/components/Common/EmailModal';
import { CircularProgress } from '@mui/material';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { proofOfEffortTourSteps, tourKeys } from '@/constants/toursteps';
import autoTable, { __createTable, __drawTable } from 'jspdf-autotable';
import { generatePDF } from '@/utils/generatePDF';

interface Document {
  name: string;
  creationDate: string;
  description?: string;
  type?: 'internal' | 'external' | 'statement' | 'monthly-report';
  externalUrl?: string;
}

// Helper function to map issue severity based on message and code
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

// Helper function to extract issues from report data (proper structure)
const extractIssuesFromReport = (report: any) => {
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
};

// Function to generate "Intro to the toolkit" PDF
const generateIntroToToolkitPDF = async (): Promise<Blob> => {
  try {
    const { jsPDF } = await import('jspdf');

    // Load custom font
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

    const doc = new jsPDF();

    if (!fontLoaded) {
      doc.setFont('helvetica', 'normal');
    }

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Helper function to check if we need a page break
    const checkPageBreak = (requiredHeight: number, currentY: number) => {
      if (currentY + requiredHeight > pageHeight - 30) {
        doc.addPage();
        return 25; // Return new Y position after page break
      }
      return currentY;
    };

    // PAGE 1: Title and Introduction
    // Clean white background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Professional header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 60, 'F');

    // Header content
    let currentY = 25;

    // Main title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'bold');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.text('Intro to the Proof of Effort Toolkit', pageWidth / 2, currentY, {
      align: 'center',
    });

    // Date
    currentY += 12;
    doc.setFontSize(10);
    doc.setTextColor(219, 234, 254);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    }
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
      pageWidth / 2,
      currentY,
      { align: 'center' },
    );

    // Main content area
    currentY = 80;
    doc.setTextColor(51, 65, 85);

    // Introduction paragraphs (condensed)
    const introText = [
      "You've taken steps to make your website accessible. The proof of effort toolkit compiles key documentation that showcases your commitment to accessibility. If your website's accessibility is ever challenged (i.e. you receive a demand letter), you'll have evidence to demonstrate your efforts and respond with confidence.",
      "The proof of effort toolkit provides documentation that will help you draft a response to generic claims regarding alleged accessibility barriers. A generic claim is a broad, unspecific assertion about your website's accessibility, often without concrete evidence or a clear connection to your website.",
      'Please note that WebAbility.io does not offer or provide legal advice or counseling and the information contained in this document or in the toolkit documents should not be taken as such. WebAbility.io encourages you to seek firm legal advice based on your specific circumstances.',
    ];

    doc.setFontSize(11);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    introText.forEach((paragraph) => {
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      lines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += 5;
      });
      currentY += 3; // Reduced spacing between paragraphs
    });

    // What's in the toolkit section (compact)
    currentY += 5;
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'bold');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.text("What's in the toolkit?", margin, currentY);
    currentY += 8;

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.text('The following documentation is included:', margin, currentY);
    currentY += 8;

    const toolkitItems = [
      {
        title: '● Last monthly audit report:',
        description:
          'A professional automated accessibility audit with code examples and plain-language explanations of how your website meets essential requirements at the WCAG 2.1 AA level.',
      },
      {
        subtitle:
          '○ For additional reports, view your audit history in the Customer Portal.',
        subsubtitle:
          '○ To produce a current audit report go to https://app.webability.io/scanner and scan your website.',
      },
      {
        title: '● Remediation report:',
        description:
          "An in-depth breakdown of the accessibility fixes applied to maintain your website's accessibility status. (Not available for the Micro/Standard plan)",
      },
      {
        title: '● Accessibility statement:',
        description:
          'Your built-in accessibility statement shows your efforts to comply with the ADA in adherence to WCAG, and can be accessed by users at any time.',
      },
      {
        title: '● Webability Widget latest invoice:',
        description:
          'Proof that you paid to make your website more accessible. Invoices are also available under Billing and Payments in the Customer Portal.',
      },
    ];

    toolkitItems.forEach((item) => {
      if (item.title) {
        // Check if we need a page break
        currentY = checkPageBreak(20, currentY);

        // Item title
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'normal');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(item.title, margin, currentY);
        currentY += 6;

        // Item description
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const itemLines = doc.splitTextToSize(
          item.description,
          contentWidth - 10,
        );
        itemLines.forEach((line: string) => {
          doc.text(line, margin + 10, currentY);
          currentY += 4;
        });
        currentY += 3; // Reduced spacing
      } else if (item.subtitle) {
        // Check if we need a page break
        currentY = checkPageBreak(12, currentY);

        // Subtitle
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(item.subtitle, margin + 10, currentY);
        currentY += 4;

        if (item.subsubtitle) {
          doc.text(item.subsubtitle, margin + 10, currentY);
          currentY += 4;
        }
        currentY += 2;
      }
    });

    // Note section (compact)
    currentY = checkPageBreak(15, currentY);
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin - 3, currentY - 3, contentWidth + 6, 15, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(
      'Note: There are excluded issues that are not identified or remediated by Webability Widget. See Excluded issues',
      margin,
      currentY + 3,
    );

    // Footer for first page
    const footerY = pageHeight - 20;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    }
    doc.text(
      'WebAbility.io - Making the web accessible for everyone - www.webability.io',
      margin,
      footerY + 6,
    );
    doc.text('Page 1 of 2', pageWidth - margin, footerY + 6, {
      align: 'right',
    });

    // PAGE 2: How to use the toolkit
    doc.addPage();
    currentY = 25;

    // Page header
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'bold');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.text('How to use the toolkit', margin, currentY);
    currentY += 12;

    const howToUseText = [
      'The combination of documents provided in the toolkit helps to provide proof of your effort to make your website more accessible for generic claims alleging accessibility barriers.',
      'The documents can be sent to your lawyer to prompt the plaintiff to properly review the claim and point out specific alleged barriers to accessibility.',
      "If you're on the Micro plan, upgrade to benefit from the full Litigation Support Package, including a dedicated accessibility expert, by contacting support@webability.io.",
      'For other plans, learn how to use the full Litigation Support Package by visiting our documentation or contacting our support team.',
    ];

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    howToUseText.forEach((paragraph) => {
      currentY = checkPageBreak(20, currentY);
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      lines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += 5;
      });
      currentY += 3; // Reduced spacing
    });

    // Best practices section (compact)
    currentY += 5;
    currentY = checkPageBreak(25, currentY);
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'bold');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.text('Best Practices for Documentation', margin, currentY);
    currentY += 8;

    const bestPractices = [
      'Keep all documentation organized and easily accessible.',
      'Regularly update your accessibility reports and statements.',
      'Maintain records of all accessibility improvements made.',
      'Consider implementing a regular accessibility audit schedule.',
      'Document any accessibility training provided to your team.',
    ];

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    bestPractices.forEach((practice) => {
      currentY = checkPageBreak(8, currentY);
      doc.text(`• ${practice}`, margin, currentY);
      currentY += 5;
    });

    // Footer for second page
    const footerY2 = pageHeight - 20;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY2, pageWidth - margin, footerY2);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    }
    doc.text(
      'WebAbility.io - Making the web accessible for everyone - www.webability.io',
      margin,
      footerY2 + 6,
    );
    doc.text('Page 2 of 2', pageWidth - margin, footerY2 + 6, {
      align: 'right',
    });

    return doc.output('blob');
  } catch (error) {
    console.error('Error generating intro PDF:', error);
    throw error;
  }
};

// Helper function to get issue colors based on impact and WebAbility status
const getIssueColors = (issue: any, hasWebAbility: boolean) => {
  const impact = issue.impact || 'minor';

  if (hasWebAbility) {
    // Green colors for WebAbility-enabled sites
    return {
      cellFillColor: [220, 252, 231], // green-50
      textColor: [22, 163, 74], // green-600
    };
  }

  // Regular colors based on impact
  switch (impact) {
    case 'critical':
      return {
        cellFillColor: [254, 226, 226], // red-100
        textColor: [220, 38, 38], // red-600
      };
    case 'serious':
      return {
        cellFillColor: [255, 237, 213], // orange-100
        textColor: [234, 88, 12], // orange-600
      };
    case 'moderate':
      return {
        cellFillColor: [254, 249, 195], // yellow-100
        textColor: [202, 138, 4], // yellow-600
      };
    default:
      return {
        cellFillColor: [243, 244, 246], // gray-100
        textColor: [75, 85, 99], // gray-600
      };
  }
};

const ProofOfEffortToolkit: React.FC = () => {
  const [viewFilesExpanded, setViewFilesExpanded] = useState(false);
  const [isProcessingReport, setIsProcessingReport] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const history = useHistory();

  // Redux state
  const currentDomain = useSelector(
    (state: RootState) => state.report.selectedDomain,
  );

  // GraphQL queries
  const [fetchReportKeys, { loading: loadingReportKeys }] = useLazyQuery(
    FETCH_ACCESSIBILITY_REPORT_KEYS,
  );
  const [fetchReportByR2Key, { loading: loadingReport }] = useLazyQuery(
    FETCH_REPORT_BY_R2_KEY,
  );

  // GraphQL mutations
  const [sendToolkitEmail, { loading: sendingEmail }] = useMutation(
    SEND_PROOF_OF_EFFORT_TOOLKIT,
  );

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([
    {
      name: 'Intro to the toolkit',
      creationDate: new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      type: 'internal',
    },
    {
      name: 'Monthly audit report',
      creationDate: 'No report available',
      type: 'monthly-report',
    },
    {
      name: 'Accessibility statement',
      creationDate: new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      type: 'statement',
      externalUrl: 'https://www.webability.io/statement',
    },
  ]);

  // Expand files list automatically when the tour starts so all targets exist
  useEffect(() => {
    const handleStartTour = (event: any) => {
      if (event?.detail?.tourKey === tourKeys.proofOfEffort) {
        setViewFilesExpanded(true);
      }
    };
    window.addEventListener('startTour', handleStartTour);
    return () => window.removeEventListener('startTour', handleStartTour);
  }, []);

  // Auto-expand if this tour hasn't been completed yet (covers auto-start)
  useEffect(() => {
    const completed =
      localStorage.getItem(`${tourKeys.proofOfEffort}_completed`) === 'true';
    if (!completed) {
      setViewFilesExpanded(true);
    }
  }, []);

  const handleSendViaEmail = () => {
    if (!currentDomain) {
      toast.error(
        'No domain selected. Please select a domain from the sidebar.',
      );
      return;
    }
    setIsEmailModalOpen(true);
  };

  const handleEmailSubmit = async (email: string) => {
    if (!currentDomain) {
      toast.error(
        'No domain selected. Please select a domain from the sidebar.',
      );
      return;
    }

    // Set loading state immediately to disable the button
    setIsEmailSending(true);

    let loadingToastId: string | number | undefined;
    try {
      //  console.log('Starting handleEmailSubmit...');
      loadingToastId = toast.loading(
        'Generating toolkit and sending email... This may take a moment.',
      );

      // console.log('Step 1: Importing JSZip...');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const latestReport = await fetchLatestReport(currentDomain);
      //console.log('Latest report fetched:', latestReport ? 'success' : 'null');

      // Check if there's a valid report before proceeding
      if (
        !latestReport ||
        !latestReport.r2_key ||
        typeof latestReport.r2_key !== 'string' ||
        latestReport.r2_key.trim() === ''
      ) {
        toast.dismiss(loadingToastId);
        toast.error(
          'No report available for this domain. Please generate a report first before sending the toolkit.',
        );
        return;
      }

      let reportDataForPdfs: any = null;

      // console.log('Step 3: Fetching report data by R2 key...');
      try {
        const { data } = await fetchReportByR2Key({
          variables: { r2_key: latestReport.r2_key },
        });
        reportDataForPdfs = data?.fetchReportByR2Key;
        //  console.log('Report data fetched:', reportDataForPdfs ? 'success' : 'null');
      } catch (error) {
        console.error('Error fetching report data:', error);
        toast.dismiss(loadingToastId);
        toast.error('Failed to fetch report data. Please try again.');
        return;
      }

      //  console.log('Step 4: Generating PDFs...');
      // Generate intro PDF
      const introPdf = await generateIntroToToolkitPDF();
      zip.file('Introduction to Proof of Effort Toolkit.pdf', introPdf);

      // Generate monthly audit report PDF
      try {
        const monthlyPdf = await generatePDF(
          reportDataForPdfs,
          'en',
          currentDomain,
        );
        zip.file('Monthly audit report.pdf', monthlyPdf);
      } catch (error) {
        console.error('Error generating monthly audit report PDF:', error);
        toast.dismiss(loadingToastId);
        toast.error('Failed to generate monthly audit report PDF');
        return;
      }

      // Generate accessibility statement PDF
      try {
        const statementPdf = await generateAndViewAccessibilityStatementPDF(3);
        if (statementPdf) {
          zip.file('Accessibility statement.pdf', statementPdf);
        } else {
          throw new Error('Failed to generate accessibility statement PDF');
        }
      } catch (error) {
        console.error('Error generating accessibility statement PDF:', error);
        toast.dismiss(loadingToastId);
        toast.error('Failed to generate accessibility statement PDF');
        return;
      }

      // console.log('Step 5: Creating zip file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      //  console.log('Step 6: Converting to base64...');
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.readAsDataURL(zipBlob);
      });

      //   console.log('Step 7: Getting report date...');
      const reportDate = latestReport?.created_at
        ? new Date(latestReport.created_at).toLocaleDateString()
        : new Date().toLocaleDateString();

      //  console.log('Step 8: Sending email via GraphQL...');
      // Send email via GraphQL mutation
      const { data } = await sendToolkitEmail({
        variables: {
          input: {
            email,
            domain: currentDomain,
            zipFileBase64: base64,
            reportDate,
          },
        },
      });

      toast.dismiss(loadingToastId);

      if (data?.sendProofOfEffortToolkit?.success === true) {
        toast.success('Proof of effort toolkit sent successfully!');
        // Add a small delay before closing the modal to ensure toast is visible
        setTimeout(() => {
          setIsEmailModalOpen(false);
        }, 100);
      } else {
        toast.error(
          data?.sendProofOfEffortToolkit?.message || 'Failed to send toolkit',
        );
      }
    } catch (error: any) {
      //console.log('Error caught in handleEmailSubmit');
      toast.dismiss(loadingToastId);
      // Simplify error logging to prevent circular references
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error';
      console.error('Error sending toolkit via email:', errorMessage);
      toast.error('Failed to send toolkit via email');
    } finally {
      // Reset loading state
      setIsEmailSending(false);
    }
  };

  // Function to fetch latest report for a domain
  const fetchLatestReport = async (domain: string) => {
    try {
      const { data: reportKeysData } = await fetchReportKeys({
        variables: { url: domain },
      });

      if (reportKeysData?.fetchAccessibilityReportFromR2?.length > 0) {
        // Get the most recent report (they should be sorted by created_at)
        const latestReport = reportKeysData.fetchAccessibilityReportFromR2[0];
        return latestReport;
      }
      return null;
    } catch (error) {
      console.error('Error fetching latest report:', error);
      throw error;
    }
  };

  // Update documents when currentDomain changes
  useEffect(() => {
    const updateDocuments = async () => {
      if (currentDomain) {
        try {
          const latestReport = await fetchLatestReport(currentDomain);

          setDocuments((prevDocuments) =>
            prevDocuments.map((doc) => {
              if (doc.type === 'monthly-report') {
                if (latestReport && latestReport.created_at) {
                  const dateObj = new Date(Number(latestReport.created_at));
                  const formattedDate = dateObj.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                  return {
                    ...doc,
                    creationDate: formattedDate,
                  };
                } else {
                  return {
                    ...doc,
                    creationDate: 'No report available',
                  };
                }
              }
              return doc;
            }),
          );
        } catch (error) {
          console.error('Error updating document dates:', error);
          // Keep the default "No report available" message on error
        }
      }
    };

    updateDocuments();
  }, [currentDomain]);

  // Function to generate PDF for download (using full accessibility report)
  const generateReportPDF = async (reportData: any, domain: string) => {
    try {
      // Generate the full accessibility report PDF
      const pdfBlob = await generatePDF(reportData, 'en', domain); // Using English as default language

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${domain}-accessibility-report.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  // Function to generate PDF and open it for viewing (using full accessibility report)
  const viewReportPDF = async (reportData: any, domain: string) => {
    try {
      // Generate the full accessibility report PDF
      const pdfBlob = await generatePDF(reportData, 'en', domain); // Using English as default language

      // Open the PDF in a new window/tab for viewing
      const url = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(url, '_blank');

      // Clean up the URL after a delay to allow the PDF to load
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000); // 10 seconds should be enough for the PDF to load

      // If popup was blocked, offer download as fallback
      if (!newWindow) {
        toast.error('Popup blocked. PDF will be downloaded instead.');
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${domain}-accessibility-report.pdf`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating PDF for viewing:', error);
      toast.error('Failed to generate PDF for viewing');
    }
  };

  // Function to generate and view accessibility statement PDF (using same format as download)
  const generateAndViewAccessibilityStatementPDF = async (
    type?: number,
  ): Promise<Blob | void> => {
    try {
      const { jsPDF } = await import('jspdf');

      // Load custom font
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

      const doc = new jsPDF();

      if (!fontLoaded) {
        doc.setFont('helvetica', 'normal');
      }

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const contentWidth = pageWidth - margin * 2;

      // Clean white background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      let currentY = 30;

      // Header section with exact positioning
      // Main title - large, bold blue font
      doc.setFontSize(28);
      doc.setTextColor(37, 99, 235);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text('Accessibility Statement', margin, currentY);

      currentY += 10;

      // Domain and date information with proper spacing
      doc.setFontSize(14);
      doc.setTextColor(51, 65, 85);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      // Domain name
      const domainName = currentDomain || 'webability.io';
      doc.text(domainName, margin, currentY);

      // Vertical line separator with exact positioning
      const domainWidth = doc.getTextWidth(domainName);

      // Date with proper spacing
      const dateText = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.text(dateText, margin + domainWidth + 15, currentY);

      // "Issued by" section in top-right with exact positioning (bold)
      const issuedByText = 'Issued by';
      const issuedByWidth = doc.getTextWidth(issuedByText);
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text(issuedByText, pageWidth - margin - issuedByWidth - 24, 30);

      // WebAbility.io logo in top-right with improved positioning
      try {
        const logoImage = '/images/logo.png';
        const img = new Image();
        img.src = logoImage;

        // Wait for image to load to get proper dimensions
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Logo load timeout')),
            3000,
          );
          img.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Logo load failed'));
          };
        });

        // Calculate proper dimensions while maintaining aspect ratio
        const maxWidth = 45;
        const maxHeight = 35;
        const aspectRatio = img.width / img.height;

        let drawWidth = maxWidth;
        let drawHeight = maxWidth / aspectRatio;

        if (drawHeight > maxHeight) {
          drawHeight = maxHeight;
          drawWidth = maxHeight * aspectRatio;
        }

        // Position logo in top-right corner with exact positioning
        const logoX = pageWidth - margin - drawWidth;
        const logoY = 35;

        doc.addImage(logoImage, 'PNG', logoX, logoY, drawWidth, drawHeight);
      } catch (e) {
        // If logo fails, fall back to text with exact positioning
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'bold');
        } else {
          doc.setFont('helvetica', 'bold');
        }
        doc.text('WebAbility.io', pageWidth - margin, 40, { align: 'right' });
      }

      // Add a horizontal line below the header section
      doc.setDrawColor(226, 232, 240); // light gray
      doc.setLineWidth(0.7);
      doc.line(margin, currentY + 8, pageWidth - margin, currentY + 8);
      // Main content section with proper spacing
      currentY += 25;

      // Compliance status section header
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text('Compliance status', margin, currentY);

      currentY += 15;

      // Compliance status content with exact formatting
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      const complianceText = [
        'We firmly believe that the internet should be available and accessible to anyone and are committed to providing a website that is accessible to the broadest possible audience, regardless of ability.',
        "To fulfill this, we aim to adhere as strictly as possible to the World Wide Web Consortium's (W3C) Web Content Accessibility Guidelines 2.1 (WCAG 2.1) at the AA level. These guidelines explain how to make web content accessible to people with a wide array of disabilities. Complying with those guidelines helps us ensure that the website is accessible to blind people, people with motor impairments, visual impairment, cognitive disabilities, and more.",
        "This website utilizes various technologies that are meant to make it as accessible as possible at all times. We utilize an accessibility interface that allows persons with specific disabilities to adjust the website's UI (user interface) and design it to their personal needs.",
        "Additionally, the website utilizes an AI-based application that runs in the background and optimizes its accessibility level constantly. This application remediates the website's HTML, adapts its functionality and behavior for screen-readers used by blind users, and for keyboard functions used by individuals with motor impairments.",
        "If you've found a malfunction or have ideas for improvement, we'll be happy to hear from you. You can reach out to the website's operators by using the following email: support@webability.io",
      ];

      complianceText.forEach((paragraph, index) => {
        const lines = doc.splitTextToSize(paragraph, contentWidth);
        lines.forEach((line: string) => {
          doc.text(line, margin, currentY);
          currentY += 6;
        });
        // Add proper spacing between paragraphs
        currentY += index < complianceText.length - 1 ? 4 : 0;
      });

      // Footer with exact positioning
      const footerY = pageHeight - 25;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
      }
      doc.text(
        'WebAbility.io - Making the web accessible for everyone - www.webability.io',
        margin,
        footerY + 10,
      );

      if (type == 1) {
        // Generate blob and open in new tab
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const newWindow = window.open(url, '_blank');

        // Clean up the URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);

        // If popup was blocked, offer download as fallback
        if (!newWindow) {
          toast.error('Popup blocked. PDF will be downloaded instead.');
          const link = window.document.createElement('a');
          link.href = url;
          link.download = 'WebAbility-Accessibility-Statement.pdf';
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        return;
      } else if (type == 2) {
        doc.save('WebAbility-Accessibility-Statement.pdf');
        return;
      } else if (type == 3) {
        return doc.output('blob');
      }

      return;
    } catch (error) {
      console.error(
        'Error generating accessibility statement PDF for viewing:',
        error,
      );
      toast.error('Failed to generate accessibility statement PDF');
      return;
    }
  };

  // Function to download all documents as a zip file
  const handleDownloadZip = async () => {
    if (!currentDomain) {
      toast.error(
        'No domain selected. Please select a domain from the sidebar.',
      );
      return;
    }

    // Set loading state to disable other buttons
    setIsDownloadingZip(true);

    try {
      toast.loading('Generating complete toolkit... This may take a moment.');

      // Check if there's a valid report before proceeding
      const latestReport = await fetchLatestReport(currentDomain);
      if (
        !latestReport ||
        !latestReport.r2_key ||
        typeof latestReport.r2_key !== 'string' ||
        latestReport.r2_key.trim() === ''
      ) {
        toast.dismiss();
        toast.error(
          'No report available for this domain. Please generate a report first before downloading the toolkit.',
        );
        return;
      }

      // Generate all 3 PDFs
      const pdfs: { [key: string]: Blob } = {};

      // 1. Generate Intro to Toolkit PDF
      try {
        pdfs['1-Intro-to-Toolkit.pdf'] = await generateIntroToToolkitPDF();
      } catch (error) {
        console.error('Error generating intro PDF for zip:', error);
        toast.error('Failed to generate intro PDF');
        return;
      }

      // 2. Generate Accessibility Statement PDF
      try {
        const { jsPDF } = await import('jspdf');

        // Load custom font
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

        const doc = new jsPDF();

        if (!fontLoaded) {
          doc.setFont('helvetica', 'normal');
        }

        // Page dimensions
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 25;
        const contentWidth = pageWidth - margin * 2;

        // Clean white background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        let currentY = 30;

        // Header section with exact positioning
        // Main title - large, bold blue font
        doc.setFontSize(28);
        doc.setTextColor(37, 99, 235);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'bold');
        } else {
          doc.setFont('helvetica', 'bold');
        }
        doc.text('Accessibility Statement', margin, currentY);

        currentY += 10;

        // Domain and date information with proper spacing
        doc.setFontSize(14);
        doc.setTextColor(51, 65, 85);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'normal');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        // Domain name
        const domainName = currentDomain || 'webability.io';
        doc.text(domainName, margin, currentY);

        // Vertical line separator with exact positioning
        const domainWidth = doc.getTextWidth(domainName);

        // Date with proper spacing
        const dateText = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        doc.text(dateText, margin + domainWidth + 15, currentY);

        // "Issued by" section in top-right with exact positioning (bold)
        const issuedByText = 'Issued by';
        const issuedByWidth = doc.getTextWidth(issuedByText);
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'bold');
        } else {
          doc.setFont('helvetica', 'bold');
        }
        doc.text(issuedByText, pageWidth - margin - issuedByWidth - 24, 30);

        // WebAbility.io logo in top-right with improved positioning
        try {
          const logoImage = '/images/logo.png';
          const img = new Image();
          img.src = logoImage;

          // Wait for image to load to get proper dimensions
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('Logo load timeout')),
              3000,
            );
            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Logo load failed'));
            };
          });

          // Calculate proper dimensions while maintaining aspect ratio
          const maxWidth = 45;
          const maxHeight = 35;
          const aspectRatio = img.width / img.height;

          let drawWidth = maxWidth;
          let drawHeight = maxWidth / aspectRatio;

          if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = maxHeight * aspectRatio;
          }

          // Position logo in top-right corner with exact positioning
          const logoX = pageWidth - margin - drawWidth;
          const logoY = 35;

          doc.addImage(logoImage, 'PNG', logoX, logoY, drawWidth, drawHeight);
        } catch (e) {
          // If logo fails, fall back to text with exact positioning
          doc.setFontSize(14);
          doc.setTextColor(37, 99, 235);
          if (fontLoaded) {
            doc.setFont('NotoSans_Condensed-Regular', 'bold');
          } else {
            doc.setFont('helvetica', 'bold');
          }
          doc.text('WebAbility.io', pageWidth - margin, 40, { align: 'right' });
        }

        // Add a horizontal line below the header section
        doc.setDrawColor(226, 232, 240); // light gray
        doc.setLineWidth(0.7);
        doc.line(margin, currentY + 8, pageWidth - margin, currentY + 8);
        // Main content section with proper spacing
        currentY += 25;

        // Compliance status section header
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'bold');
        } else {
          doc.setFont('helvetica', 'bold');
        }
        doc.text('Compliance status', margin, currentY);

        currentY += 15;

        // Compliance status content with exact formatting
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'normal');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        const complianceText = [
          'We firmly believe that the internet should be available and accessible to anyone and are committed to providing a website that is accessible to the broadest possible audience, regardless of ability.',
          "To fulfill this, we aim to adhere as strictly as possible to the World Wide Web Consortium's (W3C) Web Content Accessibility Guidelines 2.1 (WCAG 2.1) at the AA level. These guidelines explain how to make web content accessible to people with a wide array of disabilities. Complying with those guidelines helps us ensure that the website is accessible to blind people, people with motor impairments, visual impairment, cognitive disabilities, and more.",
          "This website utilizes various technologies that are meant to make it as accessible as possible at all times. We utilize an accessibility interface that allows persons with specific disabilities to adjust the website's UI (user interface) and design it to their personal needs.",
          "Additionally, the website utilizes an AI-based application that runs in the background and optimizes its accessibility level constantly. This application remediates the website's HTML, adapts its functionality and behavior for screen-readers used by blind users, and for keyboard functions used by individuals with motor impairments.",
          "If you've found a malfunction or have ideas for improvement, we'll be happy to hear from you. You can reach out to the website's operators by using the following email: support@webability.io",
        ];

        complianceText.forEach((paragraph, index) => {
          const lines = doc.splitTextToSize(paragraph, contentWidth);
          lines.forEach((line: string) => {
            doc.text(line, margin, currentY);
            currentY += 6;
          });
          // Add proper spacing between paragraphs
          currentY += index < complianceText.length - 1 ? 4 : 0;
        });

        // Footer with exact positioning
        const footerY = pageHeight - 25;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY, pageWidth - margin, footerY);

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'normal');
        }
        doc.text(
          'WebAbility.io - Making the web accessible for everyone - www.webability.io',
          margin,
          footerY + 10,
        );

        const statementBlob = await generateAndViewAccessibilityStatementPDF(3);
        if (statementBlob) {
          pdfs['2-Accessibility-Statement.pdf'] = statementBlob;
        } else {
          throw new Error('Failed to generate accessibility statement PDF');
        }
      } catch (error) {
        console.error(
          'Error generating accessibility statement PDF for zip:',
          error,
        );
        toast.error('Failed to generate accessibility statement PDF');
        return;
      }

      // 3. Generate Monthly Audit Report PDF (if available)
      try {
        // Fetch the full report data
        const { data: fullReportData } = await fetchReportByR2Key({
          variables: { r2_key: latestReport.r2_key },
        });

        if (fullReportData?.fetchReportByR2Key) {
          const reportPdfBlob = await generatePDF(
            fullReportData.fetchReportByR2Key,
            'en',
            currentDomain,
          );
          pdfs['3-Monthly-Audit-Report.pdf'] = reportPdfBlob;
        } else {
          // If no report data available, create a placeholder PDF
          const { jsPDF } = await import('jspdf');
          const placeholderDoc = new jsPDF();
          placeholderDoc.setFontSize(18);
          placeholderDoc.setTextColor(220, 38, 38);
          placeholderDoc.text('Monthly Audit Report', 20, 30);
          placeholderDoc.setFontSize(14);
          placeholderDoc.setTextColor(51, 65, 85);
          placeholderDoc.text(
            'No audit report available for this domain.',
            20,
            50,
          );
          placeholderDoc.text(
            'Please go to the Scanner page to generate a report.',
            20,
            65,
          );
          pdfs['3-Monthly-Audit-Report.pdf'] = placeholderDoc.output('blob');
        }
      } catch (error) {
        console.error(
          'Error generating monthly audit report PDF for zip:',
          error,
        );
        // Create a placeholder PDF for the error case
        const { jsPDF } = await import('jspdf');
        const errorDoc = new jsPDF();
        errorDoc.setFontSize(18);
        errorDoc.setTextColor(220, 38, 38);
        errorDoc.text('Monthly Audit Report', 20, 30);
        errorDoc.setFontSize(14);
        errorDoc.setTextColor(51, 65, 85);
        errorDoc.text(
          'Error generating report. Please try again later.',
          20,
          50,
        );
        pdfs['3-Monthly-Audit-Report.pdf'] = errorDoc.output('blob');
      }

      // Create ZIP file using JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add all PDFs to the zip
      Object.entries(pdfs).forEach(([filename, blob]) => {
        zip.file(filename, blob);
      });

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download the zip file
      const url = URL.createObjectURL(zipBlob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `WebAbility-Proof-of-Effort-Toolkit-${currentDomain}-${
        new Date().toISOString().split('T')[0]
      }.zip`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Complete toolkit downloaded successfully!');
    } catch (error) {
      toast.dismiss();
      console.error('Error creating zip file:', error);
      toast.error('Failed to create toolkit zip file');
    } finally {
      // Reset loading state
      setIsDownloadingZip(false);
    }
  };

  const handleViewDocument = async (document: Document) => {
    if (document.type === 'statement' && document.externalUrl) {
      // Generate and display the accessibility statement PDF
      try {
        await generateAndViewAccessibilityStatementPDF(1);
        toast.success('Accessibility statement PDF opened in new tab!');
      } catch (error) {
        toast.dismiss();
        console.error('Error generating accessibility statement PDF:', error);
        toast.error('Failed to generate accessibility statement PDF');
      }
    } else if (document.type === 'monthly-report') {
      if (!currentDomain) {
        toast.error('No domain selected');
        return;
      }

      if (isProcessingReport) {
        return; // Prevent multiple simultaneous requests
      }

      try {
        setIsProcessingReport(true);
        // Show loading state
        toast.loading('Fetching report data...');

        const latestReport = await fetchLatestReport(currentDomain);

        if (latestReport && latestReport.r2_key) {
          // Fetch the full report data
          const { data: fullReportData } = await fetchReportByR2Key({
            variables: { r2_key: latestReport.r2_key },
          });

          if (fullReportData?.fetchReportByR2Key) {
            toast.dismiss(); // Remove loading toast

            // Debug logging for view function too
            // console.log('View Report - GraphQL Data Debug:');
            // console.log('Full report data keys:', Object.keys(fullReportData.fetchReportByR2Key));
            // console.log('Report data sample:', fullReportData.fetchReportByR2Key);

            toast.loading('Generating PDF...');

            // Generate the PDF for viewing
            await viewReportPDF(
              fullReportData.fetchReportByR2Key,
              currentDomain,
            );

            toast.dismiss(); // Remove loading toast
            toast.success('PDF report opened in new tab!');
          } else {
            toast.dismiss();
            toast.error('Failed to fetch report data');
          }
        } else {
          toast.dismiss();
          // Show popup when no report found
          toast.error(
            'No report found for this domain. Please go to the Scanner page to generate a report.',
          );
        }
      } catch (error) {
        toast.dismiss();
        console.error('Error viewing report:', error);
        toast.error('Error viewing report. Please try again.');
      } finally {
        setIsProcessingReport(false);
      }
    } else if (document.name === 'Intro to the toolkit') {
      // Generate and display the intro to toolkit PDF
      try {
        //toast.loading('Generating intro PDF...');

        const pdfBlob = await generateIntroToToolkitPDF();

        // Open the PDF in a new window/tab for viewing
        const url = URL.createObjectURL(pdfBlob);
        const newWindow = window.open(url, '_blank');

        // Clean up the URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);

        // If popup was blocked, offer download as fallback
        if (!newWindow) {
          toast.error('Popup blocked. PDF will be downloaded instead.');
          const link = window.document.createElement('a');
          link.href = url;
          link.download = 'WebAbility-Intro-to-Toolkit.pdf';
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        toast.dismiss();
        toast.success('Intro PDF opened in new tab!');
      } catch (error) {
        toast.dismiss();
        console.error('Error viewing intro PDF:', error);
        toast.error('Failed to open intro PDF');
      }
    } else {
      // TODO: Implement view functionality for other documents
      //  console.log('View document clicked:', document.name);
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

  const handleDownloadDocument = async (document: Document) => {
    if (document.type === 'statement') {
      // Generate and download the accessibility statement PDF (simple version without report data)
      try {
        await generateAndViewAccessibilityStatementPDF(2);
      } catch (error) {
        console.error('Error generating accessibility statement PDF:', error);
        toast.error('Failed to generate accessibility statement PDF');
      }
    } else if (document.type === 'monthly-report') {
      if (!currentDomain) {
        toast.error('No domain selected');
        return;
      }

      if (isProcessingReport) {
        return; // Prevent multiple simultaneous requests
      }

      try {
        setIsProcessingReport(true);
        // Show loading state
        toast.loading('Fetching report data...');

        const latestReport = await fetchLatestReport(currentDomain);

        if (latestReport && latestReport.r2_key) {
          // Fetch the full report data
          const { data: fullReportData } = await fetchReportByR2Key({
            variables: { r2_key: latestReport.r2_key },
          });

          if (fullReportData?.fetchReportByR2Key) {
            toast.dismiss(); // Remove loading toast

            toast.loading('Generating PDF...');

            // Generate and download the PDF
            await generateReportPDF(
              fullReportData.fetchReportByR2Key,
              currentDomain,
            );

            toast.dismiss(); // Remove loading toast
            toast.success('PDF generated successfully!');
          } else {
            toast.dismiss();
            toast.error('Failed to fetch report data');
          }
        } else {
          toast.dismiss();
          // Show popup when no report found
          toast.error(
            'No report found for this domain. Please go to the Scanner page to generate a report.',
          );
        }
      } catch (error) {
        toast.dismiss();
        console.error('Error downloading report:', error);
        toast.error('Error downloading report. Please try again.');
      } finally {
        setIsProcessingReport(false);
      }
    } else if (document.name === 'Intro to the toolkit') {
      // Generate and download the intro to toolkit PDF
      try {
        //toast.loading('Generating intro PDF...');

        const pdfBlob = await generateIntroToToolkitPDF();

        // Download the PDF
        const url = URL.createObjectURL(pdfBlob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = 'WebAbility-Intro-to-Toolkit.pdf';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.dismiss();
        toast.success('Intro PDF downloaded successfully!');
      } catch (error) {
        toast.dismiss();
        console.error('Error downloading intro PDF:', error);
        toast.error('Failed to download intro PDF');
      }
    } else {
      // TODO: Implement download functionality for other documents
      // console.log('Download document clicked:', document.name);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 sm:p-4 p-6">
      <TourGuide
        steps={proofOfEffortTourSteps}
        tourKey={tourKeys.proofOfEffort}
        autoStart={true}
        onTourComplete={() => {
          // noop for now
        }}
        customStyles={defaultTourStyles}
      />
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Header Section */}
          <div className="sm:p-4 p-8 border-b border-gray-200">
            <div className="text-gray-600 text-sm mb-4">
              You've taken steps to make your website accessible. The proof of
              effort toolkit compiles key documentation that showcases your
              commitment to accessibility. If your website's accessibility is
              ever challenged (i.e. you receive a demand letter), you'll have
              evidence to demonstrate your efforts and respond with confidence.
            </div>

            <div className="sm:flex-col sm:gap-4 flex items-start gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <FiFile className="w-8 h-8 text-blue-600" />
              </div>

              <div className="flex-1">
                <h1 className="poe-title sm:text-xl text-2xl font-medium text-gray-900 mb-2">
                  Proof of effort toolkit
                </h1>
                <p className="text-gray-600 sm:mb-4 mb-6">
                  Get a zip file with documentation to help you and your legal
                  team.
                </p>

                <div className="poe-documents-count text-sm text-gray-500 sm:mb-4 mb-6">
                  {documents.length} Documents
                </div>

                <div className="sm:flex-col sm:gap-2 flex gap-3">
                  <button
                    className={`poe-send-email-button inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md transition-colors ${
                      isDownloadingZip || isEmailSending
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                    onClick={handleSendViaEmail}
                    disabled={isDownloadingZip || isEmailSending}
                  >
                    {isEmailSending ? (
                      <>
                        <CircularProgress size={16} />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MdEmail className="w-4 h-4" />
                        Send via email
                      </>
                    )}
                  </button>

                  <button
                    className={`poe-download-zip-button inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      isDownloadingZip || isEmailSending
                        ? 'bg-blue-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    onClick={handleDownloadZip}
                    disabled={isDownloadingZip || isEmailSending}
                  >
                    {isDownloadingZip ? (
                      <>
                        <CircularProgress
                          size={16}
                          style={{ color: 'white' }}
                        />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <MdFileDownload className="w-4 h-4" />
                        Download Zip
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* View Files Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setViewFilesExpanded(!viewFilesExpanded)}
              className="poe-view-files-toggle w-full flex items-center justify-between sm:p-4 p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-700 font-medium">View files</span>
              {viewFilesExpanded ? (
                <MdKeyboardArrowUp className="w-5 h-5 text-gray-500" />
              ) : (
                <MdKeyboardArrowDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {viewFilesExpanded && (
              <div className="poe-documents-list sm:px-4 sm:pb-4 px-6 pb-6">
                {/* Table Header */}
                <div className="sm:hidden grid grid-cols-12 gap-4 py-3 text-sm font-medium text-gray-500 border-b border-gray-200">
                  <div className="col-span-6">Document</div>
                  <div className="col-span-4">Creation Date</div>
                  <div className="col-span-2"></div>
                </div>

                {/* Document Rows */}
                {documents.map((document, index) => (
                  <div
                    key={index}
                    className="sm:block sm:p-3 sm:border sm:border-gray-200 sm:rounded-lg sm:mb-3 grid grid-cols-12 gap-4 py-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="sm:col-span-12 sm:mb-2 col-span-6 flex items-center gap-3">
                      <FiFile className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-900">{document.name}</span>
                      {document.type === 'monthly-report' &&
                        isProcessingReport && (
                          <span className="text-xs text-blue-600 italic">
                            Processing...
                          </span>
                        )}
                    </div>
                    <div className="sm:col-span-12 sm:mb-2 sm:text-sm col-span-4 flex items-center text-gray-600">
                      <span className="sm:inline sm:font-medium sm:text-gray-700 sm:mr-2 hidden">
                        Creation Date:
                      </span>
                      {document.creationDate}
                    </div>
                    <div className="sm:col-span-12 sm:justify-start col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDocument(document)}
                        className={`poe-view-button p-2 transition-colors ${
                          (document.type === 'monthly-report' &&
                            isProcessingReport) ||
                          isDownloadingZip ||
                          isEmailSending
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={
                          document.type === 'monthly-report'
                            ? 'View PDF report'
                            : document.type === 'statement'
                            ? 'View accessibility statement PDF'
                            : 'View document'
                        }
                        disabled={
                          (document.type === 'monthly-report' &&
                            isProcessingReport) ||
                          isDownloadingZip ||
                          isEmailSending
                        }
                      >
                        <MdVisibility className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(document)}
                        className={`poe-download-button p-2 transition-colors ${
                          (document.type === 'monthly-report' &&
                            isProcessingReport) ||
                          isDownloadingZip ||
                          isEmailSending
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Download document"
                        disabled={
                          (document.type === 'monthly-report' &&
                            isProcessingReport) ||
                          isDownloadingZip ||
                          isEmailSending
                        }
                      >
                        <MdFileDownload className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSubmit={handleEmailSubmit}
        isLoading={isEmailSending}
        title="Send Proof of Effort Toolkit"
        description="Enter the email address where you would like to send the proof of effort toolkit containing all three PDF documents."
      />
    </div>
  );
};

export default ProofOfEffortToolkit;
