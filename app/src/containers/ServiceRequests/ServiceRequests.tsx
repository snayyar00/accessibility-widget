import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useQuery } from '@apollo/client';
import { FiFile, FiVideo, FiUser, FiPlus, FiFolderPlus, FiFolder, FiSearch, FiFileText, FiUsers, FiArrowRight } from 'react-icons/fi';
import { MdClosedCaption, MdCheckCircle } from 'react-icons/md';
import GetQuoteModal from './GetQuoteModal';
import BookMeetingModal from './BookMeetingModal';
import getUserQuoteRequestsQuery from '@/queries/serviceRequests/getUserQuoteRequests';
import { baseColors } from '@/config/colors';

const ServiceRequests: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: 'Service Requests' });

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isBookMeetingModalOpen, setIsBookMeetingModalOpen] = useState(false);

  // Fetch user's quote requests
  const { data: quoteRequestsData, loading: quotesLoading, refetch: refetchQuotes } = useQuery(getUserQuoteRequestsQuery);

  const handleGetQuote = () => {
    setIsQuoteModalOpen(true);
  };

  const handleBookMeeting = () => {
    setIsBookMeetingModalOpen(true);
  };

  const handleCloseQuoteModal = () => {
    setIsQuoteModalOpen(false);
    // Refetch quotes after closing modal to get updated data
    refetchQuotes();
  };

  const handleCloseBookMeetingModal = () => {
    setIsBookMeetingModalOpen(false);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      // Handle MySQL timestamp format (YYYY-MM-DD HH:MM:SS) or ISO format
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'N/A';
    }
  };

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 ';
      case 'reviewed':
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200';
      case 'quoted':
        return 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200';
      case 'accepted':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
      case 'rejected':
        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200';
      case 'completed':
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200';
    }
  };

  // Helper function to format project type
  const formatProjectType = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const quoteRequests = quoteRequestsData?.getUserQuoteRequests || [];
  
  // Debug: Log the first quote request to see the date format and report_link
  if (quoteRequests.length > 0) {
    console.log('📅 First quote request data:', {
      id: quoteRequests[0].id,
      created_at: quoteRequests[0].created_at,
      created_at_type: typeof quoteRequests[0].created_at,
      report_link: quoteRequests[0].report_link,
      report_link_type: typeof quoteRequests[0].report_link,
    });
  }

  const services = [
    {
      id: 1,
      icon: <FiFolder className="w-8 h-8 text-light-primary" />,
      title: 'File Accessibility',
      tags: ['Word/PDF', 'Excel/CSV', 'Powerpoint'],
      description: 'Have you tagged the elements within your PDF or added the necessary image descriptions? Don\'t worry... we\'ve got you covered for PDFs and all your other file types. Our process is fast, accurate, and budget-friendly.',
    },
    {
      id: 2,
      icon: <FiSearch className="w-8 h-8 text-light-primary" />,
      title: 'Expert Audit',
      tags: ['Prioritized', 'Comprehensive'],
      description: 'Go beyond free scanning tools to get a comprehensive analysis of exactly where your website\'s accessibility stands. The report also includes suggested code fixes. It\'s the ideal way to accelerate your accessibility and compliance.',
    },
    {
      id: 3,
      icon: <FiFileText className="w-8 h-8 text-light-primary" />,
      title: 'VPAT',
      tags: ['ACR', 'Audit', 'Section 508'],
      description: 'According to Section 508, if you receive federal funding from, or do business with the U.S. government, you need a VPAT. Our VPAT team can help you get what you need quickly and affordably.',
    },
    {
      id: 4,
      icon: <FiUsers className="w-8 h-8 text-light-primary" />,
      title: 'User Testing',
      tags: ['Scenario testing', 'Hourly general testing'],
      description: 'Can a person who is blind or has a mobile disability seamlessly navigate your website? There\'s nothing more validating than an accessibility test by users with disabilities. This service comes with a video of the user experience and a full report of any challenges detected during the test.',
    },
  ];

  const workflowSteps = [
    {
      number: 1,
      text: 'Click on ',
      highlight: 'Get a Quote',
    },
    {
      number: 2,
      text: 'Enter your project\'s ',
      highlight: 'details and links',
    },
    {
      number: 3,
      text: 'The quote will appear in the ',
      highlight: 'dashboard above',
    },
    {
      number: 4,
      text: 'Wait for our expert to ',
      highlight: 'analyze your website',
    },
    {
      number: 5,
      text: 'Get a link to ',
      highlight: 'download your project',
      lastText: ' when ready',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-body">
      {/* Hero Section */}
      <div className="w-full mb-6">
        <div 
          className="relative rounded-2xl shadow-sm overflow-hidden border"
          style={{
            backgroundColor: '#344288',
            borderColor: '#A2ADF3',
          }}
        >
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 lg:p-16">
            {/* Left Column - Text Content */}
            <div className="space-y-6 z-10">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full text-sm font-semibold border shadow-lg"
                style={{
                  backgroundColor: `rgba(255, 255, 255, 0.15)`,
                  borderColor: `rgba(255, 255, 255, 0.3)`,
                  color: '#ffffff',
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                Premium Expert Services
              </div>
              
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-white">
                  Professional<br />
                  <span className="text-white">
                    Accessibility Services
                  </span>
                </h1>
              </div>
              
              <p className="text-blue-100 text-base md:text-lg leading-relaxed max-w-xl">
                Partner with industry-leading accessibility experts to make your digital content inclusive, compliant, and accessible to everyone.
              </p>

              {/* Stats/Features */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">500+</div>
                  <div className="text-xs md:text-sm text-blue-100">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">24/7</div>
                  <div className="text-xs md:text-sm text-blue-100">Support</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">WCAG</div>
                  <div className="text-xs md:text-sm text-blue-100">Compliant</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <a 
                  href="#services" 
                  className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium text-sm sm:text-base transition-colors bg-white"
                  style={{
                    color: '#344288',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  Explore Services
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <button
                  onClick={handleBookMeeting}
                  className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium text-sm sm:text-base border transition-colors text-white"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  Book Meeting
                </button>
              </div>
            </div>

            {/* Right Column - Service Showcase */}
            <div className="relative hidden lg:block">
              <div className="relative h-[450px]">
                {/* Main Card - File Accessibility */}
                <div 
                  className="absolute top-0 right-0 bg-white rounded-xl shadow-md p-6 w-72 transform hover:scale-105 transition-all duration-300 border"
                  style={{ borderColor: '#A2ADF3' }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: '#3343AD' }}
                    >
                      <FiFile className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">File Accessibility</h3>
                      <p className="text-sm text-gray-600 mb-3">PDFs, Word, Excel & More</p>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-white"
                            style={{ backgroundColor: '#3343AD' }}
                          ></div>
                          <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white"></div>
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-white"
                            style={{ backgroundColor: '#7383ED' }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">150+ completed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VPAT Card */}
                <div 
                  className="absolute top-32 left-0 bg-white rounded-xl shadow-md p-6 w-64 transform hover:scale-105 transition-all duration-300 border"
                  style={{ borderColor: '#A2ADF3' }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: '#3343AD' }}
                    >
                      <FiFileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">VPAT Reports</h3>
                      <p className="text-sm text-gray-600">Section 508 Compliance</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Certified</span>
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>

                {/* Expert Audit Card */}
                <div 
                  className="absolute bottom-0 right-8 bg-white rounded-xl shadow-md p-6 w-68 transform hover:scale-105 transition-all duration-300 border"
                  style={{ borderColor: '#A2ADF3' }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: '#3343AD' }}
                    >
                      <FiSearch className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">Expert Audit</h3>
                      <p className="text-sm text-gray-600 mb-3">Comprehensive Analysis</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{
                            width: '85%',
                            backgroundColor: '#3343AD',
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">85% Score Average</p>
                    </div>
                  </div>
                </div>

                {/* Floating Badge */}
                <div 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-lg rounded-full p-4 border shadow-xl"
                  style={{
                    backgroundColor: `rgba(255, 255, 255, 0.2)`,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <svg 
                    className="w-12 h-12" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#ffffff' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manage Projects Section */}
      <div className="w-full mb-6">
        <div 
          className="rounded-xl shadow p-2 sm:p-4 md:p-6 w-full overflow-visible box-border"
          style={{
            backgroundColor: '#eaecfb',
            border: `1px solid ${baseColors.cardBorderPurple}`,
          }}
        >
          {/* Header with bottom border */}
          <div 
            className="mb-6 pb-4 w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            style={{
              borderBottom: `2px solid ${baseColors.cardBorderPurple}`,
            }}
          >
            <div>
              <h3 
                className="text-xl sm:text-2xl font-medium"
                style={{ color: baseColors.grayDark2 }}
              >
                Manage your projects
              </h3>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-row gap-3">
              <button
                onClick={handleBookMeeting}
                className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white border rounded-lg font-medium text-sm sm:text-base transition-colors"
                style={{
                  borderColor: '#A2ADF3',
                  color: '#3343AD',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = baseColors.white;
                }}
              >
                <FiUser className="w-5 h-5" />
                Book a Meeting
              </button>
              
              <button
                onClick={handleGetQuote}
                className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-white rounded-lg font-medium text-sm sm:text-base transition-colors"
                style={{
                  backgroundColor: baseColors.brandPrimary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = baseColors.brandPrimaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = baseColors.brandPrimary;
                }}
              >
                <FiPlus className="w-5 h-5" />
                Get a Quote
              </button>
            </div>
          </div>

          {/* Column Headers */}
          <div className="hidden md:grid grid-cols-7 gap-4 mb-4 px-4">
            <div
              className="col-span-2 text-sm font-medium uppercase tracking-wider"
              style={{ color: baseColors.brandPrimary }}
            >
              Name
            </div>
            <div
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: baseColors.brandPrimary }}
            >
              Frequency
            </div>
            <div
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: baseColors.brandPrimary }}
            >
              Date
            </div>
            <div
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: baseColors.brandPrimary }}
            >
              Type
            </div>
            <div
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: baseColors.brandPrimary }}
            >
              Status
            </div>
            <div
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: baseColors.brandPrimary }}
            >
              Report
            </div>
          </div>

          {/* Loading State */}
          {quotesLoading && (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="relative">
                <div 
                  className="w-16 h-16 border-4 rounded-full animate-spin"
                  style={{
                    borderColor: '#e5e7eb',
                    borderTopColor: '#3343AD',
                  }}
                ></div>
              </div>
              <p className="mt-6 text-gray-600 font-medium">Loading your projects...</p>
            </div>
          )}

          {/* Quote Requests List */}
          {!quotesLoading && quoteRequests.length > 0 && (
            <div className="space-y-3 max-w-full">
              {quoteRequests.map((quote: any, index: number) => (
                <div 
                  key={quote.id}
                  className="block md:grid md:grid-cols-7 gap-4 md:items-center p-3 sm:p-4 rounded-lg border hover:shadow-md transition-all duration-200 group relative overflow-hidden md:overflow-visible w-full cursor-pointer"
                  style={{
                    backgroundColor: baseColors.cardLight,
                    borderColor: baseColors.cardBorder,
                  }}
                >
                  {/* Name & Details */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="mb-2">
                      <div 
                        className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900 transition-colors leading-tight"
                        style={{
                          color: 'inherit',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = baseColors.blueDark;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'inherit';
                        }}
                      >{quote.project_name}</div>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">{quote.project_details}</div>
                  </div>

                  {/* Frequency */}
                  <div className="flex md:block items-center gap-2">
                    <span className="md:hidden text-sm font-semibold text-gray-600">Frequency:</span>
                    <span className="text-gray-700 font-medium capitalize">{quote.frequency || 'One-time'}</span>
                  </div>

                  {/* Date */}
                  <div className="flex md:block items-center gap-2">
                    <span className="md:hidden text-sm font-semibold text-gray-600">Date:</span>
                    <span className="text-gray-700 font-medium">{formatDate(quote.created_at)}</span>
                  </div>

                  {/* Type */}
                  <div className="flex md:block items-center gap-2">
                    <span className="md:hidden text-sm font-semibold text-gray-600">Type:</span>
                    <span className="text-gray-700 font-medium">{formatProjectType(quote.project_type)}</span>
                  </div>

                  {/* Status */}
                  <div className="flex md:block items-center gap-2">
                    <span className="md:hidden text-sm font-semibold text-gray-600">Status:</span>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold capitalize ${getStatusColor(quote.status)} shadow-sm`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                      {quote.status}
                    </span>
                  </div>

                  {/* Report Link */}
                  <div className="flex md:block items-center gap-2">
                    <span className="md:hidden text-sm font-semibold text-gray-600">Report:</span>
                    {quote.report_link ? (
                      <a
                        href={quote.report_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg transition-colors text-xs font-medium"
                        style={{
                          backgroundColor: baseColors.brandPrimary,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = baseColors.brandPrimaryHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = baseColors.brandPrimary;
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View
                      </a>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold">
                        <svg className="w-3.5 h-3.5 mr-1.5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Waiting
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!quotesLoading && quoteRequests.length === 0 && (
            <div 
              className="flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed"
              style={{
                backgroundColor: baseColors.cardLight,
                borderColor: baseColors.cardBorder,
              }}
            >
              <div className="relative mb-6">
                <div 
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{
                    backgroundColor: `#3343AD10`,
                  }}
                ></div>
                <FiFolderPlus 
                  className="relative w-28 h-28"
                  style={{ color: `#3343AD40` }}
                />
                <div 
                  className="absolute -top-2 -right-2 text-white rounded-full p-3 shadow-lg"
                  style={{
                    backgroundColor: '#3343AD',
                  }}
                >
                  <FiPlus className="w-6 h-6" />
                </div>
              </div>
              
              <h3 
                className="text-2xl font-bold text-gray-900 mb-2"
              >
                Click Get a Quote
              </h3>
              <p className="text-gray-600 text-center text-lg">
                to get a free custom quote
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Steps Section */}
      <div className="w-full mb-6">
        <div 
          className="relative rounded-2xl shadow-sm border overflow-hidden"
          style={{
            backgroundColor: '#ecf0fd',
            borderColor: '#A2ADF3',
          }}
        >
          
          <div className="relative p-4 sm:p-6 lg:p-8 md:p-12">
            <div className="text-center mb-10">
              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                How It Works
              </h3>
              <p className="text-gray-600 text-sm sm:text-base md:text-lg">Follow these easy steps to get started</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step.number} className="flex flex-col items-center text-center group">
                  {/* Step Container */}
                  <div className="relative w-full">
                    {/* Connecting Line (hidden on mobile and after last step) */}
                    {index < workflowSteps.length - 1 && (
                      <div 
                        className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 -z-10"
                        style={{
                          background: `linear-gradient(to right, #A2ADF3, transparent)`,
                        }}
                      ></div>
                    )}
                    
                    {/* Step Number Circle */}
                    <div 
                      className="relative mx-auto w-16 h-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg group-hover:shadow-2xl transition-all duration-300 z-10"
                      style={{
                        backgroundColor: '#3343AD',
                      }}
                    >
                      <span className="relative z-10">{step.number}</span>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 rounded-full transition-all duration-300"></div>
                    </div>
                    
                    {/* Step Text */}
                    <div 
                      className="bg-white rounded-xl p-4 min-h-[120px] flex items-center justify-center border shadow-sm group-hover:shadow-md transition-all duration-300"
                      style={{
                        borderColor: '#A2ADF3',
                      }}
                    >
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {step.text}
                        <span 
                          className="font-medium block mt-1 text-gray-900"
                        >
                          {step.highlight}
                        </span>
                        {step.lastText && <span>{step.lastText}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Service Cards Section */}
      <div id="services" className="w-full mb-8">
        <div className="text-center mb-12">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-2 leading-tight">
            Our Services
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">Choose the perfect solution for your accessibility needs</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {services.map((service, index) => (
            <div 
              key={service.id}
              className="group relative bg-white rounded-xl shadow-md border p-3 sm:p-4 md:p-6 lg:p-8 hover:shadow-md transition-shadow duration-300 overflow-hidden"
              style={{
                borderColor: '#A2ADF3',
              }}
            >
              
              {/* Content */}
              <div className="relative">
                {/* Icon */}
                <div className="mb-6 relative inline-block">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                    {React.cloneElement(service.icon as React.ReactElement, {
                      className: 'w-8 h-8 sm:w-10 sm:h-10',
                      style: { color: '#3343AD' }
                    })}
                  </div>
                </div>

                {/* Title */}
                <h3 
                  className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900 transition-colors leading-tight mb-4"
                  style={{
                    color: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = baseColors.blueDark;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'inherit';
                  }}
                >
                  {service.title}
                </h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {service.tags.map((tag, tagIndex) => (
                    <span 
                      key={tagIndex}
                      className="px-2 py-1 text-xs rounded-lg font-medium border"
                      style={{
                        backgroundColor: '#f8f9ff',
                        color: '#3343AD',
                        borderColor: '#A2ADF3',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                  {service.description}
                </p>

                {/* CTA Button */}
                <button
                  onClick={handleGetQuote}
                  className="group/btn flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 border rounded-lg transition-colors font-medium text-sm sm:text-base"
                  style={{
                    borderColor: '#A2ADF3',
                    color: '#3343AD',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Get a Quote
                  <FiArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <GetQuoteModal 
        isOpen={isQuoteModalOpen}
        onClose={handleCloseQuoteModal}
      />

      <BookMeetingModal 
        isOpen={isBookMeetingModalOpen}
        onClose={handleCloseBookMeetingModal}
      />
    </div>
  );
};

export default ServiceRequests;
