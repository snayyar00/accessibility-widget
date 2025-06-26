import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import path from 'path';
import fs from 'fs';

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

export function generateAccessibilityReportPDF(
  reportData: any, 
  url: string, 
  widgetStatus: string = 'false'
): Buffer {
  const doc = new jsPDF();
  

  try {
    const logoPath = path.join(process.cwd(), 'email-templates', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath);
      const logoBase64 = logoData.toString('base64');
      doc.addImage(logoBase64, 'PNG', 8, 6, 50, 18, undefined, 'FAST');
    } else {
      console.warn('Logo not found at:', logoPath);
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

  // Check if widgetInfo exists and has the correct result for bonus text
  const hasWidgetInfo = reportData.widgetInfo?.result === 'WebAbility' || 
                       reportData.scriptCheckResult === 'Web Ability';
  
  if (hasWidgetInfo) {
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(43, 168, 74);
    const bonusText = `(Base: ${baseScore}% + ${WEBABILITY_SCORE_BONUS}% WebAbility Bonus)`;
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

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerText = `Generated by WebAbility.io - Page ${i} of ${pageCount}`;
    const pageWidth = doc.internal.pageSize.width;
    const textWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - textWidth) / 2, doc.internal.pageSize.height - 10);
  }

  return Buffer.from(doc.output('arraybuffer'));
} 