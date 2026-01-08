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
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Legal Action Response Plan');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState<{
    'legal-action-response-plan': boolean;
    'trusted-certification': boolean;
  }>({
    'legal-action-response-plan': false,
    'trusted-certification': false,
  });
  const previewIframeRef = useRef<HTMLIFrameElement>(null);


  const handlePreview = async (type: 'legal-action-response-plan' | 'trusted-certification') => {
    try {
      setIsLoadingPreview(true);

      const token = getAuthenticationCookie();
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Add domain as query parameter if available
      const domainParam = currentDomain ? `?domain=${encodeURIComponent(currentDomain)}` : '';
      
      const title = type === 'legal-action-response-plan' 
        ? 'Legal Action Response Plan' 
        : 'Trusted Certification';
      
      setPreviewTitle(title);
      
      // Fetch PDF from backend (same endpoint as download)
      const url = `${backendUrl}/download-pdf/${type}${domainParam}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load PDF for preview: ${response.status} ${response.statusText}`);
      }

      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      
      if (contentType && !contentType.includes('application/pdf')) {
        throw new Error('Response is not a PDF file');
      }

      // Create blob URL from PDF response
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      const pdfUrl = window.URL.createObjectURL(blob);
      
      // Clean up any previous PDF URL
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }
      
      // Set PDF URL for preview (modal will open after loading state ends)
      setPreviewPdfUrl(pdfUrl);
      setPreviewContent(''); // Clear HTML content
      setIsPreviewOpen(true);
      setIsLoadingPreview(false);
    } catch (error) {
      toast.error('Failed to load PDF preview. Please try again.');
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    // Clean up blob URL to prevent memory leaks
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    // Clear iframe src
    if (previewIframeRef.current) {
      previewIframeRef.current.src = '';
    }
    setIsPreviewOpen(false);
    setPreviewContent('');
    setIsLoadingPreview(false);
  };

  // Download PDF for Legal Action Response Plan from server
  const generateLegalActionResponsePlanPDF = async () => {
    try {
      setIsDownloading((prev) => ({ ...prev, 'legal-action-response-plan': true }));
      
      const token = getAuthenticationCookie();
      const backendUrl = process.env.REACT_APP_BACKEND_URL ;
      
      // Add domain as query parameter if available
      const domainParam = currentDomain ? `?domain=${encodeURIComponent(currentDomain)}` : '';
      
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
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Add domain as query parameter if available
      const domainParam = currentDomain ? `?domain=${encodeURIComponent(currentDomain)}` : '';
      
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
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading((prev) => ({ ...prev, 'trusted-certification': false }));
    }
  };

  useEffect(() => {
    // Handle HTML preview (fallback, though we're now using PDF)
    if (isPreviewOpen && previewContent && previewIframeRef.current && !previewPdfUrl) {
      const iframe = previewIframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(previewContent);
        iframeDoc.close();
      }
    }
  }, [isPreviewOpen, previewContent, previewPdfUrl]);
  
  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

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
                    className="px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium border-2 hover:shadow-sm w-full md:w-auto disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      borderColor: baseColors.brandPrimary,
                      color: baseColors.brandPrimary,
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoadingPreview) {
                        e.currentTarget.style.backgroundColor = baseColors.blueLight;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => handlePreview('legal-action-response-plan')}
                    disabled={isLoadingPreview}
                  >
                    {isLoadingPreview ? (
                      <>
                        <CircularProgress size={14} style={{ color: baseColors.brandPrimary }} />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Preview</span>
                    )}
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
                    className="px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium border-2 hover:shadow-sm w-full md:w-auto disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      borderColor: baseColors.brandPrimary,
                      color: baseColors.brandPrimary,
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoadingPreview) {
                        e.currentTarget.style.backgroundColor = baseColors.blueLight;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => handlePreview('trusted-certification')}
                    disabled={isLoadingPreview}
                  >
                    {isLoadingPreview ? (
                      <>
                        <CircularProgress size={14} style={{ color: baseColors.brandPrimary }} />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Preview</span>
                    )}
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
              height: '100vh',
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
              className="flex-1 overflow-hidden"
              style={{
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {previewPdfUrl ? (
                <div className="flex-1 w-full overflow-hidden" style={{ minHeight: '600px' }}>
                  <iframe
                    src={previewPdfUrl}
                    ref={previewIframeRef}
                    className="w-full h-full border-0"
                    title={previewTitle}
                    style={{
                      maxWidth: '100%',
                      width: '100%',
                      height: '100%',
                      minHeight: '600px',
                      overflow: 'hidden',
                      flex: 1,
                      display: 'block',
                    }}
                  />
                </div>
              ) : previewContent ? (
                <iframe
                  ref={previewIframeRef}
                  className="w-full h-full border-0"
                  title={previewTitle}
                  style={{
                    minHeight: '100%',
                  }}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LegalResources;

