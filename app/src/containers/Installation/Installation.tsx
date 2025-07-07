import React, { useState } from 'react';
import CodeContainer from './CodeContainer';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { installationTourSteps, tourKeys } from '@/constants/toursteps';

export default function Installation({ domain }: any) {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.installation') });
  function getCodeString(uniqueToken: string): string {
    return `<script src="https://widget.webability.io/widget.min.js" data-asw-token="${uniqueToken}" defer></script>`;
  }

  const [codeString] = useState(getCodeString(domain || 'default'));

  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Installation tour completed!');
  };

  return (
    <>
      <TourGuide
        steps={installationTourSteps}
        tourKey={tourKeys.installation}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />
      
      <div className="min-h-screen bg-body flex flex-col overflow-hidden">
        <div className="flex-1 max-w-none mx-0 px-2 sm:px-3 py-3 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
          {/* Main Content Column */}
          <main className="flex-1 flex flex-col min-h-0" role="main" aria-label="Accessibility installation guide">
            {/* Compact Header Section */}
            <header className="installation-welcome-banner bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center" role="img" aria-label="Lightning bolt accessibility icon">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-sapphire-blue mb-1 leading-tight">
                    AI-Driven Accessibility, Simplified
                  </h1>
                  
                  <p className="text-gray-700 text-sm sm:text-base">
                    Automatic, ongoing remediation powered by cutting-edge AI. Achieve WCAG 2.1 AA compliance in minutes, mitigate legal risk, and unlock the $13 trillion disability market.
                  </p>
                </div>
              </div>
              
              <div>
                <a 
                  href="https://www.webability.io/installation" 
                  className="installation-guide-link group inline-flex items-center px-3 sm:px-4 py-2 sm:py-2 bg-primary text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-xs sm:text-sm min-h-[44px] justify-center"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open complete accessibility installation guide in new tab"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Implementation Guide
                </a>
              </div>
            </div>
          </header>

          {/* Compact Features Row */}
          <section className="mb-4 flex-shrink-0" aria-labelledby="features-heading">
            <h2 id="features-heading" className="sr-only">Key Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0" role="img" aria-label="Lightning bolt speed icon">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Easy Setup, Immediate Results</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Compliance in 48 hours</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0" role="img" aria-label="Checkmark compliance icon">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Legal Protection</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Mitigate ADA lawsuits</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0" role="img" aria-label="Universal compatibility icon">
                  <span className="text-white text-base font-bold">🌐</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Universal Compatibility</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Any CMS or site builder</p>
                </div>
              </div>
            </div>
          </section>

          {/* Installation Section */}
          <section className="flex-shrink-0" aria-labelledby="installation-heading">
            <div className="mb-4">
              <h2 id="installation-heading" className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Deploy Enterprise-Grade Accessibility in Minutes
              </h2>
              <p className="text-gray-600 text-sm sm:text-base max-w-4xl">
                Install our AI-powered accessibility solution with one line of code. Join industry leaders protecting their brands while serving the world's largest minority market.
              </p>
            </div>
            
            <div>
              <CodeContainer codeString={codeString} />
            </div>
          </section>
        </main>
          
        {/* Facts Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 overflow-y-auto" aria-labelledby="impact-heading">
          <div className="space-y-5">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 id="impact-heading" className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                Why Leading Brands Choose AI Accessibility
              </h3>
              <p className="text-gray-800 text-xs sm:text-sm font-medium">
                Data-driven insights from the accessibility market
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">48hrs</div>
                </div>
                <div className="text-xs sm:text-sm text-gray-900 font-bold">Time to compliance</div>
                <div className="text-xs text-gray-800 mt-1 font-medium">AI remediation delivers immediate results</div>
              </div>
              
              <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-green-600">99.7%</div>
                </div>
                <div className="text-xs sm:text-sm text-gray-900 font-bold">Legal risk reduction</div>
                <div className="text-xs text-gray-800 mt-1 font-medium">Automatic WCAG 2.1 AA compliance protection</div>
              </div>
              
              <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">2.3x</div>
                </div>
                <div className="text-xs sm:text-sm text-gray-900 font-bold">Revenue increase potential</div>
                <div className="text-xs text-gray-800 mt-1 font-medium">Accessible sites convert better across all users</div>
              </div>
              
              <div className="p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">$13T</div>
                </div>
                <div className="text-xs sm:text-sm text-gray-900 font-bold">Global disability market value</div>
                <div className="text-xs text-gray-800 mt-1 font-medium">World's largest underserved consumer segment</div>
              </div>
              
              <div className="p-3 sm:p-4 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-cyan-600">98%</div>
                </div>
                <div className="text-xs sm:text-sm text-gray-900 font-bold">Websites fail accessibility tests</div>
                <div className="text-xs text-gray-800 mt-1 font-medium">Gain competitive advantage with compliance</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white border border-blue-500/20 shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="text-xs sm:text-sm font-semibold">Welcome to Enterprise Accessibility</div>
              </div>
              <div className="text-xs text-blue-50 text-center font-medium">Join leading brands protecting their digital assets with AI</div>
            </div>
          </div>
        </aside>
        </div>
      </div>
    </>
  )
}