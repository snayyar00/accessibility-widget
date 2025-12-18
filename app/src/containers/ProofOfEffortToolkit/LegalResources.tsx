import React, { useState, useRef, useEffect } from 'react';
import { MdLock, MdFileDownload, MdClose } from 'react-icons/md';
import { CircularProgress } from '@mui/material';
import { toast } from 'sonner';
import { getAuthenticationCookie } from '@/utils/cookie';
import { baseColors } from '@/config/colors';
import useOrganizationName from '@/hooks/useOrganizationName';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';

const LegalResources: React.FC = () => {
  const organizationName = useOrganizationName();
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );
  const currentDomain = useSelector(
    (state: RootState) => state.report.selectedDomain,
  );
  const [activeLegalTab, setActiveLegalTab] = useState<'response-documents' | 'request-support'>('response-documents');
  const [legalSupportForm, setLegalSupportForm] = useState({
    complaintType: '',
    complaintDate: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD for date input
    name: '',
    email: '',
  });
  const [isSubmittingLegalSupport, setIsSubmittingLegalSupport] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('Legal Action Response Plan');
  const [isDownloading, setIsDownloading] = useState<{
    'legal-action-response-plan': boolean;
    'trusted-certification': boolean;
  }>({
    'legal-action-response-plan': false,
    'trusted-certification': false,
  });
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Generate Legal Action Response Plan HTML content
  const generateLegalActionResponsePlanHTML = () => {
    const content = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Legal Action Response Plan</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    h1 {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #111827;
    }
    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #111827;
    }
    p {
      margin-bottom: 15px;
      text-align: justify;
    }
    ul {
      margin-left: 30px;
      margin-bottom: 15px;
    }
    li {
      margin-bottom: 10px;
    }
    .intro {
      font-style: italic;
      margin-bottom: 20px;
      color: #555;
    }
    .section {
      margin-bottom: 25px;
    }
    .footnote {
      font-size: 12px;
      color: #666;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .footnote p {
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <h1>Legal Action Response Plan</h1>
  
  <p class="intro">Our solutions seek to improve the web's usability, providing everyone with an accessible and inclusive digital experience.</p>
  
  <h2>${organizationName} Attestation with Respect to the Website</h2>
  
  <p>In an effort to help ensure that individuals with disabilities have equal opportunity and effective communication needed to fully access the Website<sup>1</sup>, the Website's owner, manager, or sponsor (the "Sponsor") has adopted a sustainable, long-term digital accessibility strategy. The Sponsor has taken, or is in the process of taking, the following actions to help make its website equally accessible to all individuals, regardless of their abilities.</p>
  
  <p>Sponsor (or a representative of Sponsor) subscribed to accessibility offerings from ${organizationName}, a third-party web accessibility specialist that employs Certified Professionals in Accessibility Core Competencies<sup>2</sup> and experienced assistive technology testers (some of whom are individuals with disabilities).</p>
  
  <p>This Legal Action Response Plan shall remain applicable from the date of enablement of the JavaScript relating to ${organizationName}'s website offering through the date such enablement remains active and so long as Sponsor's ${organizationName} Subscription remains active.</p>
  
  <p>The Sponsor is improving and will continue to strengthen its conformance with ${organizationName}'s interpretation of the guidance provided by the World Wide Web Consortium's Web Content Accessibility Guidelines (WCAG).</p>
  
  <p>Through the adoption of the ${organizationName} accessibility offerings, Sponsor has established and began to execute a formal strategic plan to provide the equitable use of its digital assets and an optimal user experience for everyone.</p>
  
  <h2>Below are the key tenets and proactive steps of Sponsor's Legal Action Response Plan:</h2>
  
  <div class="section">
    <p><strong>Effectuate and Maintain a Comprehensive Plan:</strong> Upon Activation, and in collaboration with ${organizationName}, the Sponsor has established a sustainable plan for addressing digital accessibility.</p>
  </div>
  
  <div class="section">
    <p><strong>Employ Accessibility Specialists:</strong> Upon Activation, the Sponsor has employed ${organizationName}, a third-party web accessibility specialist that employs Certified Professionals in Accessibility Core Competencies to monitor and maintain the Sponsor's plan.</p>
  </div>
  
  <div class="section">
    <p><strong>Accessibility Training & Tooling:</strong> Upon Activation, the Sponsor gained access to an online training library to keep Sponsor up to date on accessibility best practices, as well as activating the Accessibility Help Desk for users with disabilities.</p>
  </div>
  
  <div class="section">
    <p><strong>Provide a Public "Grievance Process":</strong> Upon Activation, the ${organizationName} solution provided anyone the ability to submit an accessibility complaint which, complete with a feedback loop, allows end-users of the Website to report accessibility and usability issues to the dedicated Web Accessibility Subject Matter Experts at ${organizationName}. As issues are reported, ${organizationName} validates and prioritizes issues based on the end-user feedback. Submissions are responded to in a timely manner and two-way communication is available until issue resolution.</p>
  </div>
  
  <div class="section">
    <p><strong>Publish and Maintain Digital Accessibility Policy Statement:</strong> Upon Activation, the Sponsor began publishing an Accessibility Statement to inform end-users regarding the steps taken/ being taken to ensure equal access and to promote the Sponsor's ongoing commitment to address and prioritize digital inclusion.</p>
  </div>
  
  <div class="section">
    <p><strong>Regular Automated Testing:</strong> Upon Activation, ${organizationName} began tracking usage analytics. On regular intervals, ${organizationName} began conducting ongoing and continuous monitoring based on the usage analytics tracked by ${organizationName}. This always-on monitoring ensures that the pages being accessed by our Sponsor's end-users – the pertinent pages relative to the end-user's experience - are being evaluated for accessibility conformance. So long as the ${organizationName} Services remain active, ${organizationName} will maintain the always-on monitoring service.</p>
  </div>
  
  <div class="section">
    <p><strong>Continuous Progress towards Conformance with Prevailing Digital Accessibility Standards Current as of Effective Date: Web Content Accessibility Guidelines "WCAG" 2.2 Level AA:</strong> Upon Activation, the ${organizationName} solution began to dynamically apply remediations to address certain common issues that are programmatically detected. From the date of Activation, the Website began to improve accessibility by eliminating access barriers for end users.</p>
  </div>
  
  <p>After activation, the Sponsor has invested in and made available tools to aid users in reporting accessibility issues and personalization options for those seeking access to the site.</p>
  
  <p>The ${organizationName} Accessibility Help Desk allows organizations to provide their site visitors with a form for reporting accessibility barriers for further investigation by ${organizationName}.</p>
  
  <p>The Help Desk also provides personalization tools for users to customize their browsing experience. These tools have benefits for all site visitors, but, in particular, aging populations and individuals who have vision, hearing, motor and intellectual (cognitive) disabilities, those who are epileptic, color blind, dyslexic, or learning to read.</p>
  
  <p>With continual testing, remediation, and validation, coupled with the ability to make changes based on feedback, a new accessibility baseline and substantial conformance is achieved. The Sponsors can work with ${organizationName} to address the website-specific accessibility issues. To the extent warranted, Sponsor may implement design and source improvements to further improve usability and maximize conformance with accessibility best practices and standards. With remediation validated, ongoing monitoring enabled, and an ongoing remediation strategy in place, ${organizationName} has granted Sponsor ${organizationName} Trusted certification status.</p>
  
  <p>As the Sponsor continues to mature its accessibility policy, the Sponsor intends to report its conformance level publicly through a public-facing Certification Statement made available from the Website. The Certification Statement informs end-users of the current, up to date ${organizationName} Trusted Status and conformance level as the site continues to be updated regularly via the continuous monitoring services supplied by ${organizationName}.</p>
  
  <div class="footnote">
    <p><sup>1</sup> The Legal Action Response Plan applies to the domain and all subdomains listed on the front page.</p>
    <p><sup>2</sup> ${organizationName} engineers and SMEs include Certified Professionals in Accessibility Core Competencies (CPACC), Certified Web Accessibility Specialists (WAS), and/or Certified Professionals in Web Accessibility (CPWA) as maintained through the International Association of Accessibility Professionals (IAAP). All work supplied in fulfillment of the accessibility audits are conducted by ${organizationName} team members certified as a CPACC, WAS or CPWA, or their work is overseen by such a certified team member. Manual assistive technology (AT) testing is overseen by ${organizationName}'s Senior AT Testers, including credentialed Freedom Scientific JAWS Certified Tester(s). Over the past few years, the ${organizationName} team of accessibility engineers, SMEs, and testers has audited and remediated thousands of web domains and web applications. Today, on a daily basis, ${organizationName} – through the application of leading-edge dynamic remediation technology – serves billions of accessibility fixes across a network of clients who encompass some of the largest and most influential businesses and organizations in the world. ${organizationName}'s mission is to eradicate all barriers to digital accessibility.</p>
  </div>
</body>
</html>
    `;
    return content;
  };

  // Generate Trusted Certification HTML content
  const generateTrustedCertificationHTML = () => {
    const domain = currentDomain || 'your website';
    const content = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trusted Certification</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    h1 {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #111827;
    }
    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #111827;
    }
    p {
      margin-bottom: 15px;
      text-align: justify;
    }
    ul {
      margin-left: 30px;
      margin-bottom: 15px;
    }
    li {
      margin-bottom: 10px;
    }
    .domain {
      font-weight: 600;
      color: #111827;
    }
    .section {
      margin-bottom: 25px;
    }
    .highlight-box {
      background-color: #f3f4f6;
      border-left: 4px solid #445AE7;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>Trusted Certification</h1>
  
  <div class="section">
    <p><strong>This statement applies to:</strong> <span class="domain">${domain}</span></p>
  </div>
  
  <h2>How to use this document</h2>
  <p>If you receive a legal demand letter, send your Legal Action Response Plan and the ${organizationName} Trusted Certification to your attorney. These documents prove that you have partnered with ${organizationName} to provide an accessible experience for your website visitors.</p>
  
  <p>The Trusted by ${organizationName} badge represents a commitment to accessibility and digital inclusion. The ${organizationName} web accessibility certification process may involve a combination of automatic and accessibility expert testing with the goals of (i) identifying and resolving access barriers, (ii) conforming with the World Wide Web Consortium's (W3C) Web Content Accessibility Guidelines (WCAG) 2.2 Level AA Success Criteria, and (iii) ensuring an optimal user experience for all users, regardless of their individual abilities.</p>
  
  <div class="highlight-box">
    <p><strong>While ${organizationName}'s underlying JavaScript is active, ${organizationName} attests to the following:</strong></p>
    <ul>
      <li>${organizationName} Activation is complete.</li>
      <li>Testing & Discovery is ongoing with continuous monitoring.</li>
      <li>Remediation & Validation is ongoing.</li>
      <li>The ${organizationName} Accessibility Help Desk is active.</li>
    </ul>
  </div>
  
  <p>${organizationName} certifies that the website is being monitored and remediated with a goal of increasing conformance with WCAG 2.2 AA. In this ongoing effort, ${organizationName}'s technology has already made progress in removing access barriers and will continue to enhance this website for optimal accessibility and usability for all users.</p>
  
  <p>This service may also include regularly scheduled expert audits, and regular releases that help to improve access and usability for all users, including users of assistive technology.</p>
  
  <p>If you encounter access barriers or issues with any page or feature on this website that may present a challenge for website visitors looking to access this website, please submit your feedback through the Accessibility Help Desk.</p>
  
  <h2>${organizationName} statements</h2>
  <ul>
    <li>${organizationName} continually monitors the most recent Web Content Accessibility Guidelines (WCAG) set forth by the World Wide Web Consortium (W3C).</li>
    <li>${organizationName} has taken steps to help improve and maintain accessibility of this website.</li>
    <li>While the related JavaScript is active, ${organizationName} monitors this website and/or the platform hosting this website for possible violations of certain WCAG Success Criteria.</li>
    <li>${organizationName} routinely evaluates the services that are applied to this website and/or the platform hosting this website to help improve conformance with WCAG Success Criteria.</li>
    <li>${organizationName} offers support and resources that promote accessibility best practices.</li>
    <li>${organizationName} periodically monitors laws, regulations and practices regarding digital accessibility compliance, including but not limited to the Americans with Disabilities Act (ADA) and other similar state and international laws and regulations.</li>
    <li>While the related JavaScript is active, ${organizationName} supports a 24/7 Accessibility Help Desk for website visitors, which gives website visitors the ability to report accessibility issues and grievances should they be encountered. ${organizationName} prioritizes fixing accessibility issues when submitted via the Help Desk.</li>
    <li>While the related JavaScript is active, the ${organizationName} Accessibility Help Desk also provides web personalization tools permitting website visitors to address specific accessibility issues and to customize their user experience.</li>
  </ul>
</body>
</html>
    `;
    return content;
  };

  const handlePreview = (type: 'legal-action-response-plan' | 'trusted-certification') => {
    let htmlContent = '';
    let title = '';
    
    if (type === 'legal-action-response-plan') {
      htmlContent = generateLegalActionResponsePlanHTML();
      title = 'Legal Action Response Plan';
    } else {
      htmlContent = generateTrustedCertificationHTML();
      title = 'Trusted Certification';
    }
    
    setPreviewContent(htmlContent);
    setPreviewTitle(title);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewContent('');
  };

  // Helper function to add header with logo and date
  const addPDFHeader = async (doc: any, pageWidth: number, margin: number, fontLoaded: boolean, organizationLogoUrl?: string | null) => {
    let logoBottomY = 0;
    
    // Try to add organization logo
    if (organizationLogoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = organizationLogoUrl;
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Logo load timeout')), 3000);
          img.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Logo load failed'));
          };
        });

        const maxWidth = 45;
        const maxHeight = 35;
        const aspectRatio = img.width / img.height;
        let drawWidth = maxWidth;
        let drawHeight = maxWidth / aspectRatio;
        if (drawHeight > maxHeight) {
          drawHeight = maxHeight;
          drawWidth = maxHeight * aspectRatio;
        }

        const logoX = pageWidth - margin - drawWidth;
        const logoY = 15;
        doc.addImage(img, 'PNG', logoX, logoY, drawWidth, drawHeight);
        logoBottomY = logoY + drawHeight;
      } catch (e) {
        console.warn('Could not load logo:', e);
      }
    }

    // Add date in top-right corner with brand color
    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
    doc.setFontSize(9);
    doc.setTextColor(68, 90, 231); // Darker brand blue #445AE7
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.text(formattedDate, pageWidth - margin, 12, { align: 'right' });

    return Math.max(logoBottomY, 30);
  };

  // Helper function to add footer
  const addPDFFooter = (doc: any, pageWidth: number, pageHeight: number, margin: number, fontLoaded: boolean, pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 15;
    
    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (fontLoaded) {
      doc.setFont('NotoSans_Condensed-Regular', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.text(
      `${organizationName} - Making the web accessible for everyone`,
      margin,
      footerY,
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  };

  // Generate PDF for Legal Action Response Plan
  const generateLegalActionResponsePlanPDF = async () => {
    try {
      setIsDownloading((prev) => ({ ...prev, 'legal-action-response-plan': true }));
      
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

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const contentWidth = pageWidth - margin * 2;
      
      // White background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Add header
      let currentY = await addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined);
      currentY += 10;
      let pageNum = 1;

      // Professional title with brand color
      doc.setFontSize(28);
      doc.setTextColor(37, 99, 235); // Brand blue #2563EB
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text('Legal Action Response Plan', margin, currentY);
      currentY += 12;

      // Horizontal divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.7);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 15;

      // Intro
      doc.setFontSize(11);
      doc.setTextColor(85, 85, 85);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'italic');
      } else {
        doc.setFont('helvetica', 'italic');
      }
      const introText = 'Our solutions seek to improve the web\'s usability, providing everyone with an accessible and inclusive digital experience.';
      const introLines = doc.splitTextToSize(introText, contentWidth);
      doc.text(introLines, margin, currentY);
      currentY += introLines.length * 6 + 10;

      // Section: Attestation
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text(`${organizationName} Attestation with Respect to the Website`, margin, currentY);
      currentY += 10;

      // Content paragraphs
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      const paragraphs = [
        `In an effort to help ensure that individuals with disabilities have equal opportunity and effective communication needed to fully access the Website¹, the Website's owner, manager, or sponsor (the "Sponsor") has adopted a sustainable, long-term digital accessibility strategy. The Sponsor has taken, or is in the process of taking, the following actions to help make its website equally accessible to all individuals, regardless of their abilities.`,
        `Sponsor (or a representative of Sponsor) subscribed to accessibility offerings from ${organizationName}, a third-party web accessibility specialist that employs Certified Professionals in Accessibility Core Competencies² and experienced assistive technology testers (some of whom are individuals with disabilities).`,
        `This Legal Action Response Plan shall remain applicable from the date of enablement of the JavaScript relating to ${organizationName}'s website offering through the date such enablement remains active and so long as Sponsor's ${organizationName} Subscription remains active.`,
        `The Sponsor is improving and will continue to strengthen its conformance with ${organizationName}'s interpretation of the guidance provided by the World Wide Web Consortium's Web Content Accessibility Guidelines (WCAG).`,
        `Through the adoption of the ${organizationName} accessibility offerings, Sponsor has established and began to execute a formal strategic plan to provide the equitable use of its digital assets and an optimal user experience for everyone.`,
      ];

      paragraphs.forEach((para) => {
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 30;
        }
        const lines = doc.splitTextToSize(para, contentWidth);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 5 + 5;
      });

      // Key tenets section with divider
      if (currentY > pageHeight - 60) {
        addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
        doc.addPage();
        pageNum++;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
          // Header will be added asynchronously
        });
        currentY = 40;
      }
      
      // Section divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.7);
      doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
      currentY += 5;
      
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235); // Brand blue
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text('Key Tenets and Proactive Steps', margin, currentY);
      currentY += 12;

      const tenets = [
        { title: 'Effectuate and Maintain a Comprehensive Plan:', text: `Upon Activation, and in collaboration with ${organizationName}, the Sponsor has established a sustainable plan for addressing digital accessibility.` },
        { title: 'Employ Accessibility Specialists:', text: `Upon Activation, the Sponsor has employed ${organizationName}, a third-party web accessibility specialist that employs Certified Professionals in Accessibility Core Competencies to monitor and maintain the Sponsor's plan.` },
        { title: 'Accessibility Training & Tooling:', text: `Upon Activation, the Sponsor gained access to an online training library to keep Sponsor up to date on accessibility best practices, as well as activating the Accessibility Help Desk for users with disabilities.` },
        { title: 'Provide a Public "Grievance Process":', text: `Upon Activation, the ${organizationName} solution provided anyone the ability to submit an accessibility complaint which, complete with a feedback loop, allows end-users of the Website to report accessibility and usability issues to the dedicated Web Accessibility Subject Matter Experts at ${organizationName}. As issues are reported, ${organizationName} validates and prioritizes issues based on the end-user feedback. Submissions are responded to in a timely manner and two-way communication is available until issue resolution.` },
        { title: 'Publish and Maintain Digital Accessibility Policy Statement:', text: `Upon Activation, the Sponsor began publishing an Accessibility Statement to inform end-users regarding the steps taken/ being taken to ensure equal access and to promote the Sponsor's ongoing commitment to address and prioritize digital inclusion.` },
        { title: 'Regular Automated Testing:', text: `Upon Activation, ${organizationName} began tracking usage analytics. On regular intervals, ${organizationName} began conducting ongoing and continuous monitoring based on the usage analytics tracked by ${organizationName}. This always-on monitoring ensures that the pages being accessed by our Sponsor's end-users – the pertinent pages relative to the end-user's experience - are being evaluated for accessibility conformance. So long as the ${organizationName} Services remain active, ${organizationName} will maintain the always-on monitoring service.` },
        { title: 'Continuous Progress towards Conformance with Prevailing Digital Accessibility Standards Current as of Effective Date: Web Content Accessibility Guidelines "WCAG" 2.2 Level AA:', text: `Upon Activation, the ${organizationName} solution began to dynamically apply remediations to address certain common issues that are programmatically detected. From the date of Activation, the Website began to improve accessibility by eliminating access barriers for end users.` },
      ];

      tenets.forEach((tenet, index) => {
        if (currentY > pageHeight - 50) {
          addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
          doc.addPage();
          pageNum++;
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
            // Header will be added asynchronously
          });
          currentY = 40;
        }
        
        // Tenet number and title
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235); // Brand blue
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'bold');
        } else {
          doc.setFont('helvetica', 'bold');
        }
        const titleLines = doc.splitTextToSize(`${index + 1}. ${tenet.title}`, contentWidth);
        doc.text(titleLines, margin, currentY);
        currentY += titleLines.length * 5.5 + 4;
        
        // Tenet description
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'normal');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        const textLines = doc.splitTextToSize(tenet.text, contentWidth);
        doc.text(textLines, margin, currentY);
        currentY += textLines.length * 5.5 + 10;
      });

      // Additional paragraphs
      const additionalParagraphs = [
        `After activation, the Sponsor has invested in and made available tools to aid users in reporting accessibility issues and personalization options for those seeking access to the site.`,
        `The ${organizationName} Accessibility Help Desk allows organizations to provide their site visitors with a form for reporting accessibility barriers for further investigation by ${organizationName}.`,
        `The Help Desk also provides personalization tools for users to customize their browsing experience. These tools have benefits for all site visitors, but, in particular, aging populations and individuals who have vision, hearing, motor and intellectual (cognitive) disabilities, those who are epileptic, color blind, dyslexic, or learning to read.`,
        `With continual testing, remediation, and validation, coupled with the ability to make changes based on feedback, a new accessibility baseline and substantial conformance is achieved. The Sponsors can work with ${organizationName} to address the website-specific accessibility issues. To the extent warranted, Sponsor may implement design and source improvements to further improve usability and maximize conformance with accessibility best practices and standards. With remediation validated, ongoing monitoring enabled, and an ongoing remediation strategy in place, ${organizationName} has granted Sponsor ${organizationName} Trusted certification status.`,
        `As the Sponsor continues to mature its accessibility policy, the Sponsor intends to report its conformance level publicly through a public-facing Certification Statement made available from the Website. The Certification Statement informs end-users of the current, up to date ${organizationName} Trusted Status and conformance level as the site continues to be updated regularly via the continuous monitoring services supplied by ${organizationName}.`,
      ];

      // Additional content section
      if (currentY > pageHeight - 60) {
        addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
        doc.addPage();
        pageNum++;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
          // Header will be added asynchronously
        });
        currentY = 40;
      }
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.7);
      doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
      currentY += 10;

      additionalParagraphs.forEach((para) => {
        if (currentY > pageHeight - 50) {
          addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
          doc.addPage();
          pageNum++;
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
            // Header will be added asynchronously
          });
          currentY = 40;
        }
        const lines = doc.splitTextToSize(para, contentWidth);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 5.5 + 6;
      });

      // Footnotes section
      if (currentY > pageHeight - 80) {
        addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
        doc.addPage();
        pageNum++;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
          // Header will be added asynchronously
        });
        currentY = 40;
      }
      
      // Footnotes divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.7);
      doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
      currentY += 10;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text('¹ The Legal Action Response Plan applies to the domain and all subdomains listed on the front page.', margin, currentY);
      currentY += 8;
      const footnote2 = `² ${organizationName} engineers and SMEs include Certified Professionals in Accessibility Core Competencies (CPACC), Certified Web Accessibility Specialists (WAS), and/or Certified Professionals in Web Accessibility (CPWA) as maintained through the International Association of Accessibility Professionals (IAAP). All work supplied in fulfillment of the accessibility audits are conducted by ${organizationName} team members certified as a CPACC, WAS or CPWA, or their work is overseen by such a certified team member. Manual assistive technology (AT) testing is overseen by ${organizationName}'s Senior AT Testers, including credentialed Freedom Scientific JAWS Certified Tester(s). Over the past few years, the ${organizationName} team of accessibility engineers, SMEs, and testers has audited and remediated thousands of web domains and web applications. Today, on a daily basis, ${organizationName} – through the application of leading-edge dynamic remediation technology – serves billions of accessibility fixes across a network of clients who encompass some of the largest and most influential businesses and organizations in the world. ${organizationName}'s mission is to eradicate all barriers to digital accessibility.`;
      const footnote2Lines = doc.splitTextToSize(footnote2, contentWidth);
      doc.text(footnote2Lines, margin, currentY);

      // Add footer to all pages
      for (let i = 1; i <= pageNum; i++) {
        doc.setPage(i);
        addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, i, pageNum);
      }

      // Save PDF
      doc.save('Legal-Action-Response-Plan.pdf');
      toast.success('Legal Action Response Plan downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading((prev) => ({ ...prev, 'legal-action-response-plan': false }));
    }
  };

  // Generate PDF for Trusted Certification
  const generateTrustedCertificationPDF = async () => {
    try {
      setIsDownloading((prev) => ({ ...prev, 'trusted-certification': true }));
      
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

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const contentWidth = pageWidth - margin * 2;
      
      // White background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Add header
      let currentY = await addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined);
      currentY += 10;
      let pageNum = 1;
      const domain = currentDomain || 'your website';

      // Professional title with brand color
      doc.setFontSize(28);
      doc.setTextColor(37, 99, 235); // Brand blue #2563EB
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text('Trusted Certification', margin, currentY);
      currentY += 12;

      // Horizontal divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.7);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 15;

      // Statement applies to
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(`This statement applies to: `, margin, currentY);
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      const domainWidth = doc.getTextWidth('This statement applies to: ');
      doc.text(domain, margin + domainWidth, currentY);
      currentY += 15;

      // How to use section with divider
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235); // Brand blue
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text('How to use this document', margin, currentY);
      currentY += 12;

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      const paragraphs = [
        `If you receive a legal demand letter, send your Legal Action Response Plan and the ${organizationName} Trusted Certification to your attorney. These documents prove that you have partnered with ${organizationName} to provide an accessible experience for your website visitors.`,
        `The Trusted by ${organizationName} badge represents a commitment to accessibility and digital inclusion. The ${organizationName} web accessibility certification process may involve a combination of automatic and accessibility expert testing with the goals of (i) identifying and resolving access barriers, (ii) conforming with the World Wide Web Consortium's (W3C) Web Content Accessibility Guidelines (WCAG) 2.2 Level AA Success Criteria, and (iii) ensuring an optimal user experience for all users, regardless of their individual abilities.`,
      ];

      paragraphs.forEach((para) => {
        if (currentY > pageHeight - 50) {
          addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
          doc.addPage();
          pageNum++;
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
            // Header will be added asynchronously
          });
          currentY = 40;
        }
        const lines = doc.splitTextToSize(para, contentWidth);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 5.5 + 6;
      });

      // Attestation box with professional styling
      // Calculate box dimensions based on content
      const attestationTitle = `While ${organizationName}'s underlying JavaScript is active, ${organizationName} attests to the following:`;
      const attestationTitleLines = doc.splitTextToSize(attestationTitle, contentWidth - 20);
      const titleHeight = attestationTitleLines.length * 5.5;
      
      const attestations = [
        `${organizationName} Activation is complete.`,
        `Testing & Discovery is ongoing with continuous monitoring.`,
        `Remediation & Validation is ongoing.`,
        `The ${organizationName} Accessibility Help Desk is active.`,
      ];
      const bulletHeight = attestations.length * 7;
      const boxPadding = 12;
      const attestationBoxHeight = titleHeight + bulletHeight + boxPadding * 2 + 8;
      
      // Check if box fits on current page
      if (currentY + attestationBoxHeight > pageHeight - 50) {
        addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
        doc.addPage();
        pageNum++;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
          // Header will be added asynchronously
        });
        currentY = 40;
      }
      
      // Professional highlight box with white background and blue border
      const boxStartY = currentY;
      const boxPaddingX = 10;
      
      // Draw box with white background
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin - boxPaddingX, boxStartY, contentWidth + boxPaddingX * 2, attestationBoxHeight, 4, 4, 'F');
      
      // Draw blue border
      doc.setDrawColor(68, 90, 231); // Brand primary blue #445AE7
      doc.setLineWidth(1.5);
      doc.roundedRect(margin - boxPaddingX, boxStartY, contentWidth + boxPaddingX * 2, attestationBoxHeight, 4, 4, 'D');
      
      // Title inside box - bold blue text
      currentY = boxStartY + boxPadding;
      doc.setFontSize(11);
      doc.setTextColor(68, 90, 231); // Brand primary blue
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text(attestationTitleLines, margin, currentY);
      currentY += titleHeight + 8;

      // Bullet points inside box - black text
      attestations.forEach((attestation) => {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0); // Black text for bullets
        if (fontLoaded) {
          doc.setFont('NotoSans_Condensed-Regular', 'normal');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(`• ${attestation}`, margin + 5, currentY);
        currentY += 7;
      });
      
      // Move to after the box
      currentY = boxStartY + attestationBoxHeight + 15;

      // More paragraphs
      const moreParagraphs = [
        `${organizationName} certifies that the website is being monitored and remediated with a goal of increasing conformance with WCAG 2.2 AA. In this ongoing effort, ${organizationName}'s technology has already made progress in removing access barriers and will continue to enhance this website for optimal accessibility and usability for all users.`,
        `This service may also include regularly scheduled expert audits, and regular releases that help to improve access and usability for all users, including users of assistive technology.`,
        `If you encounter access barriers or issues with any page or feature on this website that may present a challenge for website visitors looking to access this website, please submit your feedback through the Accessibility Help Desk.`,
      ];

      moreParagraphs.forEach((para) => {
        if (currentY > pageHeight - 50) {
          addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
          doc.addPage();
          pageNum++;
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
            // Header will be added asynchronously
          });
          currentY = 40;
        }
        const lines = doc.splitTextToSize(para, contentWidth);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 5.5 + 6;
      });

      // Statements section with divider
      if (currentY > pageHeight - 60) {
        addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
        doc.addPage();
        pageNum++;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
          // Header will be added asynchronously
        });
        currentY = 40;
      }
      
      // Section divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.7);
      doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
      currentY += 5;
      
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235); // Brand blue
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'bold');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      doc.text(`${organizationName} Statements`, margin, currentY);
      currentY += 12;

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      if (fontLoaded) {
        doc.setFont('NotoSans_Condensed-Regular', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      const statements = [
        `${organizationName} continually monitors the most recent Web Content Accessibility Guidelines (WCAG) set forth by the World Wide Web Consortium (W3C).`,
        `${organizationName} has taken steps to help improve and maintain accessibility of this website.`,
        `While the related JavaScript is active, ${organizationName} monitors this website and/or the platform hosting this website for possible violations of certain WCAG Success Criteria.`,
        `${organizationName} routinely evaluates the services that are applied to this website and/or the platform hosting this website to help improve conformance with WCAG Success Criteria.`,
        `${organizationName} offers support and resources that promote accessibility best practices.`,
        `${organizationName} periodically monitors laws, regulations and practices regarding digital accessibility compliance, including but not limited to the Americans with Disabilities Act (ADA) and other similar state and international laws and regulations.`,
        `While the related JavaScript is active, ${organizationName} supports a 24/7 Accessibility Help Desk for website visitors, which gives website visitors the ability to report accessibility issues and grievances should they be encountered. ${organizationName} prioritizes fixing accessibility issues when submitted via the Help Desk.`,
        `While the related JavaScript is active, the ${organizationName} Accessibility Help Desk also provides web personalization tools permitting website visitors to address specific accessibility issues and to customize their user experience.`,
      ];

      statements.forEach((statement) => {
        if (currentY > pageHeight - 40) {
          addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, pageNum, 0);
          doc.addPage();
          pageNum++;
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          addPDFHeader(doc, pageWidth, margin, fontLoaded, organization?.logo_url || undefined).then((y) => {
            // Header will be added asynchronously
          });
          currentY = 40;
        }
        const lines = doc.splitTextToSize(`• ${statement}`, contentWidth);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 5.5 + 6;
      });

      // Add footer to all pages
      for (let i = 1; i <= pageNum; i++) {
        doc.setPage(i);
        addPDFFooter(doc, pageWidth, pageHeight, margin, fontLoaded, i, pageNum);
      }

      // Save PDF
      doc.save('Trusted-Certification.pdf');
      toast.success('Trusted Certification downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading((prev) => ({ ...prev, 'trusted-certification': false }));
    }
  };

  useEffect(() => {
    if (isPreviewOpen && previewContent && previewIframeRef.current) {
      const iframe = previewIframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(previewContent);
        iframeDoc.close();
      }
    }
  }, [isPreviewOpen, previewContent]);

  const handleSubmitLegalSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLegalSupport) return;

    setIsSubmittingLegalSupport(true);
    try {
      const token = getAuthenticationCookie();

      // Format date for backend (convert YYYY-MM-DD to readable format)
      const formattedDate = new Date(legalSupportForm.complaintDate).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/request-support`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ...legalSupportForm,
            complaintDate: formattedDate,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Legal support request submitted successfully!');
        setLegalSupportForm({
          complaintType: '',
          complaintDate: new Date().toISOString().split('T')[0],
          name: '',
          email: '',
        });
      } else {
        toast.error(data.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting legal support request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmittingLegalSupport(false);
    }
  };

  return (
    <div 
      className="mb-12 p-6 rounded-xl border-2 shadow-sm transition-all duration-300 hover:shadow-md w-full"
      style={{ 
        backgroundColor: baseColors.blueSection,
        borderColor: baseColors.cardBorderPurple,
      }}
    >
      <div className="w-full">
        {/* Tabs */}
        <div className="mb-8 border-b" style={{ borderColor: baseColors.cardBorderPurple }}>
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveLegalTab('response-documents')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeLegalTab === 'response-documents'
                  ? 'text-[#445AE7] font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                borderBottomColor: activeLegalTab === 'response-documents' ? baseColors.brandPrimary : 'transparent',
              }}
            >
              Response documents
            </button>
            <button
              onClick={() => setActiveLegalTab('request-support')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeLegalTab === 'request-support'
                  ? 'text-[#445AE7] font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                borderBottomColor: activeLegalTab === 'request-support' ? baseColors.brandPrimary : 'transparent',
              }}
            >
              Request legal support
            </button>
          </div>
        </div>

        {/* Content */}
        {activeLegalTab === 'response-documents' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Panel - Info */}
            <div className="lg:w-1/3">
              <div className="mb-4">
                <div className="mb-4 p-3 rounded-lg inline-flex items-center justify-center" style={{ backgroundColor: baseColors.white }}>
                  <MdLock className="w-6 h-6" style={{ color: baseColors.brandPrimary }} />
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: baseColors.grayDark2 }}>
                  Response documents
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: baseColors.grayText }}>
                  If you receive a demand letter, send these documents to your attorney.
                </p>
              </div>
            </div>

            {/* Right Panel - Document Cards */}
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Legal Action Response Plan Card */}
              <div 
                className="rounded-lg p-6 bg-white shadow-sm border-2 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                style={{ borderColor: baseColors.cardBorderPurple }}
              >
                <h3 className="text-lg font-semibold mb-3" style={{ color: baseColors.grayDark2 }}>
                  Legal Action Response Plan
                </h3>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: baseColors.grayText }}>
                  {organizationName}'s Legal Action Response Plan is an auto-generated report demonstrating your commitment to digital accessibility. It may assist with legal challenges.
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    className="px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium border-2 hover:shadow-sm w-full md:w-auto"
                    style={{
                      borderColor: baseColors.brandPrimary,
                      color: baseColors.brandPrimary,
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = baseColors.blueLight;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => handlePreview('legal-action-response-plan')}
                  >
                    Preview
                  </button>
                  <button
                    className="px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 border-2 hover:shadow-sm w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: isDownloading['legal-action-response-plan'] ? baseColors.grayMuted : baseColors.grayBorder,
                      color: isDownloading['legal-action-response-plan'] ? baseColors.grayMuted : baseColors.grayText,
                      backgroundColor: baseColors.grayLight,
                    }}
                    onMouseEnter={(e) => {
                      if (!isDownloading['legal-action-response-plan']) {
                        e.currentTarget.style.backgroundColor = baseColors.grayLighter;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = baseColors.grayLight;
                    }}
                    onClick={generateLegalActionResponsePlanPDF}
                    disabled={isDownloading['legal-action-response-plan']}
                  >
                    {isDownloading['legal-action-response-plan'] ? (
                      <>
                        <CircularProgress size={14} style={{ color: baseColors.grayMuted }} />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <MdFileDownload className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Trusted Certification Card */}
              <div 
                className="rounded-lg p-6 bg-white shadow-sm border-2 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                style={{ borderColor: baseColors.cardBorderPurple }}
              >
                <h3 className="text-lg font-semibold mb-3" style={{ color: baseColors.grayDark2 }}>
                  Trusted Certification
                </h3>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: baseColors.grayText }}>
                  The Trusted Certification showcases your commitment to using {organizationName} for digital accessibility. It is displayed within the Accessibility Help Desk when activated on your site.
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    className="px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium border-2 hover:shadow-sm w-full md:w-auto"
                    style={{
                      borderColor: baseColors.brandPrimary,
                      color: baseColors.brandPrimary,
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = baseColors.blueLight;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => handlePreview('trusted-certification')}
                  >
                    Preview
                  </button>
                  <button
                    className="px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 border-2 hover:shadow-sm w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: isDownloading['trusted-certification'] ? baseColors.grayMuted : baseColors.grayBorder,
                      color: isDownloading['trusted-certification'] ? baseColors.grayMuted : baseColors.grayText,
                      backgroundColor: baseColors.grayLight,
                    }}
                    onMouseEnter={(e) => {
                      if (!isDownloading['trusted-certification']) {
                        e.currentTarget.style.backgroundColor = baseColors.grayLighter;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = baseColors.grayLight;
                    }}
                    onClick={generateTrustedCertificationPDF}
                    disabled={isDownloading['trusted-certification']}
                  >
                    {isDownloading['trusted-certification'] ? (
                      <>
                        <CircularProgress size={14} style={{ color: baseColors.grayMuted }} />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <MdFileDownload className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLegalTab === 'request-support' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Panel - Info */}
            <div className="lg:w-1/3">
              <div className="mb-4">
                <div className="mb-4 p-3 rounded-lg inline-flex items-center justify-center" style={{ backgroundColor: baseColors.white }}>
                  <MdLock className="w-6 h-6" style={{ color: baseColors.brandPrimary }} />
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: baseColors.grayDark2 }}>
                  Request legal support
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: baseColors.grayText }}>
                  {organizationName} provides additional legal support services for accessibility-related complaints. If you receive a legal claim, please contact us immediately. A {organizationName} representative will contact you within 48 hours via your provided email to discuss available options and next steps.
                </p>
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="lg:w-2/3">
              <div 
                className="bg-white rounded-lg p-6 shadow-sm border-2"
                style={{ borderColor: baseColors.cardBorderPurple }}
              >
                <h3 className="text-lg font-semibold mb-6" style={{ color: baseColors.grayDark2 }}>
                  Complaint details
                </h3>
                <form onSubmit={handleSubmitLegalSupport}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: baseColors.grayLabel }}>
                        Type of complaint <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={legalSupportForm.complaintType}
                        onChange={(e) =>
                          setLegalSupportForm({
                            ...legalSupportForm,
                            complaintType: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-all duration-200"
                        style={{
                          borderColor: baseColors.grayInput,
                          borderWidth: '1px',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = baseColors.brandPrimary;
                          e.currentTarget.style.boxShadow = `0 0 0 2px ${baseColors.blueLight}`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = baseColors.grayInput;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Select complaint type</option>
                        <option value="Legal Demand Letter">Legal Demand Letter</option>
                        <option value="Lawsuit">Lawsuit</option>
                        <option value="Notice of Breach of Settlement Agreement">Notice of Breach of Settlement Agreement</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: baseColors.grayLabel }}>
                        Date of complaint <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          value={legalSupportForm.complaintDate}
                          onChange={(e) =>
                            setLegalSupportForm({
                              ...legalSupportForm,
                              complaintDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-all duration-200"
                          style={{
                            borderColor: baseColors.grayInput,
                            borderWidth: '1px',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = baseColors.brandPrimary;
                            e.currentTarget.style.boxShadow = `0 0 0 2px ${baseColors.blueLight}`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = baseColors.grayInput;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: baseColors.grayLabel }}>
                        Your name
                      </label>
                      <input
                        type="text"
                        value={legalSupportForm.name}
                        onChange={(e) =>
                          setLegalSupportForm({
                            ...legalSupportForm,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-all duration-200"
                        style={{
                          borderColor: baseColors.grayInput,
                          borderWidth: '1px',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = baseColors.brandPrimary;
                          e.currentTarget.style.boxShadow = `0 0 0 2px ${baseColors.blueLight}`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = baseColors.grayInput;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: baseColors.grayLabel }}>
                        Your email address
                      </label>
                      <input
                        type="email"
                        value={legalSupportForm.email}
                        onChange={(e) =>
                          setLegalSupportForm({
                            ...legalSupportForm,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-all duration-200"
                        style={{
                          borderColor: baseColors.grayInput,
                          borderWidth: '1px',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = baseColors.brandPrimary;
                          e.currentTarget.style.boxShadow = `0 0 0 2px ${baseColors.blueLight}`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = baseColors.grayInput;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div className="mt-6 flex justify-center">
                      <button
                        type="submit"
                        disabled={isSubmittingLegalSupport}
                        className="px-6 py-3 rounded-md font-medium transition-all duration-200 inline-flex items-center justify-center hover:shadow-md"
                        style={{
                          minHeight: '40px',
                          color: baseColors.white,
                          backgroundColor: isSubmittingLegalSupport ? baseColors.grayMuted : baseColors.brandPrimary,
                          border: 'none',
                          cursor: isSubmittingLegalSupport ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSubmittingLegalSupport) {
                            e.currentTarget.style.backgroundColor = baseColors.brandPrimaryHover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSubmittingLegalSupport) {
                            e.currentTarget.style.backgroundColor = baseColors.brandPrimary;
                          }
                        }}
                      >
                        {isSubmittingLegalSupport ? (
                          <>
                            <CircularProgress size={16} className="mr-2" style={{ color: baseColors.white }} />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <span>Submit request</span>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Side Panel */}
      {isPreviewOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={handleClosePreview}
          />
          
          {/* Side Panel - Opens from Right */}
          <div 
            className="fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out translate-x-0"
            style={{
              width: 'min(90vw, 1000px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div 
              className="flex items-center justify-between p-6 border-b flex-shrink-0"
              style={{ borderColor: baseColors.cardBorderPurple }}
            >
              <h2 className="text-2xl font-bold" style={{ color: baseColors.grayDark2 }}>
                {previewTitle}
              </h2>
              <button
                onClick={handleClosePreview}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close preview"
              >
                <MdClose className="w-6 h-6" style={{ color: baseColors.grayText }} />
              </button>
            </div>

            {/* Panel Content */}
            <div 
              className="flex-1 overflow-auto"
              style={{
                minHeight: 0,
              }}
            >
              <iframe
                ref={previewIframeRef}
                className="w-full h-full border-0"
                title="Legal Action Response Plan Preview"
                style={{
                  minHeight: '100%',
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LegalResources;

