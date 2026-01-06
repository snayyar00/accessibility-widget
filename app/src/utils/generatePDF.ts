import getWidgetSettings from '@/utils/getWidgetSettings';
import {
  translateText,
  translateMultipleTexts,
  LANGUAGES,
  deduplicateIssuesByMessage,
  isCodeCompliant,
  CURATED_WCAG_CODES,
} from '@/utils/translator';
import criticalIconImage from '@/assets/images/critical_icon.png';
import moderateIconImage from '@/assets/images/moderate_icon.png';
import mildIconImage from '@/assets/images/mild_icon.png';
import oneIssuesIconImage from '@/assets/images/1_issues_icon.png';
import twoIssuesIconImage from '@/assets/images/2_issues_icon.png';
import threeIssuesIconImage from '@/assets/images/3_issues_icon.png';
import greenSuccessImage from '@/assets/images/green_success.png';
import messageIconImage from '@/assets/images/message_icon.png';
import autoTable, { __createTable, __drawTable } from 'jspdf-autotable';

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
async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  
  try {
    // Try fetch first
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          resolve(reader.result as string);
        } catch (e) {
          console.warn('Error processing image data:', e);
          resolve(null);
        }
      };
      reader.onerror = () => {
        console.warn('FileReader error for image:', url);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    // If fetch fails (likely CORS), try backend proxy
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      if (backendUrl) {
        const { getAuthenticationCookie } = await import('@/utils/cookie');
        const token = getAuthenticationCookie();
        const proxyResponse = await fetch(`${backendUrl}/proxy-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ imageUrl: url }),
        });
        
        if (proxyResponse.ok) {
          const data = await proxyResponse.json();
          if (data.base64) {
            return data.base64.startsWith('data:') ? data.base64 : `data:image/png;base64,${data.base64}`;
          }
        }
      }
    } catch (proxyError) {
      // Fall through to canvas approach
    }

    // Fallback to canvas approach
    try {
      return await new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        let timeoutId: NodeJS.Timeout | null = null;
        
        img.onload = () => {
          if (timeoutId) clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve(null);
          }
        };
        
        img.onerror = () => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(null);
        };
        
        timeoutId = setTimeout(() => resolve(null), 10000);
        img.src = url;
      });
    } catch {
      return null;
    }
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

export const generatePDF = async (
  reportData: {
    score: number;
    widgetInfo: { result: string };
    scriptCheckResult?: string;
    url: string;
  },
  currentLanguage: string,
  domain?: string,
  organizationName: string = 'WebAbility',
  organizationLogoUrl?: string,
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
  
  // Prioritize widget logo first - check if widget logo exists and is not the fallback
  const WIDGET_FALLBACK_LOGO = '/images/logo.png';
  const hasValidWidgetLogo = logoImage && logoImage !== WIDGET_FALLBACK_LOGO;
  const hasValidWidgetLogoUrl = logoUrl && logoUrl.trim() !== '';
  
  // Use widget logo if available, otherwise fall back to organization logo
  const finalLogoImage = hasValidWidgetLogo ? logoImage : (organizationLogoUrl || logoImage);
  const finalLogoUrl = hasValidWidgetLogoUrl ? logoUrl : (organizationLogoUrl || logoUrl || undefined);
  
  const WEBABILITY_SCORE_BONUS = 45;
  const MAX_TOTAL_SCORE = 95;
  const issues = extractIssuesFromReport(reportData);

  const baseScore = reportData.score || 0;
  const scriptCheckResult = reportData.scriptCheckResult;
  const widgetInfoResult = reportData.widgetInfo?.result;
  // Check both scriptCheckResult and widgetInfo.result for Web Ability
  // Handle variations: 'Web Ability', 'WebAbility', etc.
  const hasWebAbility = 
    scriptCheckResult === 'Web Ability' || 
    widgetInfoResult === 'Web Ability' ||
    scriptCheckResult === 'WebAbility' ||
    widgetInfoResult === 'WebAbility' ||
    scriptCheckResult === 'true' ||
    widgetInfoResult === 'true';

    console.log('hasWebAbility', scriptCheckResult, widgetInfoResult, hasWebAbility);
  const enhancedScore = hasWebAbility
    ? Math.min(baseScore + WEBABILITY_SCORE_BONUS, MAX_TOTAL_SCORE)
    : baseScore;

  let status: string, message: string, statusColor: [number, number, number];
  let statusKey: 'compliant' | 'partial' | 'non';
  if (enhancedScore >= 80) {
    statusKey = 'compliant';
    status = 'Compliant';
    message = 'Your website is highly accessible. Great job!';
    statusColor = [22, 163, 74]; // green-600
  } else if (enhancedScore >= 50) {
    statusKey = 'partial';
    status = 'Partially Compliant';
    message =
      'Your website is partially accessible.\nSome improvements are needed.';
    statusColor = [202, 138, 4]; // yellow-600
  } else {
    statusKey = 'non';
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
      `✓ ${organizationName} widget is actively protecting your site`,
      '✓ Automated accessibility fixes are applied',
      ' CRITICAL ACCESSIBILITY VIOLATIONS DETECTED',
      'Your website may face legal action and lose customers',
      'IMMEDIATE RISKS TO YOUR BUSINESS:',
      '• Potential lawsuits under ADA compliance regulations',
      '• Loss of 15% of potential customers (disabled users)',
      '• Google SEO penalties reducing search rankings',
      '• Damage to brand reputation and customer trust',
      'TIME-SENSITIVE ACTION REQUIRED:',
      `✓ ${organizationName} can fix most issues automatically`,
      '✓ Instant compliance improvement',
      '✓ Protect your business from legal risks TODAY',
      'Accessibility Statement',
      'WCAG 2.1 AA Compliance Issues for',
      'Auto-Fixed',
      ' Ready to use',
      'Need Action',
      '⚠ Review required',
      'Fix with AI',
      `use ${organizationName.toLowerCase()} to fix`,
      'Critical compliance gaps exposing your business to legal action',
    ],
    currentLanguage,
  );

  status = translatedStatus;

  // Set background color for all pages
  const backgroundColor: [number, number, number] = [238, 245, 255]; // White background
  doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
  doc.rect(
    0,
    0,
    doc.internal.pageSize.getWidth(),
    doc.internal.pageSize.getHeight(),
    'F',
  );

  // Remove old dark header bar; design now uses a clean light background

  let logoBottomY = 0;

  if (finalLogoImage) {
    let imageLoadError = false;
    let logoBase64: string | null = null;
    let img: HTMLImageElement | null = null;
    let logoToTry = finalLogoImage;
    let fallbackLogo: string | null = null;

    // Set fallback logo based on which logo we're using
    if (hasValidWidgetLogo && finalLogoImage === logoImage) {
      // Using widget logo - set organization logo as fallback if available
      if (organizationLogoUrl) {
        fallbackLogo = organizationLogoUrl;
      }
    } else if (organizationLogoUrl && finalLogoImage === organizationLogoUrl) {
      // Using organization logo - set widget logo as fallback only if it's valid (not fallback)
      if (hasValidWidgetLogo) {
        fallbackLogo = logoImage;
      }
    }

    try {
      // Check if it's a cross-origin URL (http/https) - use fetch to avoid CORS issues
      if (logoToTry.startsWith('http://') || logoToTry.startsWith('https://')) {
        // For cross-origin URLs, use fetch to avoid CORS issues
        logoBase64 = await fetchImageAsBase64(logoToTry);
        if (!logoBase64) {
          // Fetch failed - try fallback logo if available
          if (fallbackLogo && fallbackLogo !== logoToTry) {
            logoToTry = fallbackLogo;
            logoBase64 = await fetchImageAsBase64(fallbackLogo);
            if (logoBase64) {
              const base64Img = new Image();
              base64Img.src = logoBase64;
              await new Promise<void>((resolve, reject) => {
                let settled = false;
                const TIMEOUT_MS = 5000;
                const cleanup = () => {
                  base64Img.onload = null;
                  base64Img.onerror = null;
                };
                const timeoutId = setTimeout(() => {
                  if (!settled) {
                    settled = true;
                    cleanup();
                    reject(new Error('Fallback logo load timed out'));
                  }
                }, TIMEOUT_MS);
                base64Img.onload = () => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(timeoutId);
                  cleanup();
                  resolve();
                };
                base64Img.onerror = () => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(timeoutId);
                  cleanup();
                  reject(new Error('Fallback logo failed to load'));
                };
              });
              img = base64Img;
            } else {
              // Fallback also failed
              imageLoadError = true;
            }
          } else {
            // No fallback available
            imageLoadError = true;
          }
        } else {
          // Create image from base64 to get dimensions
          const base64Img = new Image();
          base64Img.src = logoBase64;
          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const TIMEOUT_MS = 5000;

            const cleanup = () => {
              base64Img.onload = null;
              base64Img.onerror = null;
            };

            const timeoutId = setTimeout(() => {
              if (!settled) {
                settled = true;
                cleanup();
                reject(new Error('Logo image load timed out'));
              }
            }, TIMEOUT_MS);

            base64Img.onload = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              cleanup();
              resolve();
            };

            base64Img.onerror = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              cleanup();
              reject(new Error('Logo image failed to load'));
            };
          });
          img = base64Img;
        }
      } else {
        // Data URL or local path - use direct image loading
        const directImg = new Image();
        directImg.src = logoToTry;
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const TIMEOUT_MS = 5000;

          const cleanup = () => {
            directImg.onload = null;
            directImg.onerror = null;
          };

          const timeoutId = setTimeout(() => {
            if (!settled) {
              settled = true;
              cleanup();
              imageLoadError = true;
              reject(new Error('Logo image load timed out'));
            }
          }, TIMEOUT_MS);

          directImg.onload = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            resolve();
          };

          directImg.onerror = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            imageLoadError = true;
            reject(new Error('Logo image failed to load'));
          };
        });
        img = directImg;
      }
    } catch (err) {
      logoBottomY = 0;
      imageLoadError = true;
    }

    if (!imageLoadError && img) {
      // Make the logo and container bigger
      const maxWidth = 48,
        maxHeight = 36; // increased size for a bigger logo
      let drawWidth = img.width,
        drawHeight = img.height;
      const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
      drawWidth *= scale;
      drawHeight *= scale;

      // Logo position - top left corner with minimal padding
      const logoPadding = 8; // Reduced padding from top and left edges
      const logoX = logoPadding;
      const logoY = logoPadding;

      // Add logo image - use base64 if available (for cross-origin), otherwise use img element
      try {
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', logoX, logoY, drawWidth, drawHeight);
        } else if (img) {
          doc.addImage(img, 'PNG', logoX, logoY, drawWidth, drawHeight);
        }
      } catch (addImageError) {
      }

      if (finalLogoUrl) {
        doc.link(logoX, logoY, drawWidth, drawHeight, {
          url: finalLogoUrl,
          target: '_blank',
        });
      }

      logoBottomY = logoY + drawHeight
    }
  }

  // --- HEADER AREA (Figma-aligned) ---
  const pageWidth = doc.internal.pageSize.getWidth();
  // Adjust header position to align with logo row
  const headerTopY = Math.max(logoBottomY || 0, 30) + 5; // Ensure minimum spacing from top

  // Date and scanned URL text positioned at top right corner of the page
  const scannedHost = (() => {
    try {
      return new URL(reportData.url).hostname || reportData.url;
    } catch {
      return reportData.url;
    }
  })();
  doc.setFont('NotoSans_Condensed-Regular');
  doc.setFontSize(9);
  // Set date color to #A2ADF3
  doc.setTextColor(162, 173, 243);
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
  // Position at top right corner with reduced padding (moved further right)
  const topRightPadding = 12; // Reduced padding to move further right
  const topRightY = 10; // Fixed position from top
  doc.text(`${formattedDate}`, pageWidth - topRightPadding, topRightY, {
    align: 'right',
  });
  // Reset color for scanner info
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${translatedLabel}${scannedHost}`,
    pageWidth - topRightPadding,
    topRightY + 6,
    {
      align: 'right',
    },
  );

  // Compliance status - positioned directly under the WebAbility logo
  const cardX = 8; // Align with logo left edge (logoPadding)
  const cardY = (logoBottomY || 0) + 14; // Moved down to position entire section lower

  // Circular progress indicator with status-specific styling - Figma design
  const badgeCX = cardX + 15; // Position on the left side
  const badgeCY = cardY + 15; // Centered position for larger badge
  const badgeR = 12; // Larger radius to match Figma design

  // Determine colors and icon based on status
  let outerRingColor: [number, number, number];
  let innerFillColor: [number, number, number];
  let iconColor: [number, number, number];
  let progressPercentage: number;

  if (statusKey === 'compliant') {
    outerRingColor = [34, 197, 94]; // Bright green ring (green-500)
    innerFillColor = [240, 253, 244]; // Light green fill (green-50)
    iconColor = [34, 197, 94]; // Bright green checkmark (green-500)
    progressPercentage = 0.95; // 95% filled
  } else if (statusKey === 'partial') {
    outerRingColor = [202, 138, 4]; // yellow-600
    innerFillColor = [254, 252, 232]; // yellow-50
    iconColor = [245, 158, 11]; // yellow-500
    progressPercentage = 0.65; // 65% filled
  } else {
    // Not Compliant
    outerRingColor = [220, 38, 38]; // red-600
    innerFillColor = [254, 242, 242]; // red-50
    iconColor = [239, 68, 68]; // red-500
    progressPercentage = 0.25; // 25% filled
  }

  // Draw outer ring
  doc.setDrawColor(...outerRingColor);
  doc.setLineWidth(3.2);
  doc.circle(badgeCX, badgeCY, badgeR, 'S');

  // Draw inner fill
  doc.setFillColor(...innerFillColor);
  doc.circle(badgeCX, badgeCY, badgeR - 3, 'F');

  // Draw progress arc based on status
  doc.setDrawColor(...iconColor);
  doc.setLineWidth(2.5);
  if ((doc as any).setLineCap) {
    (doc as any).setLineCap('round');
  }

  // Draw progress arc (from top, clockwise)
  const startAngle = -Math.PI / 2; // Start from top
  const endAngle = startAngle + 2 * Math.PI * progressPercentage;

  // Draw the progress arc
  for (let angle = startAngle; angle <= endAngle; angle += 0.1) {
    const x1 = badgeCX + Math.cos(angle) * (badgeR - 1.5);
    const y1 = badgeCY + Math.sin(angle) * (badgeR - 1.5);
    const x2 = badgeCX + Math.cos(angle + 0.1) * (badgeR - 1.5);
    const y2 = badgeCY + Math.sin(angle + 0.1) * (badgeR - 1.5);
    doc.line(x1, y1, x2, y2);
  }

  // Draw status-specific icon in center - compact size
  doc.setDrawColor(...iconColor);
  doc.setLineWidth(1.5); // Reduced line width for smaller icon
  if ((doc as any).setLineCap) {
    (doc as any).setLineCap('round');
  }

  if (statusKey === 'compliant') {
    // Draw checkmark - larger size for Figma design
    doc.line(badgeCX - 4, badgeCY + 1, badgeCX - 1, badgeCY + 4);
    doc.line(badgeCX - 1, badgeCY + 4, badgeCX + 5, badgeCY - 3);
  } else if (statusKey === 'partial') {
    // Draw exclamation mark - larger size
    doc.line(badgeCX, badgeCY - 4, badgeCX, badgeCY + 2);
    doc.line(badgeCX, badgeCY + 4, badgeCX, badgeCY + 5);
  } else {
    // Not Compliant
    // Draw X mark - larger size
    doc.line(badgeCX - 4, badgeCY - 4, badgeCX + 4, badgeCY + 4);
    doc.line(badgeCX + 4, badgeCY - 4, badgeCX - 4, badgeCY + 4);
  }

  // Status text positioned to the right of the icon - Figma design
  doc.setTextColor(0, 0, 0); // Black color for status text
  doc.setFont('NotoSans_Condensed-Regular');
  doc.setFontSize(20); // Increased font size for better visibility
  const statusTextX = badgeCX + 18; // Increased spacing from icon
  const statusTextY = badgeCY - 8; // Align with center of icon
  doc.text(status, statusTextX, statusTextY);

  // Percentage pill positioned in the same row as status text - Figma design
  const pillText = `${Math.round(enhancedScore)}%`;
  doc.setFontSize(10); // Increased font size for Figma design
  const textWidth = doc.getTextWidth(pillText);
  const horizontalPadding = 4; // Reduced padding for tighter fit
  const pillTextWidth = textWidth + horizontalPadding * 2; // Total width with padding
  const pillH = 4; // Increased height for better appearance
  const pillX = statusTextX + doc.getTextWidth(status) + 34; // Increased spacing from status text to prevent overlap
  const pillY = statusTextY - 6; // Align with status text
  const pillTotalHeight = pillH + 4; // Total height of the pill
  // Convert #222D73 to RGB: R=34, G=45, B=115
  doc.setFillColor(34, 45, 115);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(pillX, pillY, pillTextWidth, pillTotalHeight, 4, 4, 'F'); // Increased corner radius for more pill-like appearance
  // Center the text both horizontally and vertically within the pill
  const textX = pillX + (pillTextWidth - textWidth) / 2;
  const textY = pillY + pillTotalHeight / 2 + 1.5; // Center vertically with baseline offset
  doc.text(pillText, textX, textY);

  // Sub message positioned below the status text and percentage pill - Figma design
  message = translatedMessage;
  doc.setFontSize(10); // Increased font size for Figma design
  doc.setTextColor(71, 85, 105); // Gray color for message
  // Split message into lines if it contains \n
  const messageLines = message.split('\n');
  let messageY = statusTextY + 12; // Maintained spacing below status text
  messageLines.forEach((line, index) => {
    doc.text(line, statusTextX, messageY + index * 6); // 6px spacing between lines
  });

  // Add "Great job!" message below the main message for Compliant status
  if (statusKey === 'compliant') {
    doc.setFontSize(9); // Slightly smaller font for secondary message
    doc.setTextColor(71, 85, 105); // Same gray color
    doc.text('Great job!', statusTextX, statusTextY + 20); // Maintained spacing below main message
  }

  // Cards positioned right-aligned with Compliant section on the left - ultra compact layout
  const cardSpacing = 4; // Minimal spacing for compact layout
  const totalErrorsCardWidth = 25; // Further reduced width for Total Errors card
  const totalErrorsCardHeight = 20; // Reduced height for Total Errors card
  const severityCardWidth = 40; // Further reduced width for Severity card
  const severityCardHeight = 20; // Reduced height for Severity card

  // Calculate right-aligned positioning
  const totalCardsWidth =
    totalErrorsCardWidth + severityCardWidth + cardSpacing;
  const rightMargin = 12; // Right margin from page edge
  const totalErrorsCardX = pageWidth - rightMargin - totalCardsWidth; // Right-aligned
  const totalErrorsCardY = cardY; // Same Y as compliance section

  // Total Errors card - no fill with reduced border width
  doc.setDrawColor(162, 173, 243); // Light blue border (#A2ADF3)
  doc.setLineWidth(0.3); // Reduced border line width
  doc.roundedRect(
    totalErrorsCardX,
    totalErrorsCardY,
    totalErrorsCardWidth,
    totalErrorsCardHeight,
    2, // Reduced corner radius
    2,
    'D', // Draw only (no fill)
  );

  // Title: "Total Errors" - dark blue color, positioned to the left
  doc.setTextColor(21, 101, 192); // Dark blue color for title
  doc.setFont('NotoSans_Condensed-Regular');
  doc.setFontSize(8); // Increased font size for better readability
  doc.text(
    translatedTotalErrors,
    totalErrorsCardX + 6, // Moved to the left (6px from left edge)
    totalErrorsCardY + 8, // Moved down
    { align: 'left' },
  );

  // Number: Large, prominent display in dark color, positioned to the left with reduced spacing
  doc.setTextColor(30, 30, 30); // Dark, almost black color for the number
  doc.setFontSize(18); // Increased font size for better prominence
  doc.text(
    `${issues.length}`,
    totalErrorsCardX + 6, // Moved to the left (6px from left edge)
    totalErrorsCardY + 14, // Moved down with title
    {
      align: 'left',
    },
  );

  // Severity list card - positioned to the right of Total Errors card (right-aligned)
  let severityCardX = totalErrorsCardX + totalErrorsCardWidth + cardSpacing;
  let severityCardY = cardY; // Same Y as compliance section

  // Ensure severity card doesn't go out of page (should not happen with right-alignment)
  if (severityCardX + severityCardWidth > pageWidth - 12) {
    // If it would overflow, position it below the Total Errors card instead
    severityCardX = totalErrorsCardX;
    severityCardY = cardY + totalErrorsCardHeight + 8;
  }

  // Severity card - no fill with reduced border width
  doc.setDrawColor(162, 173, 243); // Light blue border (#A2ADF3)
  doc.setLineWidth(0.3); // Reduced border line width
  doc.roundedRect(
    severityCardX,
    severityCardY,
    severityCardWidth,
    severityCardHeight,
    2, // Reduced corner radius
    2,
    'D', // Draw only (no fill)
  );

  const severityCounts = {
    severe: issues.filter(
      (i) => i.impact === 'critical' || i.impact === 'serious',
    ).length,
    moderate: issues.filter((i) => i.impact === 'moderate').length,
    mild:
      issues.length -
      (issues.filter((i) => i.impact === 'critical').length +
        issues.filter((i) => i.impact === 'serious').length +
        issues.filter((i) => i.impact === 'moderate').length),
  } as const;

  const sevLineX = severityCardX + 4;
  let sevLineY = severityCardY + 5; // Further reduced starting position for compact height
  doc.setFontSize(8); // Increased font size for better readability
  // Severe - red text (matching image)
  doc.setTextColor(220, 38, 38); // Red color
  doc.text(`${translatedSevere}`, sevLineX, sevLineY);
  doc.setTextColor(30, 30, 30); // Dark, almost black color for count
  doc.text(
    `${severityCounts.severe}`,
    severityCardX + severityCardWidth - 4,
    sevLineY,
    {
      align: 'right',
    },
  );
  // Moderate - orange text (matching image)
  sevLineY += 5; // Further reduced line spacing for compact height
  doc.setTextColor(202, 138, 4); // Orange color
  doc.text(`${translatedModerate}`, sevLineX, sevLineY);
  doc.setTextColor(30, 30, 30); // Dark, almost black color for count
  doc.text(
    `${severityCounts.moderate}`,
    severityCardX + severityCardWidth - 4,
    sevLineY,
    {
      align: 'right',
    },
  );
  // Mild - blue text (matching image)
  sevLineY += 5; // Further reduced line spacing for compact height
  doc.setTextColor(33, 150, 243); // Blue color
  doc.text(`${translatedMild}`, sevLineX, sevLineY);
  doc.setTextColor(30, 30, 30); // Dark, almost black color for count
  doc.text(
    `${severityCounts.mild}`,
    severityCardX + severityCardWidth - 4,
    sevLineY,
    {
      align: 'right',
    },
  );
  // --- END HEADER AREA ---

  // Compute a reference Y for subsequent sections based on header
  // Calculate bottom position based on the compliance status elements
  const complianceBottomY = Math.max(
    badgeCY + badgeR + 10, // Icon bottom + padding
    statusTextY + 12 + 10, // Sub message bottom + padding
  );
  const headerBottomY = Math.max(complianceBottomY, severityCardY + 30);

  // Start Y for category grid
  const yStart = headerBottomY + 12;

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
      doc.line(x + size * 0.6, y + size * 0.2, x + size * 0.8, y + size * 0.2);
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
      doc.line(x + size * 0.2, y + size * 0.8, x + size * 0.8, y + size * 0.2);
      doc.line(x + size * 0.8, y + size * 0.2, x + size * 0.6, y + size * 0.4);
      doc.line(x + size * 0.8, y + size * 0.2, x + size * 0.6, y + size * 0.2);
      // Small arrow
      doc.line(x + size * 0.3, y + size * 0.7, x + size * 0.7, y + size * 0.3);
      doc.line(
        x + size * 0.7,
        y + size * 0.3,
        x + size * 0.55,
        y + size * 0.45,
      );
      doc.line(x + size * 0.7, y + size * 0.3, x + size * 0.55, y + size * 0.3);
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
      doc.rect(x + size * 0.1, y + size * 0.45, size * 0.15, size * 0.15, 'S');
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
      doc.ellipse(x + size * 0.5, y + size * 0.5, size * 0.4, size * 0.25, 'S');
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
      doc.line(x + size * 0.3, y + size * 0.45, x + size * 0.3, y + size * 0.8);
      doc.line(
        x + size * 0.15,
        y + size * 0.6,
        x + size * 0.45,
        y + size * 0.6,
      );
      // Arrows indicating movement
      doc.setLineWidth(0.2);
      doc.line(x + size * 0.6, y + size * 0.3, x + size * 0.8, y + size * 0.3);
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
    rawCategories.set(functionName, (rawCategories.get(functionName) || 0) + 1);

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

  let nextY = yStart - 10; // Moved up more from summary boxes

  if (categoryData.length > 0) {
    // Section header
    // No horizontal separator in the new design

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Black color
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(translatedIssuesDetectedByCategory, 12, nextY + 8, {
      align: 'left',
    });
    let currentY = nextY + 18;

    // Define category colors to match the Figma design - all blue theme
    const categoryColors = new Map<string, [number, number, number]>([
      ['Content', [68, 90, 231]], // #445AE7 - new blue color
      ['Cognitive', [68, 90, 231]], // #445AE7 - new blue color
      ['Low Vision', [68, 90, 231]], // #445AE7 - new blue color
      ['Navigation', [68, 90, 231]], // #445AE7 - new blue color
      ['Mobility', [68, 90, 231]], // #445AE7 - new blue color
      ['Other', [68, 90, 231]], // #445AE7 - new blue color
      ['Forms', [68, 90, 231]], // #445AE7 - new blue color
    ]);

    // Card layout - 2 columns, 3 rows to match the updated design
    const itemsPerRow = 2;
    const cardWidth = 90; // Increased width for better spacing
    const cardHeight = 20; // Height to match Figma
    const cardSpacing = 6; // Increased spacing for 2-column layout
    const startX = 10; // Centered start position for wider 2-column layout
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

      // Transparent card - no fill, just border
      doc.setDrawColor(162, 173, 243); // #A2ADF3 border color
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1, 1, 'D');

      // Category icon in colored rounded rectangle - left side like Figma design
      const iconWidth = 8; // Width for the blue icon section
      const iconHeight = cardHeight - 4; // Full height minus small padding
      const iconX = x + 2;
      const iconY = y + 2;

      // Colored rounded rectangle background for icon - blue like Figma
      doc.setFillColor(...categoryColor);
      doc.roundedRect(iconX, iconY, iconWidth, iconHeight, 1, 1, 'F');

      // Add white icon centered in the blue rectangle
      const svgIcon = iconMap.get(category);
      if (svgIcon) {
        // Add the SVG icon in white (centered in rectangle)
        const svgSize = Math.min(iconWidth - 4, iconHeight - 4); // Fit within rectangle
        const svgOffsetX = (iconWidth - svgSize) / 2; // Center horizontally
        const svgOffsetY = (iconHeight - svgSize) / 2; // Center vertically
        doc.addImage(
          svgIcon,
          'PNG',
          iconX + svgOffsetX,
          iconY + svgOffsetY,
          svgSize,
          svgSize,
        );
      } else {
        // Draw simple white icon shapes centered in rectangle
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);

        const iconCenterX = iconX + iconWidth / 2;
        const iconCenterY = iconY + iconHeight / 2;

        if (category === 'Content') {
          // Nested diamond/square outlines like Figma - really tiny
          doc.setLineWidth(0.05);
          // Outer square
          doc.rect(iconCenterX - 0.3, iconCenterY - 0.3, 0.6, 0.6, 'S');
          // Middle square (offset)
          doc.rect(iconCenterX - 0.2, iconCenterY - 0.2, 0.4, 0.4, 'S');
          // Inner square (offset)
          doc.rect(iconCenterX - 0.1, iconCenterY - 0.1, 0.2, 0.2, 'S');
        } else if (category === 'Cognitive') {
          // Simple brain icon - really tiny circle
          doc.setLineWidth(0.05);
          doc.circle(iconCenterX, iconCenterY, 0.25, 'S');
          // Tiny starburst
          doc.line(
            iconCenterX + 0.1,
            iconCenterY - 0.02,
            iconCenterX + 0.15,
            iconCenterY - 0.05,
          );
          doc.line(
            iconCenterX + 0.1,
            iconCenterY - 0.02,
            iconCenterX + 0.12,
            iconCenterY - 0.08,
          );
        } else if (category === 'Low Vision') {
          // Simple eye icon - really tiny
          doc.setLineWidth(0.05);
          doc.ellipse(iconCenterX, iconCenterY, 0.25, 0.15, 'S');
          doc.circle(iconCenterX, iconCenterY, 0.08, 'F');
        } else if (category === 'Navigation') {
          // Simple arrow icon - really tiny
          doc.setLineWidth(0.05);
          doc.line(
            iconCenterX - 0.15,
            iconCenterY + 0.1,
            iconCenterX + 0.15,
            iconCenterY - 0.1,
          );
          doc.line(
            iconCenterX + 0.15,
            iconCenterY - 0.1,
            iconCenterX + 0.08,
            iconCenterY - 0.02,
          );
          doc.line(
            iconCenterX + 0.15,
            iconCenterY - 0.1,
            iconCenterX + 0.12,
            iconCenterY - 0.1,
          );
        } else if (category === 'Mobility') {
          // Simple person in wheelchair icon - really tiny
          doc.setLineWidth(0.05);
          doc.circle(iconCenterX, iconCenterY - 0.1, 0.08, 'F'); // Head
          doc.rect(iconCenterX - 0.02, iconCenterY - 0.02, 0.04, 0.1, 'F'); // Body
          // Wheelchair wheels
          doc.circle(iconCenterX - 0.1, iconCenterY + 0.1, 0.08, 'S');
          doc.circle(iconCenterX + 0.1, iconCenterY + 0.1, 0.08, 'S');
        } else {
          // Simple info icon - three really tiny circles
          doc.setLineWidth(0.05);
          doc.circle(iconCenterX - 0.1, iconCenterY - 0.1, 0.05, 'F');
          doc.circle(iconCenterX, iconCenterY, 0.05, 'F');
          doc.circle(iconCenterX + 0.1, iconCenterY + 0.1, 0.05, 'F');
          doc.line(
            iconCenterX - 0.1,
            iconCenterY - 0.1,
            iconCenterX,
            iconCenterY,
          );
          doc.line(
            iconCenterX,
            iconCenterY,
            iconCenterX + 0.1,
            iconCenterY + 0.1,
          );
        }
      }

      // Category name (to the right of blue rectangle)
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('NotoSans_Condensed-Regular');
      const categoryX = x + iconWidth + 6; // Start after the blue rectangle
      const categoryY = y + 6;
      doc.text(category, categoryX, categoryY);

      // Right-aligned count text (no pill in Figma)
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont('NotoSans_Condensed-Regular');
      const countText = count.toString();
      const countX = x + cardWidth - 3;
      const countY = categoryY;
      doc.text(countText, countX, countY, { align: 'right' });

      // Progress bar at bottom - matching Figma design
      const progressBarWidth = cardWidth - iconWidth - 10; // Account for blue rectangle
      const progressBarHeight = 2;
      const progressBarX = x + iconWidth + 6; // Start after the blue rectangle
      const progressBarY = y + cardHeight - 10;

      // Progress bar background - light blue-grey like Figma
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(
        progressBarX,
        progressBarY,
        progressBarWidth,
        progressBarHeight,
        1,
        1,
        'F',
      );

      // Progress bar fill - medium blue like Figma
      const fillWidth = (progressBarWidth * percentage) / 100;
      if (fillWidth > 1) {
        doc.setFillColor(68, 90, 231); // #445AE7 - new blue color
        doc.roundedRect(
          progressBarX,
          progressBarY,
          fillWidth,
          progressBarHeight,
          1,
          1,
          'F',
        );
      }

      // Percentage text
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text(
        `${percentage.toFixed(1)}% of total issues`,
        x + iconWidth + 6, // Start after the blue rectangle
        y + cardHeight - 4,
      );
    });

    // Calculate the actual Y position after all cards are drawn
    const totalRows = Math.ceil(orderedCategoryData.length / itemsPerRow);
    nextY = currentY + totalRows * (cardHeight + 6) + 15; // Added more spacing
  }

  // --- ACCESSIBILITY COMPLIANCE PANEL (matches Figma) ---
  const buildCompliancePanel = async (
    startY: number,
    hasWebAbility: boolean,
  ) => {
    const panelX = 8;
    const panelW = pageWidth - 20;
    const outerY = startY + 4; // Moved up

    // Main container (compliance vs non-compliance styling)
    const containerHeight = 90;
    if (hasWebAbility) {
      // Compliant state - light blue-grey background
      doc.setFillColor(255, 255, 255); // White background
      doc.setDrawColor(162, 173, 243); // Light blue border
    } else {
      // Non-compliant state - light red background
      doc.setFillColor(254, 242, 242); // Light red background (#fef2f2)
      doc.setDrawColor(248, 113, 113); // Red border (#f87171)
    }
    doc.setLineWidth(0.5);
    doc.roundedRect(panelX, outerY, panelW, containerHeight, 4, 4, 'FD');

    // Compliance status icon (top left)
    const shieldX = panelX + 8;
    const shieldY = outerY + 5;
    const shieldSize = 20;

    if (hasWebAbility) {
      // Compliant state - green shield with checkmark
      try {
        const img = new Image();
        img.src = greenSuccessImage;

        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const TIMEOUT_MS = 3000; // 3 seconds timeout

          const cleanup = () => {
            img.onload = null;
            img.onerror = null;
          };

          const timeoutId = setTimeout(() => {
            if (!settled) {
              settled = true;
              cleanup();
              reject(new Error('Green success image load timed out'));
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
            reject(new Error('Green success image failed to load'));
          };
        });

        // Add the image to PDF
        doc.addImage(img, 'PNG', shieldX, shieldY, shieldSize, shieldSize);
      } catch (error) {

        // Fallback: Draw green shield background if image fails to load
        doc.setFillColor(34, 197, 94); // Bright green
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(0.8);

        // Shield shape (rounded rectangle with pointed bottom)
        doc.roundedRect(
          shieldX,
          shieldY,
          shieldSize * 0.7,
          shieldSize * 0.8,
          2,
          2,
          'F',
        );
        // Pointed bottom of shield
        doc.triangle(
          shieldX + shieldSize * 0.35 - 3,
          shieldY + shieldSize * 0.8,
          shieldX + shieldSize * 0.35,
          shieldY + shieldSize * 0.95,
          shieldX + shieldSize * 0.35 + 3,
          shieldY + shieldSize * 0.8,
          'F',
        );

        // White checkmark inside shield
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(2.5);
        const checkX = shieldX + shieldSize * 0.35;
        const checkY = shieldY + shieldSize * 0.4;
        doc.line(checkX - 4, checkY, checkX - 1.5, checkY + 3);
        doc.line(checkX - 1.5, checkY + 3, checkX + 5, checkY - 3);
      }
    } else {
      // Non-compliant state - red warning icon with exclamation mark
      // Red circle background
      doc.setFillColor(239, 68, 68); // Red background (#ef4444)
      doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(0.8);
      doc.circle(
        shieldX + shieldSize * 0.5,
        shieldY + shieldSize * 0.5,
        shieldSize * 0.4,
        'F',
      );

      // White exclamation mark inside circle
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(255, 255, 255);

      // Calculate center position of the circle
      const centerX = shieldX + shieldSize * 0.5;
      const centerY = shieldY + shieldSize * 0.5;
      const radius = shieldSize * 0.4;

      // Exclamation mark body (vertical line) - better proportioned
      const lineStartY = centerY - radius * 0.6; // Start higher
      const lineEndY = centerY - radius * 0.1; // End closer to center
      doc.setLineWidth(2.5);
      doc.setLineCap('round');
      doc.line(centerX, lineStartY, centerX, lineEndY);

      // Exclamation mark dot - positioned with proper gap
      const dotY = centerY + radius * 0.3;
      doc.circle(centerX, dotY, 1.3, 'F');
    }

    // Title text (to the right of icon)
    const titleX = shieldX + shieldSize + 4;
    const titleY = shieldY + 8;

    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0); // Dark text

    if (hasWebAbility) {
      doc.text(translatedAccessibilityComplianceAchieved, titleX, titleY);
    } else {
      doc.text(translatedCriticalViolationsDetected, titleX, titleY);
    }

    // Subtitle text
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105); // Gray text
    if (hasWebAbility) {
      doc.text(translatedWebsiteCompliant, titleX, titleY + 10);
    } else {
      doc.text(translatedLegalActionWarning, titleX, titleY + 10);
    }

    // Nested box for compliance status
    const innerX = panelX + 12;
    const innerY = outerY + 30;
    const innerW = panelW - 24;
    const innerH = 55;

    doc.setFillColor(255, 255, 255);
    if (hasWebAbility) {
      doc.setDrawColor(162, 173, 243); // #A2ADF3 border color for compliant
    } else {
      doc.setDrawColor(248, 113, 113); // Red border for non-compliant
    }
    doc.setLineWidth(0.5);
    doc.roundedRect(innerX, innerY, innerW, innerH, 3, 3, 'FD');

    // Status title
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont('NotoSans_Condensed-Regular');
    if (hasWebAbility) {
      doc.text(translatedComplianceStatus, innerX + 8, innerY + 8);
    } else {
      doc.text(translatedImmediateRisks, innerX + 8, innerY + 8);
    }

    // Status items with checkmarks or crosses
    const itemStartX = innerX + 8;
    const itemStartY = innerY + 16; // Increased spacing from title

    const drawGreenCheck = (x: number, y: number) => {
      // Simple green checkmark without circle background
      doc.setDrawColor(34, 197, 94); // Green color
      doc.setLineWidth(1.2); // Thinner lines for simple appearance
      doc.setLineCap('round'); // Rounded line ends

      // Draw simple checkmark shape
      doc.line(x - 1.5, y - 0.5, x - 0.3, y + 0.7);
      doc.line(x - 0.3, y + 0.7, x + 2, y - 2);
    };

    const drawRedCross = (x: number, y: number) => {
      // Simple red X mark
      doc.setDrawColor(239, 68, 68); // Red color (#ef4444)
      doc.setLineWidth(1.2);
      doc.setLineCap('round');

      // Draw X shape
      doc.line(x - 2, y - 2, x + 2, y + 2);
      doc.line(x - 2, y + 2, x + 2, y - 2);
    };

    if (hasWebAbility) {
      // Compliant state - show green checkmarks
      // First item
      drawGreenCheck(itemStartX, itemStartY);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(translatedWebAbilityProtecting, itemStartX + 8, itemStartY + 1);

      // Second item
      drawGreenCheck(itemStartX, itemStartY + 10);
      doc.text(
        translatedAutomatedFixesApplied,
        itemStartX + 8,
        itemStartY + 11,
      );

      // WCAG Compliance status
      drawGreenCheck(itemStartX, itemStartY + 20);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('WCAG 2.1 AA standards met', itemStartX + 8, itemStartY + 21);

      // Legal protection status
      drawGreenCheck(itemStartX, itemStartY + 30);
      doc.text('Legal compliance maintained', itemStartX + 8, itemStartY + 31);
    } else {
      // Non-compliant state - show red crosses and warning text
      // First item
      drawRedCross(itemStartX, itemStartY);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(translatedPotentialLawsuits, itemStartX + 8, itemStartY + 1);

      // Second item
      drawRedCross(itemStartX, itemStartY + 10);
      doc.text(translatedCustomerLoss, itemStartX + 8, itemStartY + 11);

      // Third item
      drawRedCross(itemStartX, itemStartY + 20);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(translatedSeoPenalties, itemStartX + 8, itemStartY + 21);

      // Fourth item
      drawRedCross(itemStartX, itemStartY + 30);
      doc.text(translatedBrandDamage, itemStartX + 8, itemStartY + 31);
    }

    return outerY + containerHeight + 12; // bottom Y with spacing
  };

  const panelBottomY = await buildCompliancePanel(nextY, hasWebAbility);

  let yTable = panelBottomY + 8;

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerHeight = 15;

  // Helper to ensure array
  const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

  // Helper function to add page with background color
  const addPageWithBackground = (
    doc: any,
    backgroundColor: [number, number, number],
  ) => {
    doc.addPage();
    doc.setFillColor(
      backgroundColor[0],
      backgroundColor[1],
      backgroundColor[2],
    );
    doc.rect(
      0,
      0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      'F',
    );
  };

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
    // Row 1: Issue header (full width) - reduced padding
    const issueHeaderWidth = sumColumnsWidth(0, 4) - 16; // padding 8 + 8
    const issueHeaderH = estimateCellHeight(
      headerLeftText,
      issueHeaderWidth,
      14,
      4, // Reduced top padding
      2, // Reduced bottom padding
    );

    // Row 2: Issue content (full width) - reduced padding
    const issueContentText = issue.code
      ? `${issue.code} (${issue.impact})`
      : '';
    const issueContentWidth = sumColumnsWidth(0, 4) - 16; // padding 8 + 8
    const issueContentH = Math.max(
      20, // Reduced minimum height
      estimateCellHeight(issueContentText, issueContentWidth, 12, 2, 4), // Reduced padding
    );

    // Row 3: Message header and content combined (full width) - reduced padding
    const messageCombinedText = `${headerRightText}\n${issue.message || ''}`;
    const messageCombinedWidth = sumColumnsWidth(0, 4) - 16; // padding 8 + 8
    const messageCombinedH = Math.max(
      40, // Increased minimum height for container
      estimateCellHeight(messageCombinedText, messageCombinedWidth, 12, 8, 8), // Container padding
    );

    const headerRowH = issueHeaderH + issueContentH + messageCombinedH;

    // Row: Fix heading (if any)
    let fixesBlockH = 0;
    const filtered = fixesList.filter(Boolean);
    if (filtered.length > 0) {
      const fixHeadingWidth = sumColumnsWidth(0, 4) - 10; // padding 5 + 5
      const fixHeadingH = estimateCellHeight('Fix', fixHeadingWidth, 11, 5, 5);
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

    return headerRowH + fixesBlockH;
  };

  // Build the rows
  let tableBody: any[] = [];
  const FilteredIssues = await deduplicateIssuesByMessage(issues);

  const translatedIssues = await translateText(FilteredIssues, currentLanguage);

  // After fetching base64
  for (const issue of translatedIssues) {
    if (issue.screenshotUrl && !issue.screenshotBase64) {
      try {
        issue.screenshotBase64 = await fetchImageAsBase64(issue.screenshotUrl);
      } catch (e) {
      }
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
        willDrawPage: (data: any) => {
          // Apply background color to any new pages created by autoTable
          // This is called before any content is drawn on the page
          if (data.pageNumber > 1) {
            doc.setFillColor(
              backgroundColor[0],
              backgroundColor[1],
              backgroundColor[2],
            );
            doc.rect(
              0,
              0,
              doc.internal.pageSize.getWidth(),
              doc.internal.pageSize.getHeight(),
              'F',
            );
          }
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
      addPageWithBackground(doc, backgroundColor);
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
    // Row 1: Issue header and content (vertical layout)
    const impactIcon = getImpactIcon(issue.impact);
    const issueCountIcon = getIssueCountIcon(issue.impact);
    groupBody.push([
      {
        content: `      ${translatedIssue}`,
        colSpan: 4,
        pageBreak: 'avoid', // Keep issue header with its content
        _isIssueFixGroupStart: true,
        _isImpactIcon: true,
        _impactIcon: impactIcon,
        _isIssueCountIcon: true,
        _issueCountIcon: issueCountIcon,
        _groupHeight: groupHeightEstimate,
        styles: {
          textColor: [0, 0, 0], // black text
          fontSize: 14,
          halign: 'left',
          cellPadding: { top: 4, right: 6, bottom: 2, left: -2 }, // Reduced vertical padding
          font: 'NotoSans_Condensed-Regular',
          fontStyle: 'bold',
        },
      },
    ]);

    // Row 2: Issue content
    groupBody.push([
      {
        content: `${issue.code ? `${issue.code} (${issue.impact})` : ''}`,
        colSpan: 4,
        pageBreak: 'avoid', // Keep with header
        styles: {
          fontSize: 12,
          textColor: [30, 41, 59],
          halign: 'left',
          cellPadding: { top: 2, right: 0, bottom: 1, left: -2 }, // Reduced vertical padding
          font: 'NotoSans_Condensed-Regular',
          minCellHeight: 20, // Reduced minimum height
        },
      },
    ]);

    // Row 3: Message header and content in single container (responsive height)
    const messageCombinedText = `        ${translatedIssueMessage}\n${
      issue.message || ''
    }`;
    const messageAvailableWidth = sumColumnsWidth(0, 4) - 4; // padding 2 + 2
    const messageMinH = estimateCellHeight(
      messageCombinedText,
      messageAvailableWidth,
      12,
      2,
      2,
    );
    groupBody.push([
      {
        content: messageCombinedText,
        colSpan: 4,
        pageBreak: 'avoid', // Keep message header with its content
        styles: {
          textColor: [0, 0, 0], // black text
          fontSize: 12,
          halign: 'left',
          cellPadding: { top: 2, right: 4, bottom: 2, left: 2 },
          font: 'NotoSans_Condensed-Regular',
          minCellHeight: messageMinH,
        },
        _isMessageContainer: true, // Flag for custom drawing
      },
    ]);

    // Row 5: Fix(es) - display heading first, then each fix in its own white back container with spacing
    if (filteredFixes.length > 0) {
      // Heading row for Fix - ensure it stays with at least first fix
      groupBody.push([
        {
          content: translatedFix,
          colSpan: 4,
          pageBreak: 'avoid', // Keep fix heading with first fix item
          styles: {
            fontSize: 14, // Increased to match other headers
            textColor: [0, 0, 0], // black text
            halign: 'left',
            cellPadding: { top: -2, right: 8, bottom: 2, left: -4 }, // Reduced vertical padding
            lineWidth: 0,
            font: 'NotoSans_Condensed-Regular',
          },
        },
      ]);
      // Each fix in its own row/container, with reduced spacing
      filteredFixes.forEach((fix, fixIdx) => {
        groupBody.push([
          {
            content: `${fixIdx + 1}. ${fix}`,
            colSpan: 4,
            pageBreak: fixIdx === 0 ? 'avoid' : 'auto', // First fix must stay with heading
            styles: {
              fontSize: 11,
              textColor: [101, 101, 101], // #656565
              halign: 'left',
              cellPadding: { top: 0, right: 8, bottom: 2, left: -4 }, // Reduced vertical space
              lineWidth: 0,
              font: 'NotoSans_Condensed-Regular',
            },
          },
        ]);
        // Add a minimal spacer row after each fix except the last
        if (fixIdx < filteredFixes.length - 1) {
          groupBody.push([
            {
              content: '',
              colSpan: 4,
              styles: {
                cellPadding: 0,
                lineWidth: 0,
                minCellHeight: 2, // Reduced vertical space between containers
              },
            },
          ]);
        }
      });
    }

    // Append Context as a single combined code block (Figma-style)
    const groupContexts = toArray(issue.context).filter(Boolean);
    if (groupContexts.length > 0) {
      groupBody.push([
        {
          content: translatedContext,
          colSpan: 4,
          pageBreak: 'auto',
          styles: {
            fontSize: 14, // Increased to match other headers
            textColor: [0, 0, 0],
            halign: 'left',
            cellPadding: { top: 4, right: 8, bottom: 2, left: -4 }, // Reduced vertical padding
            lineWidth: 0,
            font: 'NotoSans_Condensed-Regular',
          },
        },
      ]);

      // Create one row per context line to allow natural page breaks
      // Helper to compute responsive height per code line based on wrapped width
      const calcMinHeightForContextLine = (text: string) => {
        const cellWidth = sumColumnsWidth(0, 4);
        const padding = 2;
        const leftIndexPadding = 8;
        const maxIndexDigits = String(groupContexts.length).length;
        const indexColWidth = doc.getTextWidth('9'.repeat(maxIndexDigits)) + 12;
        const availableWidth =
          cellWidth - padding * 2 - indexColWidth - leftIndexPadding - 8;
        const lineH = 6;
        const topPad = 6;
        const bottomPad = 2;
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(
          String(text || ''),
          Math.max(5, availableWidth),
        );
        const textH = Math.max(lineH, lines.length * lineH);
        return Math.max(18, topPad + textH + bottomPad);
      };

      groupContexts.forEach((ctx, idx) => {
        groupBody.push([
          {
            content: String(ctx || ''),
            colSpan: 4,
            pageBreak: 'auto',
            styles: {
              font: 'NotoSans_Condensed-Regular',
              fontSize: 10,
              textColor: [255, 255, 255],
              halign: 'left',
              valign: 'top',
              cellPadding: 0,
              lineWidth: 0,
              minCellHeight: calcMinHeightForContextLine(String(ctx || '')),
              overflow: 'linebreak',
            },
            _isCombinedCodeLine: true,
            _lineIndex: idx + 1,
            _totalLines: groupContexts.length,
          } as any,
        ]);
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
      willDrawPage: (data: any) => {
        // Apply background color to any new pages created by autoTable
        // This is called before any content is drawn on the page
        if (data.pageNumber > 1) {
          doc.setFillColor(
            backgroundColor[0],
            backgroundColor[1],
            backgroundColor[2],
          );
          doc.rect(
            0,
            0,
            doc.internal.pageSize.getWidth(),
            doc.internal.pageSize.getHeight(),
            'F',
          );
        }
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
        // Combined code line overflow check (per line, permits natural page breaks)
        if (data.cell.raw && (data.cell.raw as any)._isCombinedCodeLine) {
          const pageH = doc.internal.pageSize.getHeight();
          const curY = data.cursor.y;
          const bottom = 25;
          const text: string = String((data.cell.raw as any).content || '');
          const padding = 2;
          const leftIndexPadding = 8;
          const totalLines = Number((data.cell.raw as any)._totalLines || 1);
          const maxIndexDigits = String(totalLines).length;
          const indexColWidth =
            doc.getTextWidth('9'.repeat(maxIndexDigits)) + 12;
          const availableWidth =
            data.cell.width -
            padding * 2 -
            indexColWidth -
            leftIndexPadding -
            8;
          const lineH = 6;
          const topPad = 6;
          const bottomPad = 2;
          let total = topPad;
          doc.setFont('NotoSans_Condensed-Regular', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(text, Math.max(5, availableWidth));
          total += Math.max(lineH, lines.length * lineH);
          total += 2; // spacing after line
          total += bottomPad;
          const estH = Math.max(30, total);
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
        // Custom drawing for a single context code line (Figma-style, per row)
        if (data.cell.raw && (data.cell.raw as any)._isCombinedCodeLine) {
          const { x, y, width, height } = data.cell;
          const padding = 2;
          const cornerRadius = 2;
          const totalLines = Number((data.cell.raw as any)._totalLines || 1);
          const lineIndex = Number((data.cell.raw as any)._lineIndex || 1);
          const maxIndexDigits = String(totalLines).length;
          const indexColWidth =
            doc.getTextWidth('9'.repeat(maxIndexDigits)) + 12;

          // Outer light-blue container
          doc.setDrawColor(162, 173, 243);
          doc.setLineWidth(0.6);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(
            x + padding,
            y + padding,
            width - padding * 2,
            height - padding * 2,
            cornerRadius,
            cornerRadius,
            'FD',
          );

          // Transparent gutter for line numbers (no fill)

          // Transparent code area (no white fill)
          const codeAreaX = x + padding + indexColWidth + 1;
          const codeAreaW = width - padding * 2 - indexColWidth - 2;

          // Divider between gutter and code area
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.4);
          doc.line(
            x + padding + indexColWidth,
            y + padding,
            x + padding + indexColWidth,
            y + height - padding,
          );

          // Draw numbered lines
          const lineH = 6;
          const leftIndexPadding = 8;
          const codeTextX = x + padding + indexColWidth + 6;
          const availableWidth =
            width - padding * 2 - indexColWidth - leftIndexPadding - 12;

          doc.setFont('NotoSans_Condensed-Regular', 'normal');
          doc.setFontSize(10);

          const numDigits = Math.max(2, maxIndexDigits);
          const text = String((data.cell.raw as any).content || '');
          const lines = doc.splitTextToSize(text, Math.max(5, availableWidth));
          const textBlockH = Math.max(lineH, lines.length * lineH);
          const innerH = height - padding * 2;
          let cursorY = y + padding + (innerH - textBlockH) / 2 + lineH - 1;

          // Line number in muted blue, vertically centered with text
          doc.setTextColor(162, 173, 243);
          const num = String(lineIndex).padStart(numDigits, '0');
          const numX = x + padding + indexColWidth - 3;
          doc.text(num, numX, cursorY, { align: 'right' });

          // Code content with simple HTML syntax highlighting
          const drawHighlightedHtmlLine = (
            line: string,
            startX: number,
            y: number,
          ) => {
            // Custom palette requested by user
            const colorDefault: [number, number, number] = [51, 67, 173]; // #3343AD
            const colorKeyword: [number, number, number] = [216, 19, 68]; // #D81344
            const colorString: [number, number, number] = [84, 156, 39]; // #549C27

            // Keywords: attribute names and common element names to emphasize
            const keywordSet = new Set<string>([
              'class',
              'style',
              'button',
              'input',
              'a',
              'div',
              'span',
              'p',
              'h1',
              'h2',
              'h3',
              'h4',
              'h5',
              'h6',
              'img',
              'form',
              'label',
              'textarea',
              'select',
              'option',
              'ul',
              'ol',
              'li',
              'section',
              'header',
              'footer',
              'nav',
            ]);

            let xPos = startX;
            let i = 0;
            const len = line.length;

            const draw = (text: string, color: [number, number, number]) => {
              if (!text) return;
              doc.setTextColor(color[0], color[1], color[2]);
              doc.text(text, xPos, y);
              xPos += doc.getTextWidth(text);
            };

            const isNameChar = (ch: string) => /[A-Za-z0-9_:-]/.test(ch);

            while (i < len) {
              const ch = line[i];
              if (ch === '<') {
                // '<' or '</'
                draw('<', colorDefault);
                i++;
                if (line[i] === '/') {
                  draw('/', colorDefault);
                  i++;
                }
                // tag name
                let name = '';
                while (i < len && isNameChar(line[i])) {
                  name += line[i++];
                }
                draw(name, keywordSet.has(name) ? colorKeyword : colorDefault);
                // attributes until '>'
                while (i < len && line[i] !== '>') {
                  if (line[i] === ' ') {
                    // preserve spacing
                    let spaces = '';
                    while (i < len && line[i] === ' ') spaces += line[i++];
                    draw(spaces, colorDefault);
                    continue;
                  }
                  // attribute name
                  let attr = '';
                  while (i < len && isNameChar(line[i])) attr += line[i++];
                  if (attr)
                    draw(
                      attr,
                      keywordSet.has(attr) ? colorKeyword : colorDefault,
                    );
                  // optional = and value
                  if (line[i] === '=') {
                    draw('=', colorDefault);
                    i++;
                    let quote = '';
                    if (line[i] === '"' || line[i] === "'") {
                      quote = line[i++];
                      draw(quote, colorString);
                      let val = '';
                      while (i < len && line[i] !== quote) val += line[i++];
                      draw(val, colorString);
                      if (line[i] === quote) {
                        draw(quote, colorString);
                        i++;
                      }
                    }
                  }
                  // other chars inside tag
                  if (line[i] && line[i] !== '>' && line[i] !== ' ') {
                    draw(line[i], colorDefault);
                    i++;
                  }
                }
                if (line[i] === '>') {
                  draw('>', colorDefault);
                  i++;
                }
              } else {
                // text outside tags
                let textRun = '';
                while (i < len && line[i] !== '<') textRun += line[i++];
                draw(textRun, colorDefault);
              }
            }
          };

          doc.setTextColor(51, 65, 85);
          lines.forEach((ln: string) => {
            drawHighlightedHtmlLine(ln, codeTextX + 2, cursorY);
            cursorY += lineH;
          });
        }
        // Custom drawing for message container with colored background
        if (data.cell.raw && (data.cell.raw as any)._isMessageContainer) {
          const { x, y, width, height } = data.cell;
          const padding = 6;
          const cornerRadius = 6;

          // Draw the colored background container
          doc.setDrawColor(162, 173, 243); // Same color for border
          doc.setLineWidth(0.5);
          doc.roundedRect(
            x + padding - 8,
            y + padding - 8,
            width - padding + 12,
            height - padding - 7,
            2,
            2,
            'D',
          );

          // Draw message icon before the text using simple shapes
          const iconSize = 4;
          const iconX = x + padding - 3;
          const iconY = y + padding - 4;

          // Add the message icon image
          try {
            doc.addImage(
              messageIconImage,
              'PNG',
              iconX,
              iconY,
              iconSize,
              iconSize,
            );
          } catch (error) {
          }

          // Reset text color for the content
        }

        // Custom drawing for issue count icon (before text)
        if (data.cell.raw && (data.cell.raw as any)._isIssueCountIcon) {
          const { x, y, width, height } = data.cell;
          const iconSize = 5;

          // Draw colored line before the issue
          doc.setDrawColor(115, 131, 237); // #7383ED color
          doc.setLineWidth(0.2);
          doc.line(x, y - 1, x + width, y - 1);

          // Position icon before the text content
          const iconX = x - 2; // Small margin from left edge
          const iconY = y + 4;

          // Add the issue count icon image
          try {
            doc.addImage(
              (data.cell.raw as any)._issueCountIcon,
              'PNG',
              iconX,
              iconY,
              iconSize,
              iconSize,
            );
          } catch (error) {
          }
        }

        // Custom drawing for impact icon (after text)
        if (data.cell.raw && (data.cell.raw as any)._isImpactIcon) {
          const { x, y, width, height } = data.cell;
          const iconSize = 6;

          // Position icon right after the text content
          // Get text width to position icon after the translated issue text
          const textContent = (data.cell.raw as any).content;
          doc.setFont('NotoSans_Condensed-Regular', 'bold');
          doc.setFontSize(14);
          const textWidth = doc.getTextWidth(textContent);
          const iconX = x + textWidth + 1; // 5px margin after text
          const iconY = y + 4;

          // Add the impact icon image
          try {
            doc.addImage(
              (data.cell.raw as any)._impactIcon,
              'PNG',
              iconX,
              iconY,
              iconSize * 3, // Increase width by 50%
              iconSize, // Keep height the same
            );
          } catch (error) {
          }
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
        addPageWithBackground(doc, backgroundColor);
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
        (doc as any).lastAutoTable || (doc as any).autoTable?.previous || null;
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
        willDrawPage: (data: any) => {
          // Apply background color to any new pages created by autoTable
          // This is called before any content is drawn on the page
          if (data.pageNumber > 1) {
            doc.setFillColor(
              backgroundColor[0],
              backgroundColor[1],
              backgroundColor[2],
            );
            doc.rect(
              0,
              0,
              doc.internal.pageSize.getWidth(),
              doc.internal.pageSize.getHeight(),
              'F',
            );
          }
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
        (doc as any).lastAutoTable || (doc as any).autoTable?.previous || null;
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

// Extract issues from report structure
export function extractIssuesFromReport(report: any) {
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

export function mapIssueToImpact(message: string, code: any) {
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

export const generateShortPDF = async (
  reportData: {
    score: number;
    widgetInfo: { result: string };
    scriptCheckResult?: string;
    url: string;
  },
  currentLanguage: string,
  domain: string,
  organizationName: string = 'WebAbility',
  organizationLogoUrl?: string,
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
  
  // Prioritize widget logo first - check if widget logo exists and is not the fallback
  const WIDGET_FALLBACK_LOGO = '/images/logo.png';
  const hasValidWidgetLogo = logoImage && logoImage !== WIDGET_FALLBACK_LOGO;
  const hasValidWidgetLogoUrl = logoUrl && logoUrl.trim() !== '';
  
  // Use widget logo if available, otherwise fall back to organization logo
  const finalLogoImage = hasValidWidgetLogo ? logoImage : (organizationLogoUrl || logoImage);
  const finalLogoUrl = hasValidWidgetLogoUrl ? logoUrl : (organizationLogoUrl || logoUrl || undefined);
  
  const WEBABILITY_SCORE_BONUS = 45;
  const MAX_TOTAL_SCORE = 95;
  const issues = extractIssuesFromReport(reportData);

  const baseScore = reportData.score || 0;
  const scriptCheckResult = reportData.scriptCheckResult;
  const widgetInfoResult = reportData.widgetInfo?.result;
  // Check both scriptCheckResult and widgetInfo.result for Web Ability
  // Handle variations: 'Web Ability', 'WebAbility', 'true', etc.
  const hasWebAbility = 
    scriptCheckResult === 'Web Ability' || 
    widgetInfoResult === 'Web Ability' ||
    scriptCheckResult === 'WebAbility' ||
    widgetInfoResult === 'WebAbility' ||
    scriptCheckResult === 'true' ||
    widgetInfoResult === 'true';

  const enhancedScore = hasWebAbility
    ? Math.min(baseScore + WEBABILITY_SCORE_BONUS, MAX_TOTAL_SCORE)
    : baseScore;

  let status: string, message: string, statusColor: [number, number, number];
  let statusKey: 'compliant' | 'partial' | 'non';
  if (enhancedScore >= 80) {
    statusKey = 'compliant';
    status = 'Compliant';
    message = 'Your website is highly accessible. Great job!';
    statusColor = [22, 163, 74]; // green-600
  } else if (enhancedScore >= 50) {
    statusKey = 'partial';
    status = 'Partially Compliant';
    message =
      'Your website is partially accessible.\nSome improvements are needed.';
    statusColor = [202, 138, 4]; // yellow-600
  } else {
    statusKey = 'non';
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
      `✓ ${organizationName} widget is actively protecting your site`,
      '✓ Automated accessibility fixes are applied',
      ' CRITICAL ACCESSIBILITY VIOLATIONS DETECTED',
      'Your website may face legal action and lose customers',
      'IMMEDIATE RISKS TO YOUR BUSINESS:',
      '• Potential lawsuits under ADA compliance regulations',
      '• Loss of 15% of potential customers (disabled users)',
      '• Google SEO penalties reducing search rankings',
      '• Damage to brand reputation and customer trust',
      'TIME-SENSITIVE ACTION REQUIRED:',
      `✓ ${organizationName} can fix most issues automatically`,
      '✓ Instant compliance improvement',
      '✓ Protect your business from legal risks TODAY',
      'Accessibility Statement',
      'WCAG 2.1 AA Compliance Issues for',
      'Auto-Fixed',
      ' Ready to use',
      'Need Action',
      '⚠ Review required',
      'Fix with AI',
      `use ${organizationName.toLowerCase()} to fix`,
      'Critical compliance gaps exposing your business to legal action',
    ],
    currentLanguage,
  );

  status = translatedStatus;

  // Set background color for all pages
  const backgroundColor: [number, number, number] = [238, 245, 255]; // White background
  doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
  doc.rect(
    0,
    0,
    doc.internal.pageSize.getWidth(),
    doc.internal.pageSize.getHeight(),
    'F',
  );

  // Remove old dark header bar; design now uses a clean light background

  // Helper function to add page with background color
  const addPageWithBackground = (
    doc: any,
    backgroundColor: [number, number, number],
  ) => {
    doc.addPage();
    doc.setFillColor(
      backgroundColor[0],
      backgroundColor[1],
      backgroundColor[2],
    );
    doc.rect(
      0,
      0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      'F',
    );
  };

  let logoBottomY = 0;

  if (finalLogoImage) {
    let imageLoadError = false;
    let logoBase64: string | null = null;
    let img: HTMLImageElement | null = null;
    let logoToTry = finalLogoImage;
    let fallbackLogo: string | null = null;

    // Set fallback logo based on which logo we're using
    if (hasValidWidgetLogo && finalLogoImage === logoImage) {
      // Using widget logo - set organization logo as fallback if available
      if (organizationLogoUrl) {
        fallbackLogo = organizationLogoUrl;
      }
    } else if (organizationLogoUrl && finalLogoImage === organizationLogoUrl) {
      // Using organization logo - set widget logo as fallback only if it's valid (not fallback)
      if (hasValidWidgetLogo) {
        fallbackLogo = logoImage;
      }
    }

    try {
      // Check if it's a cross-origin URL (http/https) - use fetch to avoid CORS issues
      if (logoToTry.startsWith('http://') || logoToTry.startsWith('https://')) {
        // For cross-origin URLs, use fetch to avoid CORS issues
        logoBase64 = await fetchImageAsBase64(logoToTry);
        if (!logoBase64) {
          // Fetch failed - try fallback logo if available
          if (fallbackLogo && fallbackLogo !== logoToTry) {
            logoToTry = fallbackLogo;
            logoBase64 = await fetchImageAsBase64(fallbackLogo);
            if (logoBase64) {
              const base64Img = new Image();
              base64Img.src = logoBase64;
              await new Promise<void>((resolve, reject) => {
                let settled = false;
                const TIMEOUT_MS = 5000;
                const cleanup = () => {
                  base64Img.onload = null;
                  base64Img.onerror = null;
                };
                const timeoutId = setTimeout(() => {
                  if (!settled) {
                    settled = true;
                    cleanup();
                    reject(new Error('Fallback logo load timed out'));
                  }
                }, TIMEOUT_MS);
                base64Img.onload = () => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(timeoutId);
                  cleanup();
                  resolve();
                };
                base64Img.onerror = () => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(timeoutId);
                  cleanup();
                  reject(new Error('Fallback logo failed to load'));
                };
              });
              img = base64Img;
            } else {
              // Fallback also failed
              imageLoadError = true;
            }
          } else {
            // No fallback available
            imageLoadError = true;
          }
        } else {
          // Create image from base64 to get dimensions
          const base64Img = new Image();
          base64Img.src = logoBase64;
          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const TIMEOUT_MS = 5000;

            const cleanup = () => {
              base64Img.onload = null;
              base64Img.onerror = null;
            };

            const timeoutId = setTimeout(() => {
              if (!settled) {
                settled = true;
                cleanup();
                reject(new Error('Logo image load timed out'));
              }
            }, TIMEOUT_MS);

            base64Img.onload = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              cleanup();
              resolve();
            };

            base64Img.onerror = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              cleanup();
              reject(new Error('Logo image failed to load'));
            };
          });
          img = base64Img;
        }
      } else {
        // Data URL or local path - use direct image loading
        const directImg = new Image();
        directImg.src = logoToTry;
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const TIMEOUT_MS = 5000;

          const cleanup = () => {
            directImg.onload = null;
            directImg.onerror = null;
          };

          const timeoutId = setTimeout(() => {
            if (!settled) {
              settled = true;
              cleanup();
              imageLoadError = true;
              reject(new Error('Logo image load timed out'));
            }
          }, TIMEOUT_MS);

          directImg.onload = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            resolve();
          };

          directImg.onerror = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            imageLoadError = true;
            reject(new Error('Logo image failed to load'));
          };
        });
        img = directImg;
      }
    } catch (err) {
      logoBottomY = 0;
      imageLoadError = true;
    }

    if (!imageLoadError && img) {
      // Make the logo and container bigger
      const maxWidth = 48,
        maxHeight = 36; // increased size for a bigger logo
      let drawWidth = img.width,
        drawHeight = img.height;
      const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
      drawWidth *= scale;
      drawHeight *= scale;

      // Logo position - top left corner with minimal padding
      const logoPadding = 8; // Reduced padding from top and left edges
      const logoX = logoPadding;
      const logoY = logoPadding;

      // Add logo image - use base64 if available (for cross-origin), otherwise use img element
      try {
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', logoX, logoY, drawWidth, drawHeight);
        } else if (img) {
          doc.addImage(img, 'PNG', logoX, logoY, drawWidth, drawHeight);
        }
      } catch (addImageError) {
      }

      if (finalLogoUrl) {
        doc.link(logoX, logoY, drawWidth, drawHeight, {
          url: finalLogoUrl,
          target: '_blank',
        });
      }

      logoBottomY = logoY + drawHeight
    }
  }

  // --- HEADER AREA (Figma-aligned) ---
  const pageWidth = doc.internal.pageSize.getWidth();
  // Adjust header position to align with logo row
  const headerTopY = Math.max(logoBottomY || 0, 30) + 5; // Ensure minimum spacing from top

  // Date and scanned URL text positioned at top right corner of the page
  const scannedHost = (() => {
    try {
      return new URL(reportData.url).hostname || reportData.url;
    } catch {
      return reportData.url;
    }
  })();
  doc.setFont('NotoSans_Condensed-Regular');
  doc.setFontSize(9);
  // Set date color to #A2ADF3
  doc.setTextColor(162, 173, 243);
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
  // Position at top right corner with reduced padding (moved further right)
  const topRightPadding = 12; // Reduced padding to move further right
  const topRightY = 10; // Fixed position from top
  doc.text(`${formattedDate}`, pageWidth - topRightPadding, topRightY, {
    align: 'right',
  });
  // Reset color for scanner info
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${translatedLabel}${scannedHost}`,
    pageWidth - topRightPadding,
    topRightY + 6,
    {
      align: 'right',
    },
  );

  // Compliance status - positioned directly under the WebAbility logo
  const cardX = 8; // Align with logo left edge (logoPadding)
  const cardY = (logoBottomY || 0) + 14; // Moved down to position entire section lower

  // Circular progress indicator with status-specific styling - Figma design
  const badgeCX = cardX + 15; // Position on the left side
  const badgeCY = cardY + 15; // Centered position for larger badge
  const badgeR = 12; // Larger radius to match Figma design

  // Determine colors and icon based on status
  let outerRingColor: [number, number, number];
  let innerFillColor: [number, number, number];
  let iconColor: [number, number, number];
  let progressPercentage: number;

  if (statusKey === 'compliant') {
    outerRingColor = [34, 197, 94]; // Bright green ring (green-500)
    innerFillColor = [240, 253, 244]; // Light green fill (green-50)
    iconColor = [34, 197, 94]; // Bright green checkmark (green-500)
    progressPercentage = 0.95; // 95% filled
  } else if (statusKey === 'partial') {
    outerRingColor = [202, 138, 4]; // yellow-600
    innerFillColor = [254, 252, 232]; // yellow-50
    iconColor = [245, 158, 11]; // yellow-500
    progressPercentage = 0.65; // 65% filled
  } else {
    // Not Compliant
    outerRingColor = [220, 38, 38]; // red-600
    innerFillColor = [254, 242, 242]; // red-50
    iconColor = [239, 68, 68]; // red-500
    progressPercentage = 0.25; // 25% filled
  }

  // Draw outer ring
  doc.setDrawColor(...outerRingColor);
  doc.setLineWidth(3.2);
  doc.circle(badgeCX, badgeCY, badgeR, 'S');

  // Draw inner fill
  doc.setFillColor(...innerFillColor);
  doc.circle(badgeCX, badgeCY, badgeR - 3, 'F');

  // Draw progress arc based on status
  doc.setDrawColor(...iconColor);
  doc.setLineWidth(2.5);
  if ((doc as any).setLineCap) {
    (doc as any).setLineCap('round');
  }

  // Draw progress arc (from top, clockwise)
  const startAngle = -Math.PI / 2; // Start from top
  const endAngle = startAngle + 2 * Math.PI * progressPercentage;

  // Draw the progress arc
  for (let angle = startAngle; angle <= endAngle; angle += 0.1) {
    const x1 = badgeCX + Math.cos(angle) * (badgeR - 1.5);
    const y1 = badgeCY + Math.sin(angle) * (badgeR - 1.5);
    const x2 = badgeCX + Math.cos(angle + 0.1) * (badgeR - 1.5);
    const y2 = badgeCY + Math.sin(angle + 0.1) * (badgeR - 1.5);
    doc.line(x1, y1, x2, y2);
  }

  // Draw status-specific icon in center - compact size
  doc.setDrawColor(...iconColor);
  doc.setLineWidth(1.5); // Reduced line width for smaller icon
  if ((doc as any).setLineCap) {
    (doc as any).setLineCap('round');
  }

  if (statusKey === 'compliant') {
    // Draw checkmark - larger size for Figma design
    doc.line(badgeCX - 4, badgeCY + 1, badgeCX - 1, badgeCY + 4);
    doc.line(badgeCX - 1, badgeCY + 4, badgeCX + 5, badgeCY - 3);
  } else if (statusKey === 'partial') {
    // Draw exclamation mark - larger size
    doc.line(badgeCX, badgeCY - 4, badgeCX, badgeCY + 2);
    doc.line(badgeCX, badgeCY + 4, badgeCX, badgeCY + 5);
  } else {
    // Not Compliant
    // Draw X mark - larger size
    doc.line(badgeCX - 4, badgeCY - 4, badgeCX + 4, badgeCY + 4);
    doc.line(badgeCX + 4, badgeCY - 4, badgeCX - 4, badgeCY + 4);
  }

  // Status text positioned to the right of the icon - Figma design
  doc.setTextColor(0, 0, 0); // Black color for status text
  doc.setFont('NotoSans_Condensed-Regular');
  doc.setFontSize(20); // Increased font size for better visibility
  const statusTextX = badgeCX + 18; // Increased spacing from icon
  const statusTextY = badgeCY - 8; // Align with center of icon
  doc.text(status, statusTextX, statusTextY);

  // Percentage pill positioned in the same row as status text - Figma design
  const pillText = `${Math.round(enhancedScore)}%`;
  doc.setFontSize(10); // Increased font size for Figma design
  const textWidth = doc.getTextWidth(pillText);
  const horizontalPadding = 4; // Reduced padding for tighter fit
  const pillTextWidth = textWidth + horizontalPadding * 2; // Total width with padding
  const pillH = 4; // Increased height for better appearance
  const pillX = statusTextX + doc.getTextWidth(status) + 34; // Increased spacing from status text to prevent overlap
  const pillY = statusTextY - 6; // Align with status text
  const pillTotalHeight = pillH + 4; // Total height of the pill
  // Convert #222D73 to RGB: R=34, G=45, B=115
  doc.setFillColor(34, 45, 115);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(pillX, pillY, pillTextWidth, pillTotalHeight, 4, 4, 'F'); // Increased corner radius for more pill-like appearance
  // Center the text both horizontally and vertically within the pill
  const textX = pillX + (pillTextWidth - textWidth) / 2;
  const textY = pillY + pillTotalHeight / 2 + 1.5; // Center vertically with baseline offset
  doc.text(pillText, textX, textY);

  // Sub message positioned below the status text and percentage pill - Figma design
  message = translatedMessage;
  doc.setFontSize(10); // Increased font size for Figma design
  doc.setTextColor(71, 85, 105); // Gray color for message
  // Split message into lines if it contains \n
  const messageLines = message.split('\n');
  let messageY = statusTextY + 12; // Maintained spacing below status text
  messageLines.forEach((line, index) => {
    doc.text(line, statusTextX, messageY + index * 6); // 6px spacing between lines
  });

  // Add "Great job!" message below the main message for Compliant status
  if (statusKey === 'compliant') {
    doc.setFontSize(9); // Slightly smaller font for secondary message
    doc.setTextColor(71, 85, 105); // Same gray color
    doc.text('Great job!', statusTextX, statusTextY + 20); // Maintained spacing below main message
  }

  // Cards positioned right-aligned with Compliant section on the left - ultra compact layout
  const cardSpacing = 4; // Minimal spacing for compact layout
  const totalErrorsCardWidth = 25; // Further reduced width for Total Errors card
  const totalErrorsCardHeight = 20; // Reduced height for Total Errors card
  const severityCardWidth = 40; // Further reduced width for Severity card
  const severityCardHeight = 20; // Reduced height for Severity card

  // Calculate right-aligned positioning
  const totalCardsWidth =
    totalErrorsCardWidth + severityCardWidth + cardSpacing;
  const rightMargin = 12; // Right margin from page edge
  const totalErrorsCardX = pageWidth - rightMargin - totalCardsWidth; // Right-aligned
  const totalErrorsCardY = cardY; // Same Y as compliance section

  // Total Errors card - no fill with reduced border width
  doc.setDrawColor(162, 173, 243); // Light blue border (#A2ADF3)
  doc.setLineWidth(0.3); // Reduced border line width
  doc.roundedRect(
    totalErrorsCardX,
    totalErrorsCardY,
    totalErrorsCardWidth,
    totalErrorsCardHeight,
    2, // Reduced corner radius
    2,
    'D', // Draw only (no fill)
  );

  // Title: "Total Errors" - dark blue color, positioned to the left
  doc.setTextColor(21, 101, 192); // Dark blue color for title
  doc.setFont('NotoSans_Condensed-Regular');
  doc.setFontSize(8); // Increased font size for better readability
  doc.text(
    translatedTotalErrors,
    totalErrorsCardX + 6, // Moved to the left (6px from left edge)
    totalErrorsCardY + 8, // Moved down
    { align: 'left' },
  );

  // Number: Large, prominent display in dark color, positioned to the left with reduced spacing
  doc.setTextColor(30, 30, 30); // Dark, almost black color for the number
  doc.setFontSize(18); // Increased font size for better prominence
  doc.text(
    `${issues.length}`,
    totalErrorsCardX + 6, // Moved to the left (6px from left edge)
    totalErrorsCardY + 14, // Moved down with title
    {
      align: 'left',
    },
  );

  // Severity list card - positioned to the right of Total Errors card (right-aligned)
  let severityCardX = totalErrorsCardX + totalErrorsCardWidth + cardSpacing;
  let severityCardY = cardY; // Same Y as compliance section

  // Ensure severity card doesn't go out of page (should not happen with right-alignment)
  if (severityCardX + severityCardWidth > pageWidth - 12) {
    // If it would overflow, position it below the Total Errors card instead
    severityCardX = totalErrorsCardX;
    severityCardY = cardY + totalErrorsCardHeight + 8;
  }

  // Severity card - no fill with reduced border width
  doc.setDrawColor(162, 173, 243); // Light blue border (#A2ADF3)
  doc.setLineWidth(0.3); // Reduced border line width
  doc.roundedRect(
    severityCardX,
    severityCardY,
    severityCardWidth,
    severityCardHeight,
    2, // Reduced corner radius
    2,
    'D', // Draw only (no fill)
  );

  const severityCounts = {
    severe: issues.filter(
      (i) => i.impact === 'critical' || i.impact === 'serious',
    ).length,
    moderate: issues.filter((i) => i.impact === 'moderate').length,
    mild:
      issues.length -
      (issues.filter((i) => i.impact === 'critical').length +
        issues.filter((i) => i.impact === 'serious').length +
        issues.filter((i) => i.impact === 'moderate').length),
  } as const;

  const sevLineX = severityCardX + 4;
  let sevLineY = severityCardY + 5; // Further reduced starting position for compact height
  doc.setFontSize(8); // Increased font size for better readability
  // Severe - red text (matching image)
  doc.setTextColor(220, 38, 38); // Red color
  doc.text(`${translatedSevere}`, sevLineX, sevLineY);
  doc.setTextColor(30, 30, 30); // Dark, almost black color for count
  doc.text(
    `${severityCounts.severe}`,
    severityCardX + severityCardWidth - 4,
    sevLineY,
    {
      align: 'right',
    },
  );
  // Moderate - orange text (matching image)
  sevLineY += 5; // Further reduced line spacing for compact height
  doc.setTextColor(202, 138, 4); // Orange color
  doc.text(`${translatedModerate}`, sevLineX, sevLineY);
  doc.setTextColor(30, 30, 30); // Dark, almost black color for count
  doc.text(
    `${severityCounts.moderate}`,
    severityCardX + severityCardWidth - 4,
    sevLineY,
    {
      align: 'right',
    },
  );
  // Mild - blue text (matching image)
  sevLineY += 5; // Further reduced line spacing for compact height
  doc.setTextColor(33, 150, 243); // Blue color
  doc.text(`${translatedMild}`, sevLineX, sevLineY);
  doc.setTextColor(30, 30, 30); // Dark, almost black color for count
  doc.text(
    `${severityCounts.mild}`,
    severityCardX + severityCardWidth - 4,
    sevLineY,
    {
      align: 'right',
    },
  );
  // --- END HEADER AREA ---

  // Compute a reference Y for subsequent sections based on header
  // Calculate bottom position based on the compliance status elements
  const complianceBottomY = Math.max(
    badgeCY + badgeR + 10, // Icon bottom + padding
    statusTextY + 12 + 10, // Sub message bottom + padding
  );
  const headerBottomY = Math.max(complianceBottomY, severityCardY + 30);

  // Start Y for category grid
  const yStart = headerBottomY + 12;

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
      doc.line(x + size * 0.6, y + size * 0.2, x + size * 0.8, y + size * 0.2);
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
      doc.line(x + size * 0.2, y + size * 0.8, x + size * 0.8, y + size * 0.2);
      doc.line(x + size * 0.8, y + size * 0.2, x + size * 0.6, y + size * 0.4);
      doc.line(x + size * 0.8, y + size * 0.2, x + size * 0.6, y + size * 0.2);
      // Small arrow
      doc.line(x + size * 0.3, y + size * 0.7, x + size * 0.7, y + size * 0.3);
      doc.line(
        x + size * 0.7,
        y + size * 0.3,
        x + size * 0.55,
        y + size * 0.45,
      );
      doc.line(x + size * 0.7, y + size * 0.3, x + size * 0.55, y + size * 0.3);
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
      doc.rect(x + size * 0.1, y + size * 0.45, size * 0.15, size * 0.15, 'S');
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
      doc.ellipse(x + size * 0.5, y + size * 0.5, size * 0.4, size * 0.25, 'S');
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
      doc.line(x + size * 0.3, y + size * 0.45, x + size * 0.3, y + size * 0.8);
      doc.line(
        x + size * 0.15,
        y + size * 0.6,
        x + size * 0.45,
        y + size * 0.6,
      );
      // Arrows indicating movement
      doc.setLineWidth(0.2);
      doc.line(x + size * 0.6, y + size * 0.3, x + size * 0.8, y + size * 0.3);
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
    rawCategories.set(functionName, (rawCategories.get(functionName) || 0) + 1);

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

  let nextY = yStart - 10; // Moved up more from summary boxes

  if (categoryData.length > 0) {
    // Section header
    // No horizontal separator in the new design

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Black color
    doc.setFont('NotoSans_Condensed-Regular');
    doc.text(translatedIssuesDetectedByCategory, 12, nextY + 8, {
      align: 'left',
    });
    let currentY = nextY + 18;

    // Define category colors to match the Figma design - all blue theme
    const categoryColors = new Map<string, [number, number, number]>([
      ['Content', [68, 90, 231]], // #445AE7 - new blue color
      ['Cognitive', [68, 90, 231]], // #445AE7 - new blue color
      ['Low Vision', [68, 90, 231]], // #445AE7 - new blue color
      ['Navigation', [68, 90, 231]], // #445AE7 - new blue color
      ['Mobility', [68, 90, 231]], // #445AE7 - new blue color
      ['Other', [68, 90, 231]], // #445AE7 - new blue color
      ['Forms', [68, 90, 231]], // #445AE7 - new blue color
    ]);

    // Card layout - 2 columns, 3 rows to match the updated design
    const itemsPerRow = 2;
    const cardWidth = 90; // Increased width for better spacing
    const cardHeight = 20; // Height to match Figma
    const cardSpacing = 6; // Increased spacing for 2-column layout
    const startX = 10; // Centered start position for wider 2-column layout
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

      // Transparent card - no fill, just border
      doc.setDrawColor(162, 173, 243); // #A2ADF3 border color
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1, 1, 'D');

      // Category icon in colored rounded rectangle - left side like Figma design
      const iconWidth = 8; // Width for the blue icon section
      const iconHeight = cardHeight - 4; // Full height minus small padding
      const iconX = x + 2;
      const iconY = y + 2;

      // Colored rounded rectangle background for icon - blue like Figma
      doc.setFillColor(...categoryColor);
      doc.roundedRect(iconX, iconY, iconWidth, iconHeight, 1, 1, 'F');

      // Add white icon centered in the blue rectangle
      const svgIcon = iconMap.get(category);
      if (svgIcon) {
        // Add the SVG icon in white (centered in rectangle)
        const svgSize = Math.min(iconWidth - 4, iconHeight - 4); // Fit within rectangle
        const svgOffsetX = (iconWidth - svgSize) / 2; // Center horizontally
        const svgOffsetY = (iconHeight - svgSize) / 2; // Center vertically
        doc.addImage(
          svgIcon,
          'PNG',
          iconX + svgOffsetX,
          iconY + svgOffsetY,
          svgSize,
          svgSize,
        );
      } else {
        // Draw simple white icon shapes centered in rectangle
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);

        const iconCenterX = iconX + iconWidth / 2;
        const iconCenterY = iconY + iconHeight / 2;

        if (category === 'Content') {
          // Nested diamond/square outlines like Figma - really tiny
          doc.setLineWidth(0.05);
          // Outer square
          doc.rect(iconCenterX - 0.3, iconCenterY - 0.3, 0.6, 0.6, 'S');
          // Middle square (offset)
          doc.rect(iconCenterX - 0.2, iconCenterY - 0.2, 0.4, 0.4, 'S');
          // Inner square (offset)
          doc.rect(iconCenterX - 0.1, iconCenterY - 0.1, 0.2, 0.2, 'S');
        } else if (category === 'Cognitive') {
          // Simple brain icon - really tiny circle
          doc.setLineWidth(0.05);
          doc.circle(iconCenterX, iconCenterY, 0.25, 'S');
          // Tiny starburst
          doc.line(
            iconCenterX + 0.1,
            iconCenterY - 0.02,
            iconCenterX + 0.15,
            iconCenterY - 0.05,
          );
          doc.line(
            iconCenterX + 0.1,
            iconCenterY - 0.02,
            iconCenterX + 0.12,
            iconCenterY - 0.08,
          );
        } else if (category === 'Low Vision') {
          // Simple eye icon - really tiny
          doc.setLineWidth(0.05);
          doc.ellipse(iconCenterX, iconCenterY, 0.25, 0.15, 'S');
          doc.circle(iconCenterX, iconCenterY, 0.08, 'F');
        } else if (category === 'Navigation') {
          // Simple arrow icon - really tiny
          doc.setLineWidth(0.05);
          doc.line(
            iconCenterX - 0.15,
            iconCenterY + 0.1,
            iconCenterX + 0.15,
            iconCenterY - 0.1,
          );
          doc.line(
            iconCenterX + 0.15,
            iconCenterY - 0.1,
            iconCenterX + 0.08,
            iconCenterY - 0.02,
          );
          doc.line(
            iconCenterX + 0.15,
            iconCenterY - 0.1,
            iconCenterX + 0.12,
            iconCenterY - 0.1,
          );
        } else if (category === 'Mobility') {
          // Simple person in wheelchair icon - really tiny
          doc.setLineWidth(0.05);
          doc.circle(iconCenterX, iconCenterY - 0.1, 0.08, 'F'); // Head
          doc.rect(iconCenterX - 0.02, iconCenterY - 0.02, 0.04, 0.1, 'F'); // Body
          // Wheelchair wheels
          doc.circle(iconCenterX - 0.1, iconCenterY + 0.1, 0.08, 'S');
          doc.circle(iconCenterX + 0.1, iconCenterY + 0.1, 0.08, 'S');
        } else {
          // Simple info icon - three really tiny circles
          doc.setLineWidth(0.05);
          doc.circle(iconCenterX - 0.1, iconCenterY - 0.1, 0.05, 'F');
          doc.circle(iconCenterX, iconCenterY, 0.05, 'F');
          doc.circle(iconCenterX + 0.1, iconCenterY + 0.1, 0.05, 'F');
          doc.line(
            iconCenterX - 0.1,
            iconCenterY - 0.1,
            iconCenterX,
            iconCenterY,
          );
          doc.line(
            iconCenterX,
            iconCenterY,
            iconCenterX + 0.1,
            iconCenterY + 0.1,
          );
        }
      }

      // Category name (to the right of blue rectangle)
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('NotoSans_Condensed-Regular');
      const categoryX = x + iconWidth + 6; // Start after the blue rectangle
      const categoryY = y + 6;
      doc.text(category, categoryX, categoryY);

      // Right-aligned count text (no pill in Figma)
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont('NotoSans_Condensed-Regular');
      const countText = count.toString();
      const countX = x + cardWidth - 3;
      const countY = categoryY;
      doc.text(countText, countX, countY, { align: 'right' });

      // Progress bar at bottom - matching Figma design
      const progressBarWidth = cardWidth - iconWidth - 10; // Account for blue rectangle
      const progressBarHeight = 2;
      const progressBarX = x + iconWidth + 6; // Start after the blue rectangle
      const progressBarY = y + cardHeight - 10;

      // Progress bar background - light blue-grey like Figma
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(
        progressBarX,
        progressBarY,
        progressBarWidth,
        progressBarHeight,
        1,
        1,
        'F',
      );

      // Progress bar fill - medium blue like Figma
      const fillWidth = (progressBarWidth * percentage) / 100;
      if (fillWidth > 1) {
        doc.setFillColor(68, 90, 231); // #445AE7 - new blue color
        doc.roundedRect(
          progressBarX,
          progressBarY,
          fillWidth,
          progressBarHeight,
          1,
          1,
          'F',
        );
      }

      // Percentage text
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      doc.setFont('NotoSans_Condensed-Regular');
      doc.text(
        `${percentage.toFixed(1)}% of total issues`,
        x + iconWidth + 6, // Start after the blue rectangle
        y + cardHeight - 4,
      );
    });

    // Calculate the actual Y position after all cards are drawn
    const totalRows = Math.ceil(orderedCategoryData.length / itemsPerRow);
    nextY = currentY + totalRows * (cardHeight + 6) + 15; // Added more spacing
  }

  // --- ACCESSIBILITY COMPLIANCE PANEL (matches Figma) ---
  const buildCompliancePanel = async (
    startY: number,
    hasWebAbility: boolean,
  ) => {
    const panelX = 8;
    const panelW = pageWidth - 20;
    const outerY = startY + 4; // Moved up

    // Main container (compliance vs non-compliance styling)
    const containerHeight = 90;
    if (hasWebAbility) {
      // Compliant state - light blue-grey background
      doc.setFillColor(255, 255, 255); // White background
      doc.setDrawColor(162, 173, 243); // Light blue border
    } else {
      // Non-compliant state - light red background
      doc.setFillColor(254, 242, 242); // Light red background (#fef2f2)
      doc.setDrawColor(248, 113, 113); // Red border (#f87171)
    }
    doc.setLineWidth(0.5);
    doc.roundedRect(panelX, outerY, panelW, containerHeight, 4, 4, 'FD');

    // Compliance status icon (top left)
    const shieldX = panelX + 8;
    const shieldY = outerY + 5;
    const shieldSize = 20;

    if (hasWebAbility) {
      // Compliant state - green shield with checkmark
      try {
        const img = new Image();
        img.src = greenSuccessImage;

        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const TIMEOUT_MS = 3000; // 3 seconds timeout

          const cleanup = () => {
            img.onload = null;
            img.onerror = null;
          };

          const timeoutId = setTimeout(() => {
            if (!settled) {
              settled = true;
              cleanup();
              reject(new Error('Green success image load timed out'));
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
            reject(new Error('Green success image failed to load'));
          };
        });

        // Add the image to PDF
        doc.addImage(img, 'PNG', shieldX, shieldY, shieldSize, shieldSize);
      } catch (error) {

        // Fallback: Draw green shield background if image fails to load
        doc.setFillColor(34, 197, 94); // Bright green
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(0.8);

        // Shield shape (rounded rectangle with pointed bottom)
        doc.roundedRect(
          shieldX,
          shieldY,
          shieldSize * 0.7,
          shieldSize * 0.8,
          2,
          2,
          'F',
        );
        // Pointed bottom of shield
        doc.triangle(
          shieldX + shieldSize * 0.35 - 3,
          shieldY + shieldSize * 0.8,
          shieldX + shieldSize * 0.35,
          shieldY + shieldSize * 0.95,
          shieldX + shieldSize * 0.35 + 3,
          shieldY + shieldSize * 0.8,
          'F',
        );

        // White checkmark inside shield
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(2.5);
        const checkX = shieldX + shieldSize * 0.35;
        const checkY = shieldY + shieldSize * 0.4;
        doc.line(checkX - 4, checkY, checkX - 1.5, checkY + 3);
        doc.line(checkX - 1.5, checkY + 3, checkX + 5, checkY - 3);
      }
    } else {
      // Non-compliant state - red warning icon with exclamation mark
      // Red circle background
      doc.setFillColor(239, 68, 68); // Red background (#ef4444)
      doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(0.8);
      doc.circle(
        shieldX + shieldSize * 0.5,
        shieldY + shieldSize * 0.5,
        shieldSize * 0.4,
        'F',
      );

      // White exclamation mark inside circle
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(255, 255, 255);

      // Calculate center position of the circle
      const centerX = shieldX + shieldSize * 0.5;
      const centerY = shieldY + shieldSize * 0.5;
      const radius = shieldSize * 0.4;

      // Exclamation mark body (vertical line) - better proportioned
      const lineStartY = centerY - radius * 0.6; // Start higher
      const lineEndY = centerY - radius * 0.1; // End closer to center
      doc.setLineWidth(2.5);
      doc.setLineCap('round');
      doc.line(centerX, lineStartY, centerX, lineEndY);

      // Exclamation mark dot - positioned with proper gap
      const dotY = centerY + radius * 0.3;
      doc.circle(centerX, dotY, 1.3, 'F');
    }

    // Title text (to the right of icon)
    const titleX = shieldX + shieldSize + 4;
    const titleY = shieldY + 8;

    doc.setFont('NotoSans_Condensed-Regular');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0); // Dark text

    if (hasWebAbility) {
      doc.text(translatedAccessibilityComplianceAchieved, titleX, titleY);
    } else {
      doc.text(translatedCriticalViolationsDetected, titleX, titleY);
    }

    // Subtitle text
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105); // Gray text
    if (hasWebAbility) {
      doc.text(translatedWebsiteCompliant, titleX, titleY + 10);
    } else {
      doc.text(translatedLegalActionWarning, titleX, titleY + 10);
    }

    // Nested box for compliance status
    const innerX = panelX + 12;
    const innerY = outerY + 30;
    const innerW = panelW - 24;
    const innerH = 55;

    doc.setFillColor(255, 255, 255);
    if (hasWebAbility) {
      doc.setDrawColor(162, 173, 243); // #A2ADF3 border color for compliant
    } else {
      doc.setDrawColor(248, 113, 113); // Red border for non-compliant
    }
    doc.setLineWidth(0.5);
    doc.roundedRect(innerX, innerY, innerW, innerH, 3, 3, 'FD');

    // Status title
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont('NotoSans_Condensed-Regular');
    if (hasWebAbility) {
      doc.text(translatedComplianceStatus, innerX + 8, innerY + 8);
    } else {
      doc.text(translatedImmediateRisks, innerX + 8, innerY + 8);
    }

    // Status items with checkmarks or crosses
    const itemStartX = innerX + 8;
    const itemStartY = innerY + 16; // Increased spacing from title

    const drawGreenCheck = (x: number, y: number) => {
      // Simple green checkmark without circle background
      doc.setDrawColor(34, 197, 94); // Green color
      doc.setLineWidth(1.2); // Thinner lines for simple appearance
      doc.setLineCap('round'); // Rounded line ends

      // Draw simple checkmark shape
      doc.line(x - 1.5, y - 0.5, x - 0.3, y + 0.7);
      doc.line(x - 0.3, y + 0.7, x + 2, y - 2);
    };

    const drawRedCross = (x: number, y: number) => {
      // Simple red X mark
      doc.setDrawColor(239, 68, 68); // Red color (#ef4444)
      doc.setLineWidth(1.2);
      doc.setLineCap('round');

      // Draw X shape
      doc.line(x - 2, y - 2, x + 2, y + 2);
      doc.line(x - 2, y + 2, x + 2, y - 2);
    };

    if (hasWebAbility) {
      // Compliant state - show green checkmarks
      // First item
      drawGreenCheck(itemStartX, itemStartY);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(translatedWebAbilityProtecting, itemStartX + 8, itemStartY + 1);

      // Second item
      drawGreenCheck(itemStartX, itemStartY + 10);
      doc.text(
        translatedAutomatedFixesApplied,
        itemStartX + 8,
        itemStartY + 11,
      );

      // WCAG Compliance status
      drawGreenCheck(itemStartX, itemStartY + 20);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('WCAG 2.1 AA standards met', itemStartX + 8, itemStartY + 21);

      // Legal protection status
      drawGreenCheck(itemStartX, itemStartY + 30);
      doc.text('Legal compliance maintained', itemStartX + 8, itemStartY + 31);
    } else {
      // Non-compliant state - show red crosses and warning text
      // First item
      drawRedCross(itemStartX, itemStartY);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(translatedPotentialLawsuits, itemStartX + 8, itemStartY + 1);

      // Second item
      drawRedCross(itemStartX, itemStartY + 10);
      doc.text(translatedCustomerLoss, itemStartX + 8, itemStartY + 11);

      // Third item
      drawRedCross(itemStartX, itemStartY + 20);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(translatedSeoPenalties, itemStartX + 8, itemStartY + 21);

      // Fourth item
      drawRedCross(itemStartX, itemStartY + 30);
      doc.text(translatedBrandDamage, itemStartX + 8, itemStartY + 31);
    }

    return outerY + containerHeight + 12; // bottom Y with spacing
  };

  const panelBottomY = await buildCompliancePanel(nextY, hasWebAbility);
  // Update warningY position after warning section is complete
  let warningY = panelBottomY;
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
    addPageWithBackground(doc, backgroundColor);
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

    // Big container card background
    doc.setFillColor(255, 255, 255); // White background
    doc.setDrawColor(203, 213, 225); // Light border
    doc.setLineWidth(0.5);
    doc.roundedRect(10, currentY - 6, 190, containerHeight, 3, 3, 'FD');

    // Blue banner header section (full width of container) - ultra compact height
    doc.setFillColor(68, 90, 231);
    doc.roundedRect(10, currentY - 6, 190, 20, 3, 3, 'F'); // Ultra compact blue section

    // Cover bottom corners of blue section to make it rectangular at bottom
    doc.setFillColor(68, 90, 231);
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
      `${translatedWcagComplianceIssues} ${reportData.url}`,
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
      const response = await fetch('/images/report_icons/eye.svg');
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

          img.onerror = (error) => {
            resolve(null);
          };

          // Create data URL from SVG
          const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
          img.src = svgDataUrl;
        });
      } else {
      }
    } catch (error) {
    }


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
          addPageWithBackground(doc, backgroundColor);
          currentY = 15; // Reduced top margin for continuation pages
          pageRowCount = 0; // Reset row count for new page
        }

        // Recalculate y position with current page row count
        const cardY = currentY + pageRowCount * (issueCardHeight + 3); // Reduced row spacing for compact layout

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
        doc.roundedRect(x, cardY, issueCardWidth, issueCardHeight, 2, 2, 'FD');

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
      addPageWithBackground(doc, backgroundColor);
      currentY = 15; // Reset for new page
      pageRowCount = 0;
    }

    // Calculate final position for fixes more card - spanning full width
    const finalFixesMoreCardY = currentY + pageRowCount * (issueCardHeight + 3);
    const fixesMoreCardX = cardsStartX; // Start from leftmost position
    const fixesMoreCardWidth = issueCardWidth * 3 + issueCardSpacing * 2; // Width of 3 cards + spacing

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
