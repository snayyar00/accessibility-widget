import React, { useState } from 'react';
import CodeContainer from './CodeContainer';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import useOrganizationName from '@/hooks/useOrganizationName';
import { useTranslation } from 'react-i18next';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { getInstallationTourSteps, tourKeys } from '@/constants/toursteps';
import { FaWordpressSimple } from 'react-icons/fa6';
import { FaWebflow } from 'react-icons/fa6';
import { FaWix } from 'react-icons/fa';
import { FaShopify } from 'react-icons/fa';
import { SiGoogletagmanager } from 'react-icons/si';
import { baseColors } from '@/config/colors';

export default function Installation({ domain }: any) {
  const { t } = useTranslation();
  const organizationName = useOrganizationName();
  useDocumentHeader({ title: t('Common.title.installation') });

  // Using baseColors directly

  function getCodeString(uniqueToken: string): string {
    return `<script src="https://widget.webability.io/widget.min.js" data-asw-token="${uniqueToken}" defer></script>`;
  }

  const [codeString] = useState(getCodeString(domain || 'default'));
  const [shouldOpenCustomization, setShouldOpenCustomization] = useState(false);

  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Installation tour completed!');
  };

  // Handle tour step changes
  const handleTourStepChange = (data: any) => {
    // Open customization menu when tour reaches the customize button step
    if (data.step?.target === '.customize-widget-button') {
      setShouldOpenCustomization(true);
      // Add a small delay to ensure the customization menu is rendered
      setTimeout(() => {
        // The tour will continue automatically after the element is available
      }, 200);
    }
  };

  interface StatCardProps {
    title: string;
    subtitle?: string;
    description?: string;
    className?: string;
    size?: 'small' | 'medium' | 'large';
    hasGlow?: boolean;
    titleColor?: string;
    subtitleColor?: string;
    textColor?: string;
  }

  function StatCard({
    title,
    subtitle,
    description,
    className,
    size = 'medium',
    hasGlow = false,
    titleColor,
    subtitleColor,
    textColor,
  }: StatCardProps) {
    const baseClasses =
      'relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300';
    const sizeClasses =
      size === 'large' ? 'p-6 sm:p-8 md:p-10 lg:p-12' : 'p-4 sm:p-6 md:p-8';
    const cardClassName = `${baseClasses} ${sizeClasses} ${className || ''}`;

    return (
      <div
        className={cardClassName}
        style={{
          borderColor: baseColors.blueAccent,
          background: baseColors.statsCardGradient,
        }}
      >
        {/* Light overlay for better visibility */}
        <div className="absolute inset-0 bg-white/5 rounded-2xl"></div>
        <div className="relative z-10 h-full flex flex-col">
          <div>
            <h3
              className={`font-bold leading-tight ${
                size === 'large'
                  ? 'text-2xl sm:text-3xl md:text-4xl lg:text-4xl mb-4 sm:mb-6'
                  : 'text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-3 sm:mb-4'
              }`}
              style={{ color: titleColor || baseColors.blueStats }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                className={`font-medium ${
                  size === 'large'
                    ? 'text-base sm:text-lg md:text-xl lg:text-2xl mb-1 sm:mb-2'
                    : 'text-sm sm:text-base md:text-lg mb-1'
                }`}
                style={{
                  color: subtitleColor || baseColors.blueStats,
                }}
              >
                {subtitle}
              </p>
            )}
            {description && (
              <p
                className={`leading-relaxed ${
                  size === 'large'
                    ? 'text-base sm:text-lg md:text-xl'
                    : 'text-sm sm:text-base'
                }`}
                style={{
                  color: textColor || baseColors.blueStats,
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {hasGlow && (
          <>
            <div
              className="absolute top-1/2 right-0 w-16 sm:w-24 md:w-32 h-16 sm:h-24 md:h-32 rounded-full blur-2xl opacity-80"
              style={{ backgroundColor: '#28667d' }}
            />
            <div
              className="absolute top-1/2 right-2 sm:right-4 w-8 sm:w-12 md:w-16 h-8 sm:h-12 md:h-16 rounded-full blur-xl opacity-60"
              style={{ backgroundColor: '#183c4c' }}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <TourGuide
        steps={getInstallationTourSteps(organizationName)}
        tourKey={tourKeys.installation}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
        onStepChange={handleTourStepChange}
      />

      <div>
        <div className="w-full mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Installation Page Heading */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              Installation
            </h1>
          </div>

          {/* Code Container */}
          <div className="w-full installation-welcome-banner">
            <CodeContainer
              codeString={codeString}
              shouldOpenCustomization={shouldOpenCustomization}
              onCustomizationOpened={() => setShouldOpenCustomization(false)}
            />
          </div>

          {/* Installation guide section - Light blue background */}
          <div className="w-full py-4 sm:py-8">
            {/* Main card container */}
            <div
              className="rounded-2xl shadow-sm border p-4 sm:p-6 lg:p-8 max-w-full overflow-hidden"
              style={{
                backgroundColor: '#ecf0fd',
                borderColor: '#A2ADF3',
              }}
            >
              {/* Header section */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  {/* Title and description */}
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                      Installation guide
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base md:text-lg">
                      Step by step guides to install the widget
                    </p>
                  </div>

                  {/* View all guides button */}
                  {/* View all guides button */}
                  <div className="flex justify-end md:justify-start">
                    <a
                      href="https://www.webability.io/installation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full md:w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium text-sm sm:text-base flex items-center justify-center gap-2 transition-colors installation-guide-link"
                      style={{
                        backgroundColor: baseColors.brandPrimary,
                        color: baseColors.white,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#3E748E'; // 4.5:1 contrast ratio with #F0F0F0 (WCAG AA compliant)
                        e.currentTarget.style.color = '#F0F0F0'; // 4.5:1 contrast ratio on #3E748E (WCAG AA compliant)
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          baseColors.brandPrimary;
                        e.currentTarget.style.color = baseColors.white;
                      }}
                    >
                      <span>View all guides</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Platform cards */}
              <div className="space-y-3 sm:space-y-4">
                {/* WordPress Card */}
                <a
                  href="https://www.webability.io/installation/how-to-install-webability-wordpress"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Step by step guides to install the widget on a WordPress website. Contains a list with 5 items."
                  className="border rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer group block no-underline"
                  style={{
                    backgroundColor: baseColors.white,
                    borderColor: '#A2ADF3',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                        <FaWordpressSimple
                          className="w-10 h-10"
                          style={{ color: '#3343AD' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900 transition-colors leading-tight"
                          style={{ color: 'inherit' }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLElement).style.color =
                              baseColors.blueDark)
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLElement).style.color = 'inherit')
                          }
                        >
                          Step by step guides to install the widget on a
                          WordPress website
                        </h3>
                      </div>
                    </div>
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-colors flex-shrink-0"
                      style={{ color: '#3343AD' }}
                      onMouseEnter={(e) =>
                        ((e.target as HTMLElement).style.color = '#2a3a9a')
                      }
                      onMouseLeave={(e) =>
                        ((e.target as HTMLElement).style.color = '#3343AD')
                      }
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
                  </div>
                </a>

                {/* Webflow Card */}
                <a
                  href="https://www.webability.io/installation/how-to-install-webability-on-a-webflow-website"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer group block no-underline"
                  style={{
                    borderColor: '#A2ADF3',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                        <FaWebflow
                          className="w-10 h-10"
                          style={{ color: '#3343AD' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900 transition-colors leading-tight"
                          style={{ color: 'inherit' }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLElement).style.color =
                              baseColors.blueDark)
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLElement).style.color = 'inherit')
                          }
                        >
                          Step by step guides to install the widget on a Webflow
                          website
                        </h3>
                      </div>
                    </div>
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"
                      style={{ color: '#3343AD' }}
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
                  </div>
                </a>

                {/* Wix Card */}
                <a
                  href="https://www.webability.io/installation/how-to-install-webability-on-a-wix-website"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer group block no-underline"
                  style={{
                    borderColor: '#A2ADF3',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                        <FaWix
                          className="w-10 h-10"
                          style={{ color: '#3343AD' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900 transition-colors leading-tight"
                          style={{ color: 'inherit' }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLElement).style.color =
                              baseColors.blueDark)
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLElement).style.color = 'inherit')
                          }
                        >
                          Step by step guides to install the widget on WIX
                          website
                        </h3>
                      </div>
                    </div>
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"
                      style={{ color: '#3343AD' }}
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
                  </div>
                </a>

                {/* Shopify Card */}
                <a
                  href="https://www.webability.io/installation/how-to-install-webability-on-a-shopify-website"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer group block no-underline"
                  style={{
                    borderColor: '#A2ADF3',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                        <FaShopify
                          className="w-10 h-10"
                          style={{ color: '#3343AD' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900 transition-colors leading-tight"
                          style={{ color: 'inherit' }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLElement).style.color =
                              baseColors.blueDark)
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLElement).style.color = 'inherit')
                          }
                        >
                          Step by step guides to install the widget on a Shopify
                          store
                        </h3>
                      </div>
                    </div>
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-colors flex-shrink-0"
                      style={{ color: '#3343AD' }}
                      onMouseEnter={(e) =>
                        ((e.target as HTMLElement).style.color = '#2a3a9a')
                      }
                      onMouseLeave={(e) =>
                        ((e.target as HTMLElement).style.color = '#3343AD')
                      }
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
                  </div>
                </a>

                {/* GTM Card */}
                <a
                  href="https://www.webability.io/installation/how-to-install-webability-using-google-tag-manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer group block no-underline"
                  style={{
                    borderColor: '#A2ADF3',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                        <SiGoogletagmanager
                          className="w-10 h-10"
                          style={{ color: '#3343AD' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900 transition-colors leading-tight"
                          style={{ color: 'inherit' }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLElement).style.color =
                              baseColors.blueDark)
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLElement).style.color = 'inherit')
                          }
                        >
                          Step by step guides to install the widget on a Google
                          Tag Manager
                        </h3>
                      </div>
                    </div>
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-colors flex-shrink-0"
                      style={{ color: '#3343AD' }}
                      onMouseEnter={(e) =>
                        ((e.target as HTMLElement).style.color = '#2a3a9a')
                      }
                      onMouseLeave={(e) =>
                        ((e.target as HTMLElement).style.color = '#3343AD')
                      }
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
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Stats Section with Dark Blue Background */}
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: `linear-gradient(to bottom, #11163A, #445AE7)`,
            }}
          >
            {/* Background horizontal streaks */}
            <div className="absolute inset-0 opacity-20">
              <div
                className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent to-transparent"
                style={{
                  background: `linear-gradient(to right, transparent, ${baseColors.blueAccent}, transparent)`,
                }}
              ></div>
              <div
                className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent to-transparent"
                style={{
                  background: `linear-gradient(to right, transparent, ${baseColors.blueAccent}, transparent)`,
                }}
              ></div>
              <div
                className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent to-transparent"
                style={{
                  background: `linear-gradient(to right, transparent, ${baseColors.blueAccent}, transparent)`,
                }}
              ></div>
            </div>

            <div>
              <img
                src="/images/Installation_page_image.png"
                alt="Installation guide"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
