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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 flex flex-col overflow-hidden">
        <div className="flex-1 max-w-none mx-0 px-3 sm:px-4 py-4 flex flex-col lg:flex-row gap-6 sm:gap-8 min-h-0">
          {/* Main Content Column */}
          <main
            className="flex-1 flex flex-col min-h-0"
            role="main"
            aria-label="Accessibility installation guide"
          >
            {/* Enhanced Header Section */}
            <header className="installation-welcome-banner bg-gradient-to-br from-white via-blue-50/20 to-white rounded-2xl shadow-xl shadow-blue-500/10 p-6 sm:p-8 mb-6 flex-shrink-0 ring-1 ring-blue-100/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 ring-4 ring-blue-100/50"
                    role="img"
                    aria-label="Lightning bolt accessibility icon"
                  >
                    <svg
                      className="w-8 h-8 text-white drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2 leading-tight">
                      AI-Driven Accessibility, Simplified
                    </h1>

                    <p className="text-gray-700 text-base sm:text-lg leading-relaxed font-medium">
                      Automatic, ongoing remediation powered by cutting-edge AI.
                      Achieve{' '}
                      <span className="font-bold text-blue-600">
                        WCAG 2.1 AA compliance
                      </span>{' '}
                      in minutes, mitigate legal risk, and unlock the{' '}
                      <span className="font-bold text-green-600">
                        $13 trillion disability market
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <a
                    href="https://www.webability.io/installation"
                    className="installation-guide-link group inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 focus:ring-4 focus:ring-blue-200 focus:outline-none transition-all duration-300 text-sm transform hover:scale-105 active:scale-95"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open complete accessibility installation guide in new tab"
                  >
                    <svg
                      className="w-5 h-5 mr-2 drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    Implementation Guide
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </header>

            {/* Enhanced Features Row */}
            <section
              className="mb-6 flex-shrink-0"
              aria-labelledby="features-heading"
            >
              <h2 id="features-heading" className="sr-only">
                Key Features
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-white via-blue-50/30 to-white shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/15 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500 transform hover:scale-[1.02]">
                  <div
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25 group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-300"
                    role="img"
                    aria-label="Lightning bolt speed icon"
                  >
                    <svg
                      className="w-6 h-6 text-white drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1">
                      Easy Setup, Immediate Results
                    </h3>
                    <p className="text-blue-600 text-sm font-semibold">
                      Compliance in 48 hours
                    </p>
                  </div>
                </div>

                <div className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-white via-green-50/30 to-white shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/15 transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500 transform hover:scale-[1.02]">
                  <div
                    className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/25 group-hover:shadow-xl group-hover:shadow-green-500/30 transition-all duration-300"
                    role="img"
                    aria-label="Checkmark compliance icon"
                  >
                    <svg
                      className="w-6 h-6 text-white drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1">
                      Legal Protection
                    </h3>
                    <p className="text-green-600 text-sm font-semibold">
                      Mitigate ADA lawsuits
                    </p>
                  </div>
                </div>

                <div className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-white via-purple-50/30 to-white shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/15 transition-all duration-300 focus-within:ring-2 focus-within:ring-purple-500 transform hover:scale-[1.02] sm:col-span-2 lg:col-span-1">
                  <div
                    className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25 group-hover:shadow-xl group-hover:shadow-purple-500/30 transition-all duration-300"
                    role="img"
                    aria-label="Universal compatibility icon"
                  >
                    <svg
                      className="w-6 h-6 text-blue-600 drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1">
                      Universal Compatibility
                    </h3>
                    <p className="text-purple-600 text-sm font-semibold">
                      Any CMS or site builder
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Enhanced Installation Section */}
            <section
              className="flex-shrink-0"
              aria-labelledby="installation-heading"
            >
              <div className="mb-6">
                <h2
                  id="installation-heading"
                  className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3"
                >
                  Deploy Enterprise-Grade Accessibility in Minutes
                </h2>
                <p className="text-gray-600 text-base sm:text-lg max-w-4xl leading-relaxed font-medium">
                  Install our AI-powered accessibility solution with one line of
                  code. Join industry leaders protecting their brands while
                  serving the world's largest minority market.
                </p>
              </div>

              <div className="flex justify-center">
                <CodeContainer codeString={codeString} />
              </div>
            </section>
          </main>

          {/* Enhanced Facts Sidebar */}
          <aside
            className="w-full lg:w-72 flex-shrink-0 bg-gradient-to-br from-white via-blue-50/20 to-white rounded-2xl shadow-xl shadow-blue-500/10 p-4 sm:p-6 overflow-y-auto ring-1 ring-blue-100/50"
            aria-labelledby="impact-heading"
          >
            <div className="space-y-6 w-full lg:max-w-xs lg:mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/25 ring-4 ring-blue-100/50">
                  <svg
                    className="w-8 h-8 text-white drop-shadow-sm"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3
                  id="impact-heading"
                  className="text-xl sm:text-2xl font-bold text-gray-900 mb-3"
                >
                  Why Leading Brands Choose AI Accessibility
                </h3>
              </div>

              <div className="space-y-5">
                <div className="group p-5 bg-gradient-to-br from-blue-50 to-blue-100/80 rounded-2xl hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <svg
                        className="w-6 h-6 text-white drop-shadow-sm"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="text-3xl font-black text-blue-600 drop-shadow-sm">
                      48hrs
                    </div>
                  </div>
                  <div className="text-sm sm:text-base text-gray-900 font-bold mb-1">
                    Time to compliance
                  </div>
                  <div className="text-xs sm:text-sm text-gray-700 font-semibold">
                    AI remediation delivers immediate results
                  </div>
                </div>

                <div className="group p-5 bg-gradient-to-br from-green-50 to-green-100/80 rounded-2xl hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                      <svg
                        className="w-6 h-6 text-white drop-shadow-sm"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <div className="text-3xl font-black text-green-600 drop-shadow-sm">
                      99.7%
                    </div>
                  </div>
                  <div className="text-sm sm:text-base text-gray-900 font-bold mb-1">
                    Legal risk reduction
                  </div>
                  <div className="text-xs sm:text-sm text-gray-700 font-semibold">
                    Automatic WCAG 2.1 AA compliance protection
                  </div>
                </div>

                <div className="group p-5 bg-gradient-to-br from-cyan-50 to-cyan-100/80 rounded-2xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                      <svg
                        className="w-12 h-12 drop-shadow-sm"
                        fill="none"
                        stroke="#06b6d4"
                        style={{ color: '#06b6d4' }}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <div className="text-3xl font-black text-cyan-600 drop-shadow-sm">
                      98%
                    </div>
                  </div>
                  <div className="text-sm sm:text-base text-gray-900 font-bold mb-1">
                    Websites fail accessibility tests
                  </div>
                  <div className="text-xs sm:text-sm text-gray-700 font-semibold">
                    Gain competitive advantage with compliance
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl text-white shadow-2xl shadow-blue-500/25 ring-1 ring-blue-400/20">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ring-2 ring-white/30">
                    <svg
                      className="w-6 h-6 text-white drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                  <div className="text-base sm:text-lg font-bold drop-shadow-sm">
                    Welcome to Enterprise Accessibility
                  </div>
                </div>
                <div className="text-sm text-blue-100 text-center font-semibold leading-relaxed">
                  Join leading brands protecting their digital assets with
                  AI-powered accessibility solutions
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
