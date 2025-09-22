import React, { useState, useEffect } from 'react';
import {
  MdFileDownload,
  MdEmail,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdVisibility,
  MdArrowBack,
  MdArrowForward,
  MdClose,
  MdMoreVert,
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
import getWidgetSettings from '@/utils/getWidgetSettings';
import EmailModal from '@/components/Common/EmailModal';
import { CircularProgress } from '@mui/material';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { proofOfEffortTourSteps, tourKeys } from '@/constants/toursteps';
import autoTable, { __createTable, __drawTable } from 'jspdf-autotable';
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
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
    null,
  );
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

  // Cleanup PDF URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfViewerUrl) {
        URL.revokeObjectURL(pdfViewerUrl);
      }
    };
  }, [pdfViewerUrl]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownIndex(null);
    };

    if (openDropdownIndex !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }

    return undefined;
  }, [openDropdownIndex]);

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
        const monthlyPdf = await generateAccessibilityStatementPDF(
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
      const pdfBlob = await generateAccessibilityStatementPDF(
        reportData,
        'en',
        domain,
      ); // Using English as default language

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
      const pdfBlob = await generateAccessibilityStatementPDF(
        reportData,
        'en',
        domain,
      ); // Using English as default language

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
          const reportPdfBlob = await generateAccessibilityStatementPDF(
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
    const documentIndex = documents.findIndex(
      (doc) => doc.name === document.name,
    );
    setCurrentDocumentIndex(documentIndex);
    setSelectedDocument(document);

    try {
      let pdfBlob: Blob;

      if (document.type === 'statement') {
        // Generate accessibility statement PDF
        const statementBlob = await generateAndViewAccessibilityStatementPDF(3);
        if (!statementBlob) {
          throw new Error('Failed to generate accessibility statement PDF');
        }
        pdfBlob = statementBlob;
      } else if (document.type === 'monthly-report') {
        // Handle monthly report viewing
        if (!currentDomain) {
          toast.error('No domain selected');
          return;
        }

        if (isProcessingReport) {
          return; // Prevent multiple simultaneous requests
        }

        setIsProcessingReport(true);
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

            // Generate the PDF blob instead of opening in new tab
            pdfBlob = await generateAccessibilityStatementPDF(
              fullReportData.fetchReportByR2Key,
              'en',
              currentDomain,
            );

            toast.dismiss(); // Remove loading toast
          } else {
            toast.dismiss();
            toast.error('Failed to fetch report data');
            setIsProcessingReport(false);
            return;
          }
        } else {
          toast.dismiss();
          toast.error(
            'No report found for this domain. Please go to the Scanner page to generate a report.',
          );
          setIsProcessingReport(false);
          return;
        }
        setIsProcessingReport(false);
      } else if (document.name === 'Intro to the toolkit') {
        // Generate intro document PDF
        toast.loading('Generating intro document...', {
          id: 'generating-intro',
        });
        pdfBlob = await generateIntroToToolkitPDF();
        toast.dismiss('generating-intro');
      } else {
        throw new Error('Unknown document type');
      }

      // Create URL for PDF viewer
      const url = URL.createObjectURL(pdfBlob);
      setPdfViewerUrl(url);

      toast.success('Document loaded successfully!');
    } catch (error) {
      toast.dismiss();
      console.error('Error viewing document:', error);
      toast.error('Failed to load document');
      setSelectedDocument(null);
    }
  };

  const handlePreviousDocument = () => {
    if (currentDocumentIndex > 0) {
      const prevDoc = documents[currentDocumentIndex - 1];
      handleViewDocument(prevDoc);
    }
  };

  const handleNextDocument = () => {
    if (currentDocumentIndex < documents.length - 1) {
      const nextDoc = documents[currentDocumentIndex + 1];
      handleViewDocument(nextDoc);
    }
  };

  const handleCloseDocument = () => {
    setSelectedDocument(null);
    setPdfViewerUrl(null);
    if (pdfViewerUrl) {
      URL.revokeObjectURL(pdfViewerUrl);
    }
  };

  const handleDropdownToggle = (index: number) => {
    setOpenDropdownIndex(openDropdownIndex === index ? null : index);
  };

  const handleDropdownAction = (
    document: Document,
    action: 'view' | 'download',
  ) => {
    setOpenDropdownIndex(null);
    if (action === 'view') {
      handleViewDocument(document);
    } else if (action === 'download') {
      handleDownloadDocument(document);
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

  const generateAccessibilityStatementPDF = async (
    reportData: any, // Using any to allow flexible report structure
    currentLanguage: string,
    domain?: string,
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
      reportData.url = domain || '';
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
        ['Content', [33, 150, 243]], // Blue 500
        ['Cognitive', [25, 118, 210]], // Blue 700
        ['Low Vision', [30, 136, 229]], // Blue 600 (darker, not too light)
        ['Navigation', [21, 101, 192]], // Blue 800
        ['Mobility', [66, 165, 245]], // Blue 400 (mid blue, not too light)
        ['Other', [120, 144, 156]], // Blue Grey 700 (neutral, not light blue)
        ['Forms', [2, 119, 189]], // Blue 700 (darker)
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

    let yTable = yStart + 40;

    const pageHeight = doc.internal.pageSize.getHeight();
    const footerHeight = 15;

    // Helper to ensure array
    const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

    // Helper: estimate heights to keep Issue + Message + Fix(es) together on one page
    const getColumnWidths = () => [38, 38, 50, 45];
    const sumColumnsWidth = (startIndex: number, span: number) => {
      const widths = getColumnWidths();
      return widths
        .slice(startIndex, startIndex + span)
        .reduce((a, b) => a + b, 0);
    };
    const getLineHeight = (fontSize: number) => {
      const factor =
        typeof (doc as any).getLineHeightFactor === 'function'
          ? (doc as any).getLineHeightFactor()
          : 1.15;
      return Math.max(4, fontSize * factor);
    };
    const estimateCellHeight = (
      text: string,
      availableWidth: number,
      fontSize: number,
      paddingTop: number,
      paddingBottom: number,
    ) => {
      const content = String(text || '');
      const safeWidth = Math.max(5, availableWidth);
      const lines = doc.splitTextToSize(content, safeWidth);
      const lineHeight = getLineHeight(fontSize);
      const textHeight = Math.max(lineHeight, lines.length * lineHeight);
      return textHeight + paddingTop + paddingBottom;
    };
    const estimateIssueFixGroupHeight = (
      issue: any,
      headerLeftText: string,
      headerRightText: string,
      fixesList: string[],
    ) => {
      // Row: Header (two cells, colSpan 2 each)
      const headerLeftWidth = sumColumnsWidth(0, 2) - 16; // padding 8 + 8
      const headerRightWidth = sumColumnsWidth(2, 2) - 16;
      const headerLeftH = estimateCellHeight(
        headerLeftText,
        headerLeftWidth,
        14,
        8,
        8,
      );
      const headerRightH = estimateCellHeight(
        headerRightText,
        headerRightWidth,
        14,
        8,
        8,
      );
      const headerRowH = Math.max(headerLeftH, headerRightH);

      // Row: Issue + Message (two cells)
      const issueLeftText = issue.code ? `${issue.code} (${issue.impact})` : '';
      const issueRightText = issue.message || '';
      const issueLeftWidth = sumColumnsWidth(0, 2) - 20; // padding 10 + 10
      const issueRightWidth = sumColumnsWidth(2, 2) - 20;
      const issueLeftH = Math.max(
        30,
        estimateCellHeight(issueLeftText, issueLeftWidth, 12, 10, 10),
      );
      const issueRightH = Math.max(
        30,
        estimateCellHeight(issueRightText, issueRightWidth, 12, 10, 10),
      );
      const issueRowH = Math.max(issueLeftH, issueRightH);

      // Row: Fix heading (if any)
      let fixesBlockH = 0;
      const filtered = fixesList.filter(Boolean);
      if (filtered.length > 0) {
        const fixHeadingWidth = sumColumnsWidth(0, 4) - 10; // padding 5 + 5
        const fixHeadingH = estimateCellHeight(
          'Fix',
          fixHeadingWidth,
          11,
          5,
          5,
        );
        fixesBlockH += fixHeadingH;
        // Each fix row
        const fixRowWidth = sumColumnsWidth(0, 4) - 16; // padding 8 + 8
        filtered.forEach((fix) => {
          const text = `${fix}`; // number prefix height impact negligible in estimate
          const h = estimateCellHeight(text, fixRowWidth, 11, 10, 10);
          fixesBlockH += Math.max(22, h); // ensure reasonable min
        });
        // Spacer rows between fixes
        fixesBlockH += Math.max(0, filtered.length - 1) * 6;
      }

      return headerRowH + issueRowH + fixesBlockH;
    };

    // Build the rows
    let tableBody: any[] = [];
    const FilteredIssues = await deduplicateIssuesByMessage(issues);

    const translatedIssues = await translateText(
      FilteredIssues,
      currentLanguage,
    );

    // After fetching base64
    for (const issue of translatedIssues) {
      if (issue.screenshotUrl && !issue.screenshotBase64) {
        issue.screenshotBase64 = await fetchImageAsBase64(issue.screenshotUrl);
        // console.log('Fetched base64 for', issue.screenshotUrl, '->', !!issue.screenshotBase64);
      }
    }

    let fitToPage = false;

    for (const [index, issue] of translatedIssues.entries()) {
      // Add page break before each issue (except the first one)
      if (fitToPage) {
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
          rowPageBreak: 'auto',
          tableLineColor: [226, 232, 240],
          tableLineWidth: 0.5,
          styles: {
            lineColor: [255, 255, 255],
            lineWidth: 0,
            cellPadding: 8,
          },
          willDrawCell: (data: any) => {
            if (data.cell.raw && (data.cell.raw as any)._isCodeBlock) {
              const pageHeight = doc.internal.pageSize.getHeight();
              const currentY = data.cursor.y;
              const bottomMargin = 25;
              const fullText = (data.cell.raw as any).content || '';
              const indexNumber = (data.cell.raw as any)._indexNumber;
              const indexPrefix = `${indexNumber}`;
              const indexWidth = doc.getTextWidth(indexPrefix) + 16;
              const codeContent = fullText.substring(`${indexNumber}. `.length);
              const availableWidth = data.cell.width - 16 - indexWidth;
              doc.setFont('NotoSans_Condensed-Regular', 'normal');
              doc.setFontSize(10);
              const lines = doc.splitTextToSize(codeContent, availableWidth);
              const lineHeight = 4;
              const topPadding = 8;
              const bottomPadding = 4;
              const textHeight =
                lines.length * lineHeight + topPadding + bottomPadding;
              const estimatedHeight = Math.max(textHeight, 30);
              if (currentY + estimatedHeight > pageHeight - bottomMargin) {
                return false;
              }
            }
            return true;
          },
          didDrawCell: (data: any) => {
            if (data.cell.raw && (data.cell.raw as any)._isCodeBlock) {
              const { x, y, width, height } = data.cell;
              const padding = 2;
              const cornerRadius = 4;
              const indexNumber = (data.cell.raw as any)._indexNumber;
              doc.setFont('NotoSans_Condensed-Regular', 'normal');
              doc.setFontSize(12);
              const indexPrefix = `${indexNumber}`;
              const indexWidth = doc.getTextWidth(indexPrefix) + 8;
              doc.setDrawColor(100, 116, 139);
              doc.setLineWidth(0.5);
              doc.setFillColor(15, 23, 42);
              doc.roundedRect(
                x + padding,
                y + padding,
                width - padding * 2,
                height - padding * 2,
                cornerRadius,
                cornerRadius,
                'FD',
              );
              doc.setFillColor(51, 65, 85);
              doc.roundedRect(
                x + padding,
                y + padding,
                indexWidth,
                height - padding * 2,
                cornerRadius,
                cornerRadius,
                'F',
              );
              doc.setFillColor(51, 65, 85);
              doc.rect(
                x + padding + indexWidth - cornerRadius,
                y + padding,
                cornerRadius,
                height - padding * 2,
                'F',
              );
              doc.setTextColor(255, 255, 255);
              const indexTextX = x + padding + 4;
              const textY = y + padding + 8;
              doc.text(indexPrefix, indexTextX, textY);
              const fullText = (data.cell.raw as any).content;
              const codeContent = fullText.substring(`${indexNumber}. `.length);
              const codeTextX = x + padding + indexWidth + 4;
              const availableWidth = width - padding * 2 - indexWidth - 8;
              const lines = doc.splitTextToSize(codeContent, availableWidth);
              let codeTextY = y + padding + 8;
              lines.forEach((line: string) => {
                doc.text(line, codeTextX, codeTextY);
                codeTextY += 4;
              });
            }
            if (
              data.cell.raw &&
              data.cell.raw.styles &&
              data.cell.raw.styles.fontStyle === 'bold' &&
              data.cell.raw.styles.fontSize === 14
            ) {
              const { x, y, width, height } = data.cell;
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.5);
              doc.line(x, y + height, x + width, y + height);
            }
            if (
              data.cell.raw &&
              data.cell.raw._isScreenshot &&
              data.cell.raw._screenshotBase64
            ) {
              const { x, y, width, height } = data.cell;
              const imgWidth = data.cell.raw._screenshotWidth || 80;
              const imgHeight = data.cell.raw._screenshotHeight || 80;
              const imgX = x + (width - imgWidth) / 2;
              const imgY = y + (height - imgHeight) / 2;
              data.doc.addImage(
                data.cell.raw._screenshotBase64,
                'PNG',
                imgX,
                imgY,
                imgWidth,
                imgHeight,
              );
            }
          },
        });

        // Start a new page and reset tableBody
        doc.addPage();
        tableBody = [];
        yTable = 10; // Standard top margin for new page
      }

      // Prepare Fix(es) list for height estimation and rows
      const fixes = toArray(issue.recommended_action);
      const filteredFixes = fixes.filter(Boolean);

      // Estimate group height (Issue header + Issue row + Fixes block) to avoid page breaks inside
      const groupHeightEstimate = estimateIssueFixGroupHeight(
        issue,
        translatedIssue,
        translatedIssueMessage,
        filteredFixes as any,
      );

      // Build group table body for this issue (Issue header + Issue row + Fixes)
      const groupBody: any[] = [];
      // Add header row for each issue with beautiful styling
      groupBody.push([
        {
          content: translatedIssue,
          colSpan: 2,
          pageBreak: 'avoid', // Keep issue header with its content
          _isIssueFixGroupStart: true,
          _groupHeight: groupHeightEstimate,
          styles: {
            fillColor: [255, 255, 255], // white background
            textColor: [0, 0, 0], // black text
            fontSize: 14,
            halign: 'center',
            cellPadding: 8,
          },
        },
        {
          content: translatedIssueMessage,
          colSpan: 2,
          pageBreak: 'avoid', // Keep issue header with its content
          styles: {
            fillColor: [255, 255, 255], // matching white background
            textColor: [0, 0, 0], // black text
            fontSize: 14,
            halign: 'center',
            cellPadding: 8,
          },
        },
      ]);

      // Row 1: Issue + Message with elegant code block styling
      groupBody.push([
        {
          content: `${issue.code ? `${issue.code} (${issue.impact})` : ''}`,
          colSpan: 2,
          pageBreak: 'avoid', // Keep with header
          styles: {
            fontSize: 12,
            textColor: [30, 41, 59],
            halign: 'left',
            cellPadding: 10,
            fillColor:
              issue.impact === 'critical'
                ? [255, 204, 204]
                : issue.impact === 'Mild'
                ? [225, 245, 254]
                : issue.impact === 'moderate'
                ? [187, 222, 251]
                : [248, 250, 252],
            font: 'NotoSans_Condensed-Regular',
            minCellHeight: 30,
          },
        },

        {
          content: `${issue.message || ''}`,
          colSpan: 2,
          pageBreak: 'avoid', // Keep with header
          styles: {
            fontSize: 12,
            textColor: [30, 41, 59],
            halign: 'left',
            cellPadding: 10,
            fillColor:
              issue.impact === 'critical'
                ? [255, 204, 204]
                : issue.impact === 'Mild'
                ? [225, 245, 254]
                : issue.impact === 'moderate'
                ? [187, 222, 251]
                : [248, 250, 252],
            font: 'NotoSans_Condensed-Regular',
            minCellHeight: 30,
          },
        },
      ]);

      // Row 3: Fix(es) - display heading first, then each fix in its own white back container with spacing
      if (filteredFixes.length > 0) {
        // Heading row for Fix - ensure it stays with at least first fix
        groupBody.push([
          {
            content: translatedFix,
            colSpan: 4,
            pageBreak: 'avoid', // Keep fix heading with first fix item
            styles: {
              fontSize: 11,
              textColor: [0, 0, 0], // black text
              halign: 'left',
              cellPadding: 5,
              fillColor: [255, 255, 255], // white background
              lineWidth: 0,
              font: 'NotoSans_Condensed-Regular',
            },
          },
        ]);
        // Each fix in its own row/container, with white background and spacing
        filteredFixes.forEach((fix, fixIdx) => {
          groupBody.push([
            {
              content: `${fixIdx + 1}. ${fix}`,
              colSpan: 4,
              pageBreak: fixIdx === 0 ? 'avoid' : 'auto', // First fix must stay with heading
              styles: {
                fontSize: 11,
                textColor: [0, 0, 0], // black text
                halign: 'left',
                cellPadding: { top: 10, right: 8, bottom: 10, left: 8 }, // more vertical space for separation
                fillColor: [255, 255, 255], // white background for back container
                lineWidth: 0,
                font: 'NotoSans_Condensed-Regular',
              },
            },
          ]);
          // Add a spacer row after each fix except the last
          if (fixIdx < filteredFixes.length - 1) {
            groupBody.push([
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

      // Append Context rows to the same group so Fix and Context never split
      const groupContexts = toArray(issue.context).filter(Boolean);
      if (groupContexts.length > 0) {
        groupBody.push([
          {
            content: translatedContext,
            colSpan: 4,
            pageBreak: 'avoid',
            styles: {
              fontSize: 11,
              textColor: [0, 0, 0],
              halign: 'left',
              cellPadding: 5,
              fillColor: [255, 255, 255],
              lineWidth: 0,
            },
          },
        ]);

        groupContexts.forEach((ctx, index) => {
          const combinedContent = `${index + 1}. ${ctx}`;
          groupBody.push([
            {
              content: combinedContent,
              colSpan: 4,
              pageBreak: index === 0 ? 'avoid' : 'auto',
              rowSpan: 1,
              styles: {
                font: 'NotoSans_Condensed-Regular',
                fontSize: 10,
                textColor: [255, 255, 255],
                fillColor: [255, 255, 255],
                halign: 'left',
                valign: 'top',
                cellPadding: 8,
                lineWidth: 0,
                minCellHeight: Math.max(
                  20,
                  Math.ceil(combinedContent.length / 50) * 6,
                ),
                overflow: 'linebreak',
              },
              _isCodeBlock: true,
              _originalContent: combinedContent,
              _indexNumber: index + 1,
            } as any,
          ]);
          if (index < groupContexts.length - 1) {
            groupBody.push([
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

      // Build options for this group's table
      const groupOptions: any = {
        startY: yTable,
        margin: { left: 15, right: 15, top: 0, bottom: footerHeight },
        head: [],
        body: groupBody,
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 38 },
          2: { cellWidth: 50 },
          3: { cellWidth: 45 },
        },
        rowPageBreak: 'avoid',
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.5,
        styles: {
          lineColor: [255, 255, 255],
          lineWidth: 0,
          cellPadding: 8,
        },
        willDrawCell: (data: any) => {
          if (data.cell.raw && (data.cell.raw as any)._isCodeBlock) {
            const pageH = doc.internal.pageSize.getHeight();
            const curY = data.cursor.y;
            const bottom = 25;
            const fullText = (data.cell.raw as any).content || '';
            const indexNumber = (data.cell.raw as any)._indexNumber;
            const indexPrefix = `${indexNumber}`;
            const indexWidth = doc.getTextWidth(indexPrefix) + 16;
            const codeContent = fullText.substring(`${indexNumber}. `.length);
            const availableWidth = data.cell.width - 16 - indexWidth;
            doc.setFont('NotoSans_Condensed-Regular', 'normal');
            doc.setFontSize(10);
            const lines = doc.splitTextToSize(codeContent, availableWidth);
            const lineH = 4;
            const topPad = 8;
            const bottomPad = 4;
            const textH = lines.length * lineH + topPad + bottomPad;
            const estH = Math.max(textH, 30);
            if (curY + estH > pageH - bottom) return false;
          }
          return true;
        },
        didDrawCell: (data: any) => {
          if (data.cell.raw && (data.cell.raw as any)._isCodeBlock) {
            const { x, y, width, height } = data.cell;
            const padding = 2;
            const cornerRadius = 4;
            const indexNumber = (data.cell.raw as any)._indexNumber;
            doc.setFont('NotoSans_Condensed-Regular', 'normal');
            doc.setFontSize(12);
            const indexPrefix = `${indexNumber}`;
            const indexWidth = doc.getTextWidth(indexPrefix) + 8;
            doc.setDrawColor(100, 116, 139);
            doc.setLineWidth(0.5);
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(
              x + padding,
              y + padding,
              width - padding * 2,
              height - padding * 2,
              cornerRadius,
              cornerRadius,
              'FD',
            );
            doc.setFillColor(51, 65, 85);
            doc.roundedRect(
              x + padding,
              y + padding,
              indexWidth,
              height - padding * 2,
              cornerRadius,
              cornerRadius,
              'F',
            );
            doc.setFillColor(51, 65, 85);
            doc.rect(
              x + padding + indexWidth - cornerRadius,
              y + padding,
              cornerRadius,
              height - padding * 2,
              'F',
            );
            doc.setTextColor(255, 255, 255);
            const indexTextX = x + padding + 4;
            const textY = y + padding + 8;
            doc.text(indexPrefix, indexTextX, textY);
            const fullText = (data.cell.raw as any).content;
            const codeContent = fullText.substring(`${indexNumber}. `.length);
            const codeTextX = x + padding + indexWidth + 4;
            const availW = width - padding * 2 - indexWidth - 8;
            const lines = doc.splitTextToSize(codeContent, availW);
            let codeTextY = y + padding + 8;
            lines.forEach((line: string) => {
              doc.text(line, codeTextX, codeTextY);
              codeTextY += 4;
            });
          }
        },
      };

      // Use internal measurement to avoid overestimation before drawing
      try {
        const previewTable: any = __createTable(doc as any, groupOptions);
        const bodyHeight = previewTable.body
          ? previewTable.body.reduce(
              (sum: number, row: any) =>
                sum + row.getMaxCellHeight(previewTable.columns),
              0,
            )
          : 0;
        const availableBottom = pageHeight - footerHeight;
        if (yTable + bodyHeight > availableBottom) {
          doc.addPage();
          yTable = 10;
          groupOptions.startY = yTable;
        }
        const tableToDraw: any = __createTable(doc as any, groupOptions);
        __drawTable(doc as any, tableToDraw);
        if (tableToDraw && tableToDraw.finalY) {
          yTable = tableToDraw.finalY + 2;
        }
      } catch {
        // Fallback to standard draw if internals are unavailable
        autoTable(doc, groupOptions);
        const lastTable: any =
          (doc as any).lastAutoTable ||
          (doc as any).autoTable?.previous ||
          null;
        if (lastTable && lastTable.finalY) {
          yTable = lastTable.finalY + 2;
        }
      }

      // After-group: build additional rows (screenshot + contexts) in a separate table
      const afterBody: any[] = [];
      // If screenshotBase64 is available, add a row with the image
      if (issue.screenshotBase64) {
        // Get actual image dimensions from base64 data
        const dimensions = await getImageDimensions(issue.screenshotBase64);
        let drawWidth = dimensions.width;
        let drawHeight = dimensions.height;

        // Scale down if image is too large for PDF
        const maxWidth = 120;
        const maxHeight = 80;
        const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight, 1);

        const screenshotWidth = drawWidth * scale;
        const screenshotHeight = drawHeight * scale;

        // Add a heading row for the screenshot
        afterBody.push([
          {
            content: 'Screenshot',
            colSpan: 4,
            pageBreak: 'avoid', // Keep screenshot with issue
            styles: {
              fontSize: 12,
              textColor: [30, 41, 59],
              halign: 'center',
              cellPadding: 6,
              fillColor: [237, 242, 247],
              minCellHeight: 18,
            },
          } as any,
        ]);

        // Add the screenshot image row
        afterBody.push([
          {
            content: '',
            colSpan: 4,
            pageBreak: 'avoid', // Keep screenshot with its heading
            styles: {
              halign: 'center',
              valign: 'middle',
              cellPadding: 8,
              fillColor: [248, 250, 252],
              minCellHeight: screenshotHeight + 20, // Add padding around image
            },
            _isScreenshot: true,
            _screenshotBase64: issue.screenshotBase64,
            _screenshotWidth: screenshotWidth,
            _screenshotHeight: screenshotHeight,
            _screenshotUrl: issue.screenshotUrl, // Add the screenshot URL for linking
          } as any,
        ]);
      }

      // Contexts block already appended to groupBody above; skip rebuilding here
      const contextsAfter: any[] = [];

      if (false && contextsAfter.length > 0) {
        // Heading: "Context:" - ensure it stays with at least first context
        afterBody.push([
          {
            content: translatedContext,
            colSpan: 4,
            pageBreak: 'avoid', // Keep context heading with first context item
            styles: {
              fontSize: 11,
              textColor: [0, 0, 0],
              halign: 'left',
              cellPadding: 5,
              fillColor: [255, 255, 255],
              lineWidth: 0,
            },
          },
        ]);

        contextsAfter.forEach((ctx, index) => {
          // Combined code block with index number
          const combinedContent = `${index + 1}. ${ctx}`;

          afterBody.push([
            {
              content: combinedContent,
              colSpan: 4,
              pageBreak: index === 0 ? 'avoid' : 'auto', // First context must stay with heading
              rowSpan: 1,
              styles: {
                font: 'NotoSans_Condensed-Regular',
                fontSize: 10,
                textColor: [255, 255, 255], // This will be overridden by didDrawCell
                fillColor: [255, 255, 255], // White background for the cell
                halign: 'left',
                valign: 'top',
                cellPadding: 8,
                lineWidth: 0,
                minCellHeight: Math.max(
                  20,
                  Math.ceil(combinedContent.length / 50) * 6,
                ), // Dynamic height based on content
                overflow: 'linebreak',
              },

              _isCodeBlock: true,
              _originalContent: combinedContent, // Store original content for height calculation
              _indexNumber: index + 1, // Store index for potential special formatting
            } as any,
          ]);

          // Spacer row after each block (except the last)
          if (index < contextsAfter.length - 1) {
            afterBody.push([
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

      if (afterBody.length > 0) {
        autoTable(doc, {
          startY: yTable,
          margin: { left: 15, right: 15, top: 0, bottom: footerHeight },
          head: [],
          body: afterBody,
          theme: 'plain',
          columnStyles: {
            0: { cellWidth: 38 },
            1: { cellWidth: 38 },
            2: { cellWidth: 50 },
            3: { cellWidth: 45 },
          },
          rowPageBreak: 'avoid',
          tableLineColor: [226, 232, 240],
          tableLineWidth: 0.5,
          styles: {
            lineColor: [255, 255, 255],
            lineWidth: 0,
            cellPadding: 8,
          },
          // Keep code block and screenshot hooks for this table
          willDrawCell: (data: any) => {
            if (data.cell.raw && (data.cell.raw as any)._isCodeBlock) {
              const pageHeight2 = doc.internal.pageSize.getHeight();
              const currentY2 = data.cursor.y;
              const bottomMargin2 = 25;
              const fullText = (data.cell.raw as any).content || '';
              const indexNumber = (data.cell.raw as any)._indexNumber;
              const indexPrefix = `${indexNumber}`;
              const indexWidth = doc.getTextWidth(indexPrefix) + 16;
              const codeContent = fullText.substring(`${indexNumber}. `.length);
              const availableWidth = data.cell.width - 16 - indexWidth;
              doc.setFont('NotoSans_Condensed-Regular', 'normal');
              doc.setFontSize(10);
              const lines = doc.splitTextToSize(codeContent, availableWidth);
              const lineHeight = 4;
              const topPadding = 8;
              const bottomPadding = 4;
              const textHeight =
                lines.length * lineHeight + topPadding + bottomPadding;
              const estimatedHeight = Math.max(textHeight, 30);
              if (currentY2 + estimatedHeight > pageHeight2 - bottomMargin2) {
                return false;
              }
            }
            return true;
          },
          didDrawCell: (data: any) => {
            if (data.cell.raw && (data.cell.raw as any)._isCodeBlock) {
              const { x, y, width, height } = data.cell;
              const padding = 2;
              const cornerRadius = 4;
              const indexNumber = (data.cell.raw as any)._indexNumber;
              doc.setFont('NotoSans_Condensed-Regular', 'normal');
              doc.setFontSize(12);
              const indexPrefix = `${indexNumber}`;
              const indexWidth = doc.getTextWidth(indexPrefix) + 8;
              doc.setDrawColor(100, 116, 139);
              doc.setLineWidth(0.5);
              doc.setFillColor(15, 23, 42);
              doc.roundedRect(
                x + padding,
                y + padding,
                width - padding * 2,
                height - padding * 2,
                cornerRadius,
                cornerRadius,
                'FD',
              );
              doc.setFillColor(51, 65, 85);
              doc.roundedRect(
                x + padding,
                y + padding,
                indexWidth,
                height - padding * 2,
                cornerRadius,
                cornerRadius,
                'F',
              );
              doc.setFillColor(51, 65, 85);
              doc.rect(
                x + padding + indexWidth - cornerRadius,
                y + padding,
                cornerRadius,
                height - padding * 2,
                'F',
              );
              doc.setTextColor(255, 255, 255);
              const indexTextX = x + padding + 4;
              const textY = y + padding + 8;
              doc.text(indexPrefix, indexTextX, textY);
              const fullText = (data.cell.raw as any).content;
              const codeContent = fullText.substring(`${indexNumber}. `.length);
              const codeTextX = x + padding + indexWidth + 4;
              const availableWidth = width - padding * 2 - indexWidth - 8;
              const lines = doc.splitTextToSize(codeContent, availableWidth);
              let codeTextY = y + padding + 8;
              lines.forEach((line: string) => {
                doc.text(line, codeTextX, codeTextY);
                codeTextY += 4;
              });
            }
            if (
              data.cell.raw &&
              data.cell.raw._isScreenshot &&
              data.cell.raw._screenshotBase64
            ) {
              const { x, y, width, height } = data.cell;
              const imgWidth = data.cell.raw._screenshotWidth || 80;
              const imgHeight = data.cell.raw._screenshotHeight || 80;
              const imgX = x + (width - imgWidth) / 2;
              const imgY = y + (height - imgHeight) / 2;
              data.doc.addImage(
                data.cell.raw._screenshotBase64,
                'PNG',
                imgX,
                imgY,
                imgWidth,
                imgHeight,
              );
            }
          },
        });
        const lastTable2: any =
          (doc as any).lastAutoTable ||
          (doc as any).autoTable?.previous ||
          null;
        if (lastTable2 && lastTable2.finalY) {
          yTable = lastTable2.finalY + 2;
        }
      }
    }

    // No aggregated table rendering here; each issue is rendered above

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
    <div className="min-h-screen overflow-x-hidden">
      <TourGuide
        steps={proofOfEffortTourSteps}
        tourKey={tourKeys.proofOfEffort}
        autoStart={true}
        onTourComplete={() => {
          // noop for now
        }}
        customStyles={defaultTourStyles}
      />

      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Proof of effort toolkit
          </h1>
        </div>

        <div className="flex lg:h-[calc(100vh-8rem)] h-auto lg:flex-row flex-col gap-6 overflow-hidden">
          {/* Left Panel - Document Content */}
          <div
            className="flex-1 bg-white flex flex-col lg:min-h-0 min-h-[50vh] sm:min-h-[60vh] border-2 rounded-xl overflow-hidden"
            style={{ borderColor: '#A2ADF3', minHeight: 0 }}
          >
            {selectedDocument ? (
              <>
                {/* Document Header */}
                <div className="p-4 border-b border-gray-200">
                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePreviousDocument}
                        disabled={currentDocumentIndex === 0}
                        className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MdArrowBack className="w-4 h-4" />
                      </button>
                      <div className="bg-blue-50 px-3 py-1.5 rounded-lg">
                        <h1 className="text-base font-medium text-gray-900">
                          {selectedDocument.name}
                        </h1>
                        <p className="text-xs text-gray-600 mt-1">
                          Generated on {selectedDocument.creationDate}
                        </p>
                      </div>
                      <button
                        onClick={handleNextDocument}
                        disabled={currentDocumentIndex === documents.length - 1}
                        className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MdArrowForward className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {currentDocumentIndex + 1} of {documents.length}
                      </span>
                      <button
                        onClick={handleCloseDocument}
                        className="p-1.5 rounded-full hover:bg-gray-100"
                      >
                        <MdClose className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile Layout (sm and below) */}
                  <div className="md:hidden">
                    <div className="flex flex-col items-center gap-4 px-2">
                      {/* Report name with close button */}
                      <div className="bg-blue-50 px-4 py-3 rounded-lg w-full max-w-xs relative">
                        <h1 className="text-sm font-medium text-gray-900 text-center leading-tight pr-8">
                          {selectedDocument.name}
                        </h1>
                        <p className="text-xs text-gray-600 text-center mt-1 pr-8">
                          Generated on {selectedDocument.creationDate}
                        </p>
                        {/* Close button in top right corner */}
                        <button
                          onClick={handleCloseDocument}
                          className="absolute top-2 right-2 p-1 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm"
                        >
                          <MdClose className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      {/* Navigation arrows */}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={handlePreviousDocument}
                          disabled={currentDocumentIndex === 0}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <MdArrowBack className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                          onClick={handleNextDocument}
                          disabled={
                            currentDocumentIndex === documents.length - 1
                          }
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <MdArrowForward className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>

                      {/* Page info */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-medium">
                          {currentDocumentIndex + 1} of {documents.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Viewer */}
                <div
                  className="flex-1 overflow-hidden"
                  style={{
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {pdfViewerUrl && (
                    <div className="flex-1 w-full overflow-hidden">
                      <iframe
                        src={pdfViewerUrl}
                        className="w-full h-full border-0"
                        title={selectedDocument.name}
                        style={{
                          maxWidth: '100%',
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          transform: 'scale(1)',
                          transformOrigin: 'top left',
                          flex: 1,
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Default Content when no document is selected */
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center max-w-md mx-auto px-6">
                  <div className="pb-8">
                    <FiFile className="w-16 h-16 text-blue-600 mx-auto" />
                  </div>
                  <h2 className="text-2xl font-medium text-gray-900 mb-6">
                    Legal Docs for Your Team
                  </h2>
                  <p className="text-gray-600 mb-8">
                    The Proof of Effort Toolkit compiles key documents showing
                    your commitment to accessibility. If your website's
                    accessibility is ever challenged, you'll have the evidence
                    needed to respond with confidence.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      className={`poe-send-email-button inline-flex items-center gap-2 px-4 py-2 border border-[#445AE7] rounded-md transition-colors ${
                        isDownloadingZip || isEmailSending
                          ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                          : 'text-white bg-[#445AE7] hover:bg-[#3a4fd1]'
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
                  </div>
                  <div className="poe-documents-count text-sm text-gray-500 mt-3">
                    {documents.length} Documents
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Document List */}
          <div
            className="lg:w-96 w-full lg:h-auto h-auto p-6 flex flex-col border-2 rounded-xl lg:flex-shrink-0"
            style={{ backgroundColor: '#e9ecfb', borderColor: '#A2ADF3' }}
          >
            {/* Document Cards */}
            <div className="space-y-3 flex-grow">
              {documents.map((document, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg p-4 shadow-sm border-2"
                  style={{ borderColor: '#A2ADF3' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FiFile className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {document.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {document.creationDate}
                          {document.type === 'monthly-report' &&
                            isProcessingReport && (
                              <span className="text-blue-600 italic ml-2">
                                Processing...
                              </span>
                            )}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDropdownToggle(index);
                        }}
                      >
                        <MdMoreVert
                          className="w-4 h-4"
                          style={{ color: '#445AE7' }}
                        />
                      </button>

                      {/* Dropdown menu */}
                      {openDropdownIndex === index && (
                        <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32">
                          <button
                            onClick={() =>
                              handleDropdownAction(document, 'view')
                            }
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={
                              (document.type === 'monthly-report' &&
                                isProcessingReport) ||
                              isDownloadingZip ||
                              isEmailSending
                            }
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              handleDropdownAction(document, 'download')
                            }
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={
                              (document.type === 'monthly-report' &&
                                isProcessingReport) ||
                              isDownloadingZip ||
                              isEmailSending
                            }
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Download All Button */}
            <div className="mt-6 pt-12 border-t border-gray-200">
              <button
                className={`poe-download-zip-button w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md transition-colors ${
                  isDownloadingZip || isEmailSending
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'hover:bg-blue-700'
                }`}
                onClick={handleDownloadZip}
                disabled={isDownloadingZip || isEmailSending}
              >
                {isDownloadingZip ? (
                  <>
                    <CircularProgress size={16} />
                    Downloading...
                  </>
                ) : (
                  <>
                    <MdFileDownload className="w-4 h-4" />
                    Download
                  </>
                )}
              </button>
              <div className="poe-documents-count text-sm text-gray-500 mt-3 text-center">
                {documents.length} Documents
              </div>
            </div>
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
