import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GetUserSitesDocument } from '@/generated/graphql';
import { MdSearch } from 'react-icons/md';

const AutomationScan: React.FC = () => {
  const { t } = useTranslation();
  const [domain, setDomain] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user sites for domain selector
  const { data: sitesData, loading: sitesLoading } = useQuery(GetUserSitesDocument);

  const handleStartScan = async () => {
    if (!domain.trim()) {
      alert('Please enter a domain to scan');
      return;
    }

    setIsScanning(true);

    try {
      // TODO: Implement actual automation scan logic here
      console.log(`Starting scan for domain: ${domain}`);
      
      // Simulate scan delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(124.44deg, #E9F2FF 5.14%, #DFE1F9 94.18%)'
      }}
    >
      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">Scan your domain</h1>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Scanner</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Evaluate your website's accessibility in seconds. View a history of all accessibility scans. Download your reports.
            </p>
          </div>

          {/* Domain Input and Scan Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter your domain"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
                disabled={isScanning}
              />
            </div>
            <button
              onClick={handleStartScan}
              disabled={isScanning || !domain.trim()}
              className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 text-sm whitespace-nowrap"
            >
              {isScanning ? 'Scanning...' : 'Free Scan'}
            </button>
          </div>

          {/* Scanning Status */}
          {isScanning && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-900">
                  Scanning {domain}... This may take a few moments.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Comprehensive Analysis */}
          <div 
            className="rounded-lg p-6 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(99.22deg, #1A4F69 -1.44%, #164861 50.95%, #2779A0 103.34%)'
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* SVG placeholder - you can replace this with your SVG */}
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">Comprehensive Analysis</h3>
                <p className="text-white text-opacity-90 text-sm leading-relaxed">
                  Our scanner checks for WCAG 2.1 compliance across your entire site.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Reports */}
          <div 
            className="rounded-lg p-6 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(99.22deg, #1A4F69 -1.44%, #164861 50.95%, #2779A0 103.34%)'
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* SVG placeholder - you can replace this with your SVG */}
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">Detailed Reports</h3>
                <p className="text-white text-opacity-90 text-sm leading-relaxed">
                  Receive a full breakdown of accessibility issues and how to fix them.
                </p>
              </div>
            </div>
          </div>

          {/* Improve User Experience */}
          <div 
            className="rounded-lg p-6 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(99.22deg, #1A4F69 -1.44%, #164861 50.95%, #2779A0 103.34%)'
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* SVG placeholder - you can replace this with your SVG */}
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">Improve User Experience</h3>
                <p className="text-white text-opacity-90 text-sm leading-relaxed">
                  Make your website accessible to all users, regardless of abilities.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scan History Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">Scan history</h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MdSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Empty State */}
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 mb-6">
              {/* Empty state illustration matching the design */}
              <div className="w-full h-full flex items-center justify-center">
                <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Document base */}
                  <rect x="20" y="16" width="48" height="64" rx="4" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1"/>
                  {/* Header bar */}
                  <rect x="24" y="20" width="40" height="6" rx="3" fill="#2563EB"/>
                  {/* Content lines */}
                  <rect x="24" y="32" width="32" height="2" rx="1" fill="#E5E7EB"/>
                  <rect x="24" y="38" width="28" height="2" rx="1" fill="#E5E7EB"/>
                  <rect x="24" y="44" width="30" height="2" rx="1" fill="#E5E7EB"/>
                  <rect x="24" y="50" width="26" height="2" rx="1" fill="#E5E7EB"/>
                  <rect x="24" y="56" width="32" height="2" rx="1" fill="#E5E7EB"/>
                  <rect x="24" y="62" width="24" height="2" rx="1" fill="#E5E7EB"/>
                  {/* Accessibility icon circle */}
                  <circle cx="76" cy="68" r="12" fill="#2563EB"/>
                  <path d="M76 62c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 4c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2v-4c0-1.1-.9-2-2-2z" fill="white"/>
                </svg>
              </div>
            </div>
            <p className="text-gray-500 text-base">You currently have no previous scan histories</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationScan; 