import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import path from 'path';
import fs from 'fs';
import getWidgetSettings from '../utils/getWidgetSettings';
import sharp from 'sharp';
import { deduplicateIssuesByMessage } from '../utils/translator';
import axios from 'axios';
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
            functionality: funcGroup.FunctionalityName,
            screenshotUrl: error.screenshotUrl
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
            functionality: funcGroup.FunctionalityName,
            screenshotUrl: error.screenshotUrl
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
            functionality: funcGroup.FunctionalityName,
            screenshotUrl: error.screenshotUrl
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

  async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      // Try to detect image type from URL or response headers
      let mimeType = 'image/png';
      if (response.headers['content-type']) {
        mimeType = response.headers['content-type'];
      } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (url.endsWith('.gif')) {
        mimeType = 'image/gif';
      }
      return `data:${mimeType};base64,${base64}`;
    } catch (e) {
      console.warn('Failed to fetch image for PDF:', url, e);
      return null;
    }
  }
  
  // Add this helper function to get image dimensions from base64
  async function getImageDimensions(base64Data: string): Promise<{ width: number; height: number }> {
    try {
      // Remove the data URL prefix if present
      const base64 = base64Data.split(',')[1] || base64Data;
      const buffer = Buffer.from(base64, 'base64');
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 120,
        height: metadata.height || 80,
      };
    } catch (e) {
      // Fallback dimensions if image fails to load
      return { width: 120, height: 80 };
    }
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

  // Constants for scoring
  const WEBABILITY_SCORE_BONUS = 45;
  const MAX_TOTAL_SCORE = 95;
  const issues = extractIssuesFromReport(reportData);

  

  // Calculate score and status
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
    message = 'Your website is partially accessible. Some improvements are needed.';
    statusColor = [202, 138, 4]; // yellow-600
  } else {
    status = 'Not Compliant';
    message = 'Your website needs significant accessibility improvements.';
    statusColor = [220, 38, 38]; // red-600
  }

  // Translate static and dynamic texts
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
    translatedTotalErrors
  ]=
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
      'Total Errors'
    ];

  status = translatedStatus;

  // Draw header background
  doc.setFillColor(21, 101, 192); // dark blue
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F');

  let logoBottomY = 0;

  // Draw logo if available
  //console.log("url of image is ",logoImage);


 let logoBase64 = null;
