import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useQuery } from '@apollo/client';
import { FiFile, FiVideo, FiUser, FiPlus, FiFolderPlus, FiFolder, FiSearch, FiFileText, FiUsers, FiArrowRight } from 'react-icons/fi';
import { MdClosedCaption, MdCheckCircle } from 'react-icons/md';
import GetQuoteModal from './GetQuoteModal';
import BookMeetingModal from './BookMeetingModal';
import getUserQuoteRequestsQuery from '@/queries/serviceRequests/getUserQuoteRequests';

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
        return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200';
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
        <div className="relative bg-gradient-to-br from-[#445AE7] to-[#667eea] rounded-3xl shadow-2xl overflow-hidden min-h-[500px]">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
                               radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
                               radial-gradient(circle at 40% 90%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)`
            }}></div>
          </div>
          
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
          
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center p-8 md:p-12 lg:p-16">
            {/* Left Column - Text Content */}
            <div className="space-y-8 text-white z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold border border-white/30">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                Premium Services
              </div>
              
              <div className="space-y-4">
                <h1 className="text-2xl md:text-2xl lg:text-7xl font-bold leading-tight tracking-tight">
                  Accessibility<br />Expertise
                </h1>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-100">
                  You Can Count On
                </h2>
              </div>
              
              <p className="text-blue-50 text-lg md:text-xl leading-relaxed max-w-xl">
                Our industry-leading web accessibility experts are ready to take your website, 
                apps, and digital assets to the next level.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <a 
                  href="#services" 
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#445AE7] rounded-xl font-bold hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  Explore Services
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                
              </div>
            </div>

            {/* Right Column - Service Icons */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-full h-[400px]">
                {/* PDF Card */}
                <div className="absolute top-0 left-12 bg-white/25 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-white/30 hover:bg-white/35 transition-all duration-300 transform hover:scale-110">
                  <div className="bg-white/20 p-4 rounded-xl mb-3 flex items-center justify-center">
                    <FiFile className="w-10 h-10 text-white" />
                  </div>
                  <span className="block text-center text-sm font-bold text-white">PDF</span>
                </div>

                {/* CC Card */}
                <div className="absolute top-4 right-8 bg-white/25 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-white/30 hover:bg-white/35 transition-all duration-300 transform hover:scale-110">
                  <div className="bg-white/20 p-4 rounded-xl mb-3 flex items-center justify-center">
                    <MdClosedCaption className="w-10 h-10 text-white" />
                  </div>
                  <span className="block text-center text-sm font-bold text-white">CC</span>
                </div>

                {/* Video Player Card */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 w-80 hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="bg-gradient-to-br from-[#445AE7] to-[#667eea] p-3 rounded-xl shadow-lg">
                        <FiVideo className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-[#445AE7] rounded-xl blur-md opacity-30"></div>
                    </div>
                    <div className="flex-grow">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div className="h-full w-2/3 bg-gradient-to-r from-[#445AE7] to-[#667eea] rounded-full relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>05:26</span>
                        <span className="font-bold text-[#445AE7]">08:14</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manage Projects Section */}
      <div className="w-full mb-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow duration-300">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#445AE7] to-[#667eea] bg-clip-text text-transparent">
                Manage your projects
              </h2>
              <p className="text-gray-500 mt-1 text-sm">Track and manage your service requests</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-row sm:flex-col gap-3">
              <button
                onClick={handleBookMeeting}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-[#445AE7]/30 text-[#445AE7] rounded-xl hover:bg-[#445AE7] hover:text-white hover:border-[#445AE7] transition-all duration-300 font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <FiUser className="w-5 h-5" />
                Book a Meeting
              </button>
              
              <button
                onClick={handleGetQuote}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#445AE7] to-[#667eea] text-white rounded-xl hover:from-[#3347d1] hover:to-[#5468ea] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FiPlus className="w-5 h-5" />
                Get a Quote
              </button>
            </div>
          </div>

          {/* Table Headers */}
          <div className="hidden md:grid grid-cols-7 gap-4 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-4 font-semibold text-gray-700 text-sm border border-blue-100">
            <div className="col-span-2">Name</div>
            <div>Frequency</div>
            <div>Date</div>
            <div>Type</div>
            <div>Status</div>
            <div>Report</div>
          </div>

          {/* Loading State */}
          {quotesLoading && (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-[#445AE7] rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-gray-500 font-medium">Loading your projects...</p>
            </div>
          )}

          {/* Quote Requests List */}
          {!quotesLoading && quoteRequests.length > 0 && (
            <div className="space-y-3">
              {quoteRequests.map((quote: any, index: number) => (
                <div 
                  key={quote.id}
                  className="group grid grid-cols-1 md:grid-cols-7 gap-4 px-6 py-5 bg-gradient-to-r from-white to-blue-50/30 border-2 border-gray-100 rounded-xl hover:border-[#445AE7]/30 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  {/* Name & Details */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="mt-1 w-2 h-2 rounded-full bg-gradient-to-r from-[#445AE7] to-[#667eea] flex-shrink-0"></div>
                      <div className="font-bold text-gray-900 group-hover:text-[#445AE7] transition-colors duration-200">{quote.project_name}</div>
                    </div>
                    <div className="text-sm text-gray-500 line-clamp-2 ml-4">{quote.project_details}</div>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#445AE7] to-[#667eea] text-white rounded-lg hover:from-[#3347d1] hover:to-[#5468ea] transition-all duration-300 text-xs font-semibold shadow-sm hover:shadow-md transform hover:scale-105"
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
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl border-2 border-dashed border-[#445AE7]/30">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#445AE7]/10 rounded-full blur-2xl"></div>
                <FiFolderPlus className="relative w-28 h-28 text-[#445AE7]/40" />
                <div className="absolute -top-2 -right-2 bg-gradient-to-br from-[#445AE7] to-[#667eea] text-white rounded-full p-3 shadow-lg">
                  <FiPlus className="w-6 h-6" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold bg-gradient-to-r from-[#445AE7] to-[#667eea] bg-clip-text text-transparent mb-2">
                Click Get a Quote
              </h3>
              <p className="text-gray-500 text-center text-lg">
                to get a free custom quote
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Steps Section */}
      <div className="w-full mb-6">
        <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-indigo-50/40 to-purple-50/40"></div>
          
          <div className="relative p-8 md:p-12">
            <div className="text-center mb-10">
              <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-[#445AE7]/10 to-[#667eea]/10 rounded-full mb-4 border border-[#445AE7]/20">
                <span className="text-sm font-semibold bg-gradient-to-r from-[#445AE7] to-[#667eea] bg-clip-text text-transparent">
                  Simple 5-Step Process
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                How It Works
              </h3>
              <p className="text-gray-600">Follow these easy steps to get started</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step.number} className="flex flex-col items-center text-center group">
                  {/* Step Container */}
                  <div className="relative w-full">
                    {/* Connecting Line (hidden on mobile and after last step) */}
                    {index < workflowSteps.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-[#445AE7]/30 to-transparent -z-10"></div>
                    )}
                    
                    {/* Step Number Circle */}
                    <div className="relative mx-auto w-16 h-16 bg-gradient-to-br from-[#445AE7] to-[#667eea] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg group-hover:shadow-2xl transition-all duration-300 z-10">
                      <span className="relative z-10">{step.number}</span>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 rounded-full transition-all duration-300"></div>
                    </div>
                    
                    {/* Step Text */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 min-h-[120px] flex items-center justify-center border border-white shadow-sm group-hover:shadow-md transition-all duration-300">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {step.text}
                        <span className="font-bold text-[#445AE7] block mt-1">
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
          <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-[#445AE7]/10 to-[#667eea]/10 rounded-full mb-4 border border-[#445AE7]/20">
            <span className="text-sm font-semibold bg-gradient-to-r from-[#445AE7] to-[#667eea] bg-clip-text text-transparent">
              Our Premium Offerings
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Our Services
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">Choose the perfect solution for your accessibility needs</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => (
            <div 
              key={service.id}
              className="group relative bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 hover:border-[#445AE7]/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#445AE7]/5 to-[#667eea]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Content */}
              <div className="relative">
                {/* Icon */}
                <div className="mb-6 relative inline-block">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-20 h-20 rounded-2xl flex items-center justify-center relative shadow-md group-hover:shadow-xl transition-shadow duration-300">
                    <div className="transform group-hover:scale-110 transition-transform duration-300">
                      {React.cloneElement(service.icon as React.ReactElement, {
                        className: 'w-10 h-10 text-[#445AE7]'
                      })}
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gradient-to-br from-green-400 to-green-600 rounded-full p-1.5 shadow-lg">
                    <MdCheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#445AE7] transition-colors duration-300">
                  {service.title}
                </h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {service.tags.map((tag, tagIndex) => (
                    <span 
                      key={tagIndex}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-[#445AE7] text-sm rounded-lg font-semibold border border-blue-100 group-hover:border-[#445AE7]/30 transition-all duration-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed text-[15px]">
                  {service.description}
                </p>

                {/* CTA Button */}
                <button
                  onClick={handleGetQuote}
                  className="group/btn flex items-center gap-2 px-6 py-3 border-2 border-[#445AE7] text-[#445AE7] rounded-xl hover:bg-gradient-to-r hover:from-[#445AE7] hover:to-[#667eea] hover:text-white hover:border-transparent transition-all duration-300 font-semibold shadow-sm hover:shadow-lg transform hover:-translate-y-0.5"
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
