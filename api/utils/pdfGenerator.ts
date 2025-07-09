import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import path from 'path';
import fs from 'fs';
import getWidgetSettings from '../utils/getWidgetSettings';
import { translateText, translateMultipleTexts, LANGUAGES } from '../utils/translator';

const WEBABILITY_SCORE_BONUS = 45;
const MAX_TOTAL_SCORE = 95;

// Helper function to calculate enhanced scores
function calculateEnhancedScore(baseScore: number) {
  const enhancedScore = baseScore + WEBABILITY_SCORE_BONUS;
  return Math.min(enhancedScore, MAX_TOTAL_SCORE);
}


function extractIssuesFromReport(report: any) {
  const issues: any[] = []

  
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


  if (issues.length === 0 && report?.htmlcs) {
    const processLegacyIssues = (issueArray: any[], type: string) => {
      if (Array.isArray(issueArray)) {
        issueArray.forEach(issue => {
          const impact = mapIssueToImpact(issue.message, issue.code)
          issues.push({
            ...issue,
            impact,
            source: 'HTML_CS',
            functionality: 'General',
            type
          })
        })
      }
    }

    processLegacyIssues(report.htmlcs.errors, 'error')
    processLegacyIssues(report.htmlcs.warnings, 'warning')
    processLegacyIssues(report.htmlcs.notices, 'notice')
  }

  return issues;
}