let logopath: string | undefined;

 if (logoImage && logoImage.startsWith('data:image')) {
   // Already base64
   logoBase64 = logoImage.split(',')[1];
   logopath= logoImage.split(',')[1];
 } else if (logoImage && fs.existsSync(logoImage)) {
   logoBase64 = fs.readFileSync(logoImage, { encoding: 'base64' });
   logopath= fs.readFileSync(logoImage, { encoding: 'base64' });
 } else {
   // fallback: try to load from default path
   const fallbackLogoPath = path.join(process.cwd(), 'email-templates', 'logo.png');
   logopath=fallbackLogoPath;
   if (fs.existsSync(fallbackLogoPath)) {
     logoBase64 = fs.readFileSync(fallbackLogoPath, { encoding: 'base64' });
   }
 }
 try {
   if (logoBase64) {


    const image = sharp(logopath); 

    const maxWidth = 48,
    maxHeight = 36; // increased size for a bigger logo
      // Get metadata (dimensions)
      const metadata = await image.metadata();
      let drawWidth = metadata.width || maxWidth;
      let drawHeight = metadata.height || maxHeight;
   
   // console.log("drawWidth,drawHeight",drawWidth,drawHeight);
   const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
   drawWidth *= scale;
   drawHeight *= scale;

  const logoX = 0;
  const logoY = 3;

  const padding = 14;
  const containerX = logoX - padding;
  // Keep the container as before, do not move it up
  const containerYOffset = 10;
  const containerY = logoY - padding - containerYOffset;
  const containerW = drawWidth + 2 * padding - 10;
  const containerH = drawHeight + 2 * padding;
  logoBottomY = containerY + containerH;
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
   } else {
     console.warn('Logo not found for PDF generation.');
   }
 } catch (error) {
   console.warn('Could not add logo to PDF:', error);
 }
  // Draw main info container
  const containerWidth = 170;
  const containerHeight = 60;
  const containerX = 105 - containerWidth / 2;
  const containerY = (logoBottomY || 0) + 10;

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
    'FD'
  );

  // Draw text inside container
  let textY = containerY + 13;
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);

  let label = translatedLabel;
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

  textY += 12;
  doc.setFontSize(20);
  doc.setTextColor(...statusColor);
  doc.setFont('helvetica', 'bold');
  doc.text(status, 105, textY, { align: 'center' });

  message = translatedMessage;
  textY += 9;
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(message, 105, textY, { align: 'center' });

  textY += 9;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${new Date().toDateString()}`, 105, textY, { align: 'center' });

  // Draw summary circles
  const circleY = containerY + containerHeight + 25;
  const circleRadius = 15;
  const centerX = 105;
  const gap = 40;
  const circle1X = centerX - circleRadius - gap / 2;
  const circle2X = centerX + circleRadius + gap / 2;

  // Total Errors
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
  doc.text(translatedTotalErrors, circle1X, circleY + circleRadius + 9, {
    align: 'center',
  });

  // Score
  doc.setDrawColor(33, 150, 243);
  doc.setLineWidth(1.5);
  doc.setFillColor(33, 150, 243);
  doc.circle(circle2X, circleY, circleRadius, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  const scoreText = `${Math.round(enhancedScore)}%`;
  doc.text(scoreText, circle2X, circleY, {
    align: 'center',
    baseline: 'middle',
  });

  doc.setFontSize(10);
  doc.setTextColor(21, 101, 192);
  doc.setFont('helvetica', 'normal');
  doc.text(translatedScore, circle2X, circleY + circleRadius + 9, {
    align: 'center',
  });

  // Severity summary boxes
  const yStart = circleY + circleRadius + 30;
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
    { label: translatedModerate, count: counts.moderate, color: [187, 222, 251] },
    {
      label: translatedMild,
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
  
  const FilteredIssues = await deduplicateIssuesByMessage(issues);
  const translatedIssues = FilteredIssues;

  // After fetching base64
  for (const issue of translatedIssues) {
    if (issue.screenshotUrl && !issue.screenshotBase64) {
      issue.screenshotBase64 = await fetchImageAsBase64(issue.screenshotUrl);
    
if(issue.screenshotBase64){      console.log("issue.screenshotUrl",issue.screenshotUrl);
}
      // console.log('Fetched base64 for', issue.screenshotUrl, '->', !!issue.screenshotBase64);
    }
  }

  for (const issue of translatedIssues) {
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
        content: translatedIssueMessage,
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
      
      tableBody.push([
        {
          content: '',
          colSpan: 4,
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
  }

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
      if (data.cell.raw && data.cell.raw._isScreenshot && data.cell.raw._screenshotBase64) {
        const { x, y, width, height } = data.cell;
        const imgWidth = data.cell.raw._screenshotWidth || 80;
        const imgHeight = data.cell.raw._screenshotHeight || 80;
        const imgX = x + (width - imgWidth) / 2;
        const imgY = y + (height - imgHeight) / 2;
        data.doc.addImage(data.cell.raw._screenshotBase64, 'PNG', imgX, imgY, imgWidth, imgHeight);
      }
      if (data.cell.raw && data.cell.raw._isScreenshot) {
        console.log('didDrawCell for screenshot', data.cell.raw._screenshotBase64 ? 'has base64' : 'no base64');
      }
    },
  });

  // Footer: Accessibility Statement link
  if (accessibilityStatementLinkUrl) {
    const totalPages = (doc as any).internal.getNumberOfPages();
    const footerY = doc.internal.pageSize.getHeight() - 10;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(33, 150, 243);
      doc.text('Accessibility Statement', 15, footerY);
      doc.link(
        15,
        footerY - 3,
        doc.getTextWidth('Accessibility Statement'),
        4,
        {
          url: accessibilityStatementLinkUrl,
          target: '_blank',
        }
      );
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}