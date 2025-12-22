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
    const currentYear = new Date().getFullYear();
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
      background: #091844;
      color: white;
      font-size: 20px;
      font-weight: 600;
      padding: 12px 20px;
      border-radius: 25px;
      margin: 30px 0 20px 0;
      display: inline-block;
    }
    h2 {
      background: #091844;
      color: white;
      font-size: 20px;
      font-weight: 600;
      padding: 12px 20px;
      border-radius: 25px;
      margin: 30px 0 15px 0;
      display: inline-block;
    }
    p {
      margin-bottom: 15px;
      text-align: justify;
      color: #333;
    }
    .card-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }
    .card-icon {
      width: 40px;
      height: 40px;
      min-width: 40px;
      background: #445AE7;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-icon svg {
      width: 24px;
      height: 24px;
    }
    .card-content {
      flex: 1;
    }
    .card-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #111827;
    }
    .card-text {
      color: #333;
      line-height: 1.6;
    }
    .notes-box {
      background-color: #f3f4f6;
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
    }
    .notes-box h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #111827;
    }
    .notes-box ol {
      margin-left: 20px;
    }
    .notes-box li {
      margin-bottom: 10px;
      color: #333;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .footer-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      font-weight: 600;
    }
    .footer-info {
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <h1>Purpose of This Document</h1>
  
  <p>This Legal Action Response Plan outlines the proactive and ongoing measures adopted by the website owner, manager, or sponsor to ensure equal access, effective communication, and digital accessibility for individuals with disabilities. These efforts are implemented in collaboration with ${organizationName}, a third-party digital accessibility specialist.</p>
  
  <h2>${organizationName} Accessibility Attestation</h2>
  
  <p>The Sponsor has adopted a sustainable, long-term digital accessibility strategy designed to improve usability and promote inclusive access to its website and associated digital assets.</p>
  
  <p>To support this commitment, the Sponsor has subscribed to ${organizationName}'s accessibility services, which are provided by certified accessibility professionals and experienced assistive technology testers, including individuals with disabilities.</p>
  
  <p>This Legal Action Response Plan remains applicable for the duration in which ${organizationName}'s services are enabled and the Sponsor's subscription remains active.</p>
  
  <h2>Accessibility Commitment and Standards</h2>
  
  <p>The Sponsor is actively improving and strengthening its conformance with ${organizationName}'s interpretation of the guidance provided by the World Wide Web Consortium (W3C), specifically the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA.</p>
  
  <p>Through the adoption of ${organizationName}'s solutions, the Sponsor has established a formal and ongoing strategy to promote equitable access, reduce accessibility barriers, and deliver an improved user experience for all users.</p>
  
  <h2>Key Tenets and Proactive Measures</h2>
  
  <div class="card-container">
    <div class="card">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="white"/>
          <path d="M14 2v6h6" fill="white"/>
          <circle cx="18" cy="18" r="3" fill="#445AE7"/>
          <path d="M17 18l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">Comprehensive Accessibility Plan</div>
        <div class="card-text">The Sponsor has implemented a structured and sustainable digital accessibility plan in collaboration with ${organizationName} to address accessibility on an ongoing basis.</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" fill="white"/>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" stroke="white" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">Accessibility Expertise</div>
        <div class="card-text">${organizationName} has been engaged as a third-party accessibility specialist. Its services are supported by certified professionals in accessibility core competencies who oversee monitoring, testing, and remediation efforts.</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" fill="white"/>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" stroke="white" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">Training and Tooling</div>
        <div class="card-text">The Sponsor has access to accessibility training resources and tools designed to promote best practices and support continued awareness of digital accessibility requirements.</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="white"/>
          <circle cx="9" cy="7" r="4" fill="white"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="white"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="white"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">Public Grievance Process</div>
        <div class="card-text">A public accessibility feedback mechanism enables users to report accessibility concerns. Submissions are reviewed and prioritized by ${organizationName}'s accessibility experts, with two-way communication maintained until resolution.</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="white"/>
          <path d="M14 2v6h6" fill="white"/>
          <path d="M16 13H8M16 17H8M10 9H8" stroke="white" stroke-width="2"/>
          <circle cx="18" cy="18" r="3" fill="#445AE7"/>
          <path d="M17 18l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">Accessibility Statement</div>
        <div class="card-text">The Sponsor publishes and maintains a public-facing Accessibility Statement describing its accessibility efforts, ongoing improvements, and commitment to digital inclusion.</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3v18h18" stroke="white" stroke-width="2" fill="none"/>
          <path d="M7 16l4-4 4 4 6-6" stroke="white" stroke-width="2" fill="none"/>
          <circle cx="18" cy="6" r="2" fill="white"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">Continuous Monitoring and Testing</div>
        <div class="card-text">${organizationName} conducts automated and usage-based accessibility monitoring on a recurring basis. This continuous evaluation focuses on pages most relevant to the end-user experience and remains active for the duration of the service engagement.</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3v18h18" stroke="white" stroke-width="2" fill="none"/>
          <path d="M7 12h2v6H7zm4-4h2v10h-2zm4-4h2v14h-2z" fill="white"/>
          <path d="M18 6l2 2-2 2" stroke="white" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">Progress Toward Accessibility Conformance</div>
        <div class="card-text">${organizationName}'s technology dynamically applies remediations for certain programmatically detectable accessibility issues, supporting continuous improvement toward WCAG 2.2 Level AA conformance.</div>
      </div>
    </div>
  </div>
  
  <h2>Accessibility Help Desk and Personalization Tools</h2>
  
  <p>The ${organizationName} Accessibility Help Desk enables users to report accessibility barriers for further investigation. The platform also provides personalization tools that allow users to adjust their browsing experience based on individual needs. These tools benefit a broad range of users, including individuals with visual, auditory, motor, cognitive, or neurological disabilities.</p>
  
  <h2>Ongoing Improvement and Certification</h2>
  
  <p>Through continual testing, remediation, validation, and feedback-driven updates, the Sponsor establishes and maintains an evolving accessibility baseline. Where appropriate, additional design or source-level improvements may be implemented to further enhance usability and accessibility.</p>
  
  <p>Based on ongoing monitoring and remediation efforts, ${organizationName} has granted the Sponsor ${organizationName} Trusted Certification Status. The Sponsor intends to report its accessibility status publicly through a certification statement made available on its website, reflecting current conformance levels and ongoing improvements.</p>
  
  <div class="notes-box">
    <h3>Additional Notes:</h3>
    <ol>
      <li>This Legal Action Response Plan applies to the primary domain and all associated subdomains listed by the Sponsor.</li>
      <li>${organizationName}'s accessibility services are delivered or overseen by certified professionals, including CPACC, WAS, and CPWA credential holders, in accordance with recognized accessibility standards and best practices.</li>
    </ol>
  </div>
  
  <div class="footer">
    <div class="footer-logo">
      <span style="color: #445AE7; font-size: 24px; font-weight: bold;">W</span>
      <span>${organizationName}</span>
    </div>
    <div class="footer-info">
      © ${organizationName} ${currentYear} | ${organizationName.toLowerCase().replace(/\s+/g, '')}.io | support@${organizationName.toLowerCase().replace(/\s+/g, '')}.io
    </div>
  </div>
</body>
</html>
    `;
    return content;
  };

  // Generate Trusted Certification HTML content
  const generateTrustedCertificationHTML = () => {
    const currentYear = new Date().getFullYear();
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
      background: #091844;
      color: white;
      font-size: 20px;
      font-weight: 600;
      padding: 12px 20px;
      border-radius: 25px;
      margin: 30px 0 20px 0;
      display: inline-block;
    }
    h2 {
      background: #091844;
      color: white;
      font-size: 20px;
      font-weight: 600;
      padding: 12px 20px;
      border-radius: 25px;
      margin: 30px 0 15px 0;
      display: inline-block;
    }
    p {
      margin-bottom: 15px;
      text-align: justify;
      color: #333;
    }
    strong {
      font-weight: 600;
    }
    ul {
      margin-left: 30px;
      margin-bottom: 15px;
      list-style-type: disc;
    }
    li {
      margin-bottom: 10px;
      color: #333;
    }
    .highlight-box {
      background-color: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .highlight-box p {
      margin-bottom: 10px;
      font-weight: 600;
    }
    .highlight-box ul {
      margin-top: 10px;
    }
    .certification-box {
      background-color: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .tagline {
      text-align: center;
      margin-top: 40px;
      font-size: 16px;
      font-weight: 600;
      font-style: italic;
      color: #445AE7;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <h1>Certification Overview</h1>
  
  <p>The <strong>Trusted by ${organizationName}</strong> certification represents a commitment to digital accessibility and inclusive user experiences. This certification confirms that the above-referenced website has partnered with ${organizationName} to help provide an accessible experience for website visitors.</p>
  
  <p>${organizationName}'s web accessibility certification process may involve a combination of automated testing and accessibility expert evaluation with the goals of identifying and reducing accessibility barriers, supporting conformance with recognized accessibility standards, and ensuring an optimal user experience for all users, regardless of individual ability.</p>
  
  <h2>Accessibility Standards and Compliance</h2>
  
  <p>${organizationName} continually monitors the most recent <strong>Web Content Accessibility Guidelines (WCAG)</strong> published by the <strong>World Wide Web Consortium (W3C)</strong>. The accessibility services applied to this website are intended to support ongoing progress toward WCAG 2.2 Level AA Success Criteria.</p>
  
  <p>${organizationName} monitors this website and, where applicable, the platform hosting it for potential accessibility issues related to WCAG Success Criteria. The services applied are routinely evaluated to support ongoing accessibility improvements. ${organizationName} also monitors relevant digital accessibility laws, regulations, and practices, including the Americans with Disabilities Act (ADA) and applicable state and international requirements.</p>
  
  <h2>Monitoring and User Support</h2>
  
  <div class="highlight-box">
    <p><strong>While ${organizationName}'s JavaScript is active, ${organizationName} attests that:</strong></p>
    <ul>
      <li>${organizationName} activation has been completed.</li>
      <li>Testing & Discovery is ongoing with continuous monitoring.</li>
      <li>Remediation and validation efforts are ongoing.</li>
      <li>The ${organizationName} Accessibility Help Desk is active.</li>
    </ul>
  </div>
  
  <p>These services may include automated evaluations, continuous monitoring, regularly scheduled expert audits, and periodic releases designed to improve accessibility and usability, including for users of assistive technologies. In this ongoing effort, ${organizationName}'s technology has already made progress in removing accessibility barriers and will continue to enhance the website over time.</p>
  
  <p>${organizationName} provides a 24/7 Accessibility Help Desk, allowing website visitors to report accessibility barriers or grievances should they be encountered. Submissions are reviewed and prioritized for resolution. The Help Desk also provides personalization tools that allow users to customize their browsing experience based on individual accessibility needs.</p>
  
  <h2>${organizationName} Statements</h2>
  
  <div class="highlight-box">
    <ul>
      <li>${organizationName} continually monitors the most recent WCAG guidance issued by the W3C</li>
      <li>${organizationName} has taken steps to help improve and maintain the accessibility of this website</li>
      <li>While the related JavaScript is active, ${organizationName} monitors this website and/or the platform hosting it for potential WCAG Success Criteria issues</li>
      <li>${organizationName} routinely evaluates the services applied to improve accessibility conformance.</li>
      <li>While the related JavaScript is active, ${organizationName} supports a 24/7 Accessibility Help Desk for reporting accessibility issues and grievances.</li>
      <li>${organizationName} offers support resources that promote accessibility best practices.</li>
      <li>While the related JavaScript is active, personalization tools are provided to help users customize their browsing experience.</li>
      <li>${organizationName} periodically monitors applicable digital accessibility laws and regulations, including the ADA and relevant international standards.</li>
    </ul>
  </div>
  
  <h2>Certification Status</h2>
  
  <p>Based on ongoing monitoring, remediation, validation, and support activities, ${organizationName} certifies that this website is actively monitored and remediated to improve accessibility conformance and overall usability.</p>
  
  <p>Accessibility efforts are reviewed on an ongoing basis, and adjustments may be applied to address identified barriers and support users of assistive technologies.</p>
  
  <p>Accordingly, the website has been granted <strong>${organizationName} Trusted Certification Status</strong>, which reflects an active accessibility program and remains valid while ${organizationName}'s services and related JavaScript remain enabled.</p>
  
  <div class="certification-box">
    <p>This certification reflects ongoing accessibility monitoring, remediation, and support activities conducted by ${organizationName}. Certification status remains valid only while ${organizationName} services and related JavaScript remain active on the website.</p>
  </div>
  
  <div class="tagline">
    <strong><em>${organizationName} - Making the web accessible for everyone</em></strong>
  </div>
  
  <div class="footer" style="margin-top: 40px;">
    TryWebAbility © TryWebAbility 2025 | trywebability.io | support@trywebability.io
  </div>
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

  // Download PDF for Legal Action Response Plan from server
  const generateLegalActionResponsePlanPDF = async () => {
    try {
      setIsDownloading((prev) => ({ ...prev, 'legal-action-response-plan': true }));
      
      const token = getAuthenticationCookie();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      // Add domain as query parameter if available
      console.log('Downloading PDF - Current Domain:', currentDomain);
      const domainParam = currentDomain ? `?domain=${encodeURIComponent(currentDomain)}` : '';
      console.log('Downloading PDF - Domain Param:', domainParam);
      
      const response = await fetch(`${backendUrl}/download-pdf/legal-action-response-plan${domainParam}`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Legal-Action-Response-Plan.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Legal Action Response Plan downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading((prev) => ({ ...prev, 'legal-action-response-plan': false }));
    }
  };

  // Download PDF for Trusted Certification from server
  const generateTrustedCertificationPDF = async () => {
    try {
      setIsDownloading((prev) => ({ ...prev, 'trusted-certification': true }));
      
      const token = getAuthenticationCookie();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      // Add domain as query parameter if available
      console.log('Downloading PDF - Current Domain:', currentDomain);
      const domainParam = currentDomain ? `?domain=${encodeURIComponent(currentDomain)}` : '';
      console.log('Downloading PDF - Domain Param:', domainParam);
      
      const response = await fetch(`${backendUrl}/download-pdf/trusted-certification${domainParam}`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Trusted-Certification.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Trusted Certification downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
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