function mapIssueToImpact(message: string, code: any) {
  if (!message && !code) return 'moderate'

  const lowerMsg = (message || '').toLowerCase()
  const lowerCode = (code || '').toLowerCase()


  if (
    lowerMsg.includes('color contrast') ||
    lowerMsg.includes('minimum contrast') ||
    lowerCode.includes('1.4.3') ||
    (lowerMsg.includes('aria hidden') && lowerMsg.includes('focusable')) ||
    lowerMsg.includes('links must be distinguishable')
  ) {
    return 'critical'
  }


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

export async function generateAccessibilityReportPDF(
  reportData: any,
  url: string,
  widgetStatus: string = 'false',
  language: string = 'en'
): Promise<Buffer> {
  const doc = new jsPDF();

  // Fetch widget settings (logo, URLs)
  const { logoImage, logoUrl, accessibilityStatementLinkUrl } = await getWidgetSettings(url);
  console.log("I am called ",logoImage,logoUrl,accessibilityStatementLinkUrl);
  // Prepare static texts for translation
  const staticTexts = [
    'Compliant',
    'Your website meets the basic requirements for accessibility.',
    'Partially Compliant',
    'Your website meets some accessibility requirements but needs improvement.',
    'Non-compliant',
    'Your website needs significant accessibility improvements.',
    'Mild',
    'Moderate',
    'Severe',
    'Accessibility Score',
    'Scan Results for',
    'Total Errors',
    'Issue',
    'Message',
    'Context',
    'Fix',
    'Accessibility Statement'
  ];
  const [
    compliantText,
    compliantMsg,
    partialText,
    partialMsg,
    nonCompliantText,
    nonCompliantMsg,
    mildText,
    moderateText,
    severeText,
    scoreTextLabel,
    scanResultsLabel,
    totalErrorsLabel,
    issueLabel,
    messageLabel,
    contextLabel,
    fixLabel,
    accessibilityStatementLabel
  ] = await translateMultipleTexts(staticTexts, language);

  // Logo loading (Node.js: base64)
  let logoBase64 = null;
  if (logoImage && logoImage.startsWith('data:image')) {
    // Already base64
    logoBase64 = logoImage.split(',')[1];
  } else if (logoImage && fs.existsSync(logoImage)) {
    logoBase64 = fs.readFileSync(logoImage, { encoding: 'base64' });
  } else {
    // fallback: try to load from default path
    const fallbackLogoPath = path.join(process.cwd(), 'email-templates', 'logo.png');
    if (fs.existsSync(fallbackLogoPath)) {
      logoBase64 = fs.readFileSync(fallbackLogoPath, { encoding: 'base64' });
    }
  }

  try {
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 8, 6, 50, 18, undefined, 'FAST');
    } else {
      console.warn('Logo not found for PDF generation.');
    }
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
  }

  const baseScore = reportData?.score || 0;
  const isWebAbilityEnabled = widgetStatus === 'Web Ability';
  const enhancedScore = isWebAbilityEnabled ? calculateEnhancedScore(baseScore) : baseScore;

  const issues = extractIssuesFromReport(reportData);
  const criticalCount = issues.filter(i => i.impact === 'critical').length;
  const seriousCount = issues.filter(i => i.impact === 'serious').length;
  const moderateCount = issues.filter(i => i.impact === 'moderate').length;


  let status, message, statusColor: [number, number, number];
  if (enhancedScore >= 80) {
    status = compliantText;
    message = compliantMsg;
    statusColor = [43, 168, 74]; // green
  } else if (enhancedScore >= 50) {
    status = partialText;
    message = partialMsg;
    statusColor = [243, 182, 31]; // yellow
  } else {
    status = nonCompliantText;
    message = nonCompliantMsg;
    statusColor = [255, 27, 28]; // red
  }

  // --- HEADER: Colored background ---
  doc.setFillColor(21, 101, 192); // dark blue background
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F');

  // --- LOGO in rounded white box ---
  let logoBottomY = 0;
  if (logoBase64) {
    // Make the logo and container bigger
    const maxWidth = 48, maxHeight = 36;
    let drawWidth = maxWidth, drawHeight = maxHeight;
    // Draw logo at (0,3)
    const logoX = 0;
    const logoY = 3;
    const padding = 14;
    const containerX = logoX - padding;
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
    doc.addImage(logoBase64, 'PNG', logoX, logoY, drawWidth, drawHeight);
    // No clickable link in Node.js PDF
    logoBottomY = Math.max(logoY + drawHeight, containerY + containerH);
  }

  // --- SCAN RESULTS CONTAINER ---
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

  // --- SCAN RESULTS LABEL + URL ---
  let textY = containerY + 13;
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  let label = scanResultsLabel;
  const labelWidth = doc.getTextWidth(label);
  const urlWidth = doc.getTextWidth(url);
  const totalWidth = labelWidth + urlWidth;
  const startX = 105 - totalWidth / 2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(label, startX, textY, { align: 'left' });
  doc.setFont('helvetica', 'bold');
  doc.text(url, startX + labelWidth, textY, { align: 'left' });
  doc.setFont('helvetica', 'normal');

  // --- COMPLIANCE STATUS ---
  textY += 12;
  doc.setFontSize(20);
  doc.setTextColor(...statusColor);
  doc.setFont('helvetica', 'bold');
  doc.text(status, 105, textY, { align: 'center' });

  textY += 9;
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(message, 105, textY, { align: 'center' });

  textY += 9;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${new Date().toDateString()}`, 105, textY, { align: 'center' });

  // Accessibility Score
  textY += 10;
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  const scoreLabel = `${scoreTextLabel}: `;
  doc.text(scoreLabel, 8, textY);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const scoreText = `${enhancedScore}%`;
  doc.text(scoreText, 12 + doc.getTextWidth(scoreLabel), textY);

  // Check if widgetInfo exists and has the correct result for bonus text
  const hasWidgetInfo = reportData.widgetInfo?.result === 'WebAbility' || 
                       reportData.scriptCheckResult === 'Web Ability';
  
  if (hasWidgetInfo) {
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(43, 168, 74);
    const bonusText = `(Base: ${baseScore}% + ${WEBABILITY_SCORE_BONUS}% WebAbility Bonus)`;
    doc.text(bonusText, 14 + doc.getTextWidth(scoreLabel + scoreText), textY);
  }

  // Issue counts
  textY += 12;
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.setFont('Helvetica', 'normal');
  doc.text(`${totalErrorsLabel}: ${issues.length}`, 8, textY);

  textY += 8;

  // --- SUMMARY CIRCLES (Total Errors and Score) ---
  const circleY = textY + 25;
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
  doc.text(totalErrorsLabel, circle1X, circleY + circleRadius + 9, {
    align: 'center',
  });

  // Circle 2: Score (filled lighter blue)
  doc.setDrawColor(33, 150, 243);
  doc.setLineWidth(1.5);
  doc.setFillColor(33, 150, 243);
  doc.circle(circle2X, circleY, circleRadius, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  const scoreTextCircle = `${Math.round(enhancedScore)}%`;
  doc.text(scoreTextCircle, circle2X, circleY, {
    align: 'center',
    baseline: 'middle',
  });
  doc.setFontSize(10);
  doc.setTextColor(21, 101, 192);
  doc.setFont('helvetica', 'normal');
  doc.text(scoreTextLabel, circle2X, circleY + circleRadius + 9, {
    align: 'center',
  });

  // --- SEVERITY SUMMARY BOXES ---
  const yStart = circleY + circleRadius + 30;
  const total = issues.length;
  const counts = {
    critical: issues.filter((i) => i.impact === 'critical').length,
    serious: issues.filter((i) => i.impact === 'serious').length,
    moderate: issues.filter((i) => i.impact === 'moderate').length,
  };
  const summaryBoxes = [
    {
      label: severeText,
      count: counts.critical + counts.serious,
      color: [255, 204, 204],
    },
    { label: moderateText, count: counts.moderate, color: [187, 222, 251] },
    {
      label: mildText,
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

  // Set the start Y for the issues table after the summary boxes
  const yTable = yStart + 40;

  // --- TRANSLATE ISSUES ---
  const translatedIssues = await translateText(issues, language);

  // Helper to ensure array
  const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

  // Build the rows
  let tableBody: any[] = [];
  translatedIssues.forEach((issue, issueIdx) => {
    // Add header row for each issue
    tableBody.push([
      {
        content: issueLabel,
        colSpan: 2,
        styles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 14,
          halign: 'center',
          cellPadding: 8,
        },
      },
      {
        content: messageLabel,
        colSpan: 2,
        styles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 14,
          halign: 'center',
          cellPadding: 8,
        },
      },
    ]);
    // Row 1: Issue + Message
    tableBody.push([
      {
        content: `${issue.code ? `${issue.code} (${issue.impact})` : ''}`,
        colSpan: 2,
        styles: {
          fontStyle: 'bold',
          fontSize: 12,
          textColor: [30, 41, 59],
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
          textColor: [30, 41, 59],
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
    // Contexts block
    const contexts = toArray(issue.context).filter(Boolean);
    if (contexts.length > 0) {
      tableBody.push([
        {
          content: contextLabel,
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
        const combinedContent = `${index + 1}. ${ctx}`;
        tableBody.push([
          {
            content: combinedContent,
            colSpan: 4,
            styles: {
              font: 'courier',
              fontSize: 10,
              textColor: [15, 23, 42],
              fillColor: [255, 255, 255],
              halign: 'left',
              valign: 'top',
              cellPadding: 8,
              lineWidth: 0,
              minCellHeight: Math.max(20, Math.ceil(combinedContent.length / 50) * 6),
              overflow: 'linebreak',
            },
          },
        ]);
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
    // Fixes block
    const fixes = toArray(issue.recommended_action);
    if (fixes.length > 0 && fixes.some((f) => !!f)) {
      tableBody.push([
        {
          content: fixLabel,
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
      const filteredFixes = fixes.filter(Boolean);
      filteredFixes.forEach((fix, fixIdx) => {
        tableBody.push([
          {
            content: `${fixIdx + 1}. ${fix}`,
            colSpan: 4,
            styles: {
              fontStyle: 'normal',
              fontSize: 11,
              textColor: [0, 0, 0],
              halign: 'left',
              cellPadding: { top: 10, right: 8, bottom: 10, left: 8 },
              fillColor: [255, 255, 255],
              lineWidth: 0,
            },
          },
        ]);
        if (fixIdx < filteredFixes.length - 1) {
          tableBody.push([
            {
              content: '',
              colSpan: 4,
              styles: {
                cellPadding: 0,
                fillColor: [255, 255, 255],
                lineWidth: 0,
                minCellHeight: 6,
              },
            },
          ]);
        }
      });
    }
  });

  // Render the table
  autoTable(doc, {
    startY: yTable,
    margin: { left: 15, right: 15, top: 0, bottom: 15 },
    head: [],
    body: tableBody,
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
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.height - 10;
    // Accessibility Statement link (if available)
    if (accessibilityStatementLinkUrl) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(33, 150, 243);
      doc.text(accessibilityStatementLabel, 15, footerY);
      // No clickable link in Node.js PDF, but text is shown
    }
    // Page number footer (centered)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerText = `Generated by WebAbility.io - Page ${i} of ${pageCount}`;
    const pageWidth = doc.internal.pageSize.width;
    const textWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - textWidth) / 2, footerY);
  }

  return Buffer.from(doc.output('arraybuffer'));
}