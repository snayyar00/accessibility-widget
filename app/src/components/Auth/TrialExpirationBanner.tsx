import React, { useState, useMemo, useEffect } from 'react';
import { FaClock, FaTimes } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';

interface TrialExpirationBannerProps {
  sitesData?: any;
  openModal?: () => void;
  setPaymentView?: (value: boolean) => void;
  setOptionalDomain?: (domain: string) => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

// Helper function to normalize domain URLs for comparison
const normalizeDomain = (url: string): string => {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase()
    .trim();
};

const TrialExpirationBanner: React.FC<TrialExpirationBannerProps> = ({
  sitesData,
  openModal,
  setPaymentView,
  setOptionalDomain,
  onVisibilityChange,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const selectedDomain = useSelector(
    (state: RootState) => state.report.selectedDomain,
  );

  // Calculate trial expiration info
  const trialInfo = useMemo(() => {
    if (!selectedDomain || !sitesData) {
      return null;
    }

    // Handle both old structure (array) and new structure (PaginatedSites)
    const sites = sitesData?.getUserSites?.sites || sitesData?.getUserSites || [];
    
    if (!sites || sites.length === 0) {
      return null;
    }

    // Normalize selected domain for comparison
    const normalizedSelectedDomain = normalizeDomain(selectedDomain);
    
    // Find the selected site (try exact match first, then normalized match)
    const selectedSite = sites.find(
      (site: any) => {
        if (!site?.url) return false;
        return (
          site.url === selectedDomain ||
          normalizeDomain(site.url) === normalizedSelectedDomain
        );
      },
    );

    if (!selectedSite) {
      return null;
    }

    // Check if site is on trial
    if (selectedSite.trial !== 1) {
      return null;
    }

    // Check if expiredAt exists
    if (!selectedSite.expiredAt) {
      return null;
    }

    // Calculate days remaining
    const expiredAtTimestamp = parseInt(selectedSite.expiredAt, 10);
    if (isNaN(expiredAtTimestamp)) {
      return null;
    }

    const expiredAtDate = new Date(expiredAtTimestamp);
    const currentDate = new Date();
    const timeDifference = expiredAtDate.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    // Show if trial expires in less than 8 days and hasn't expired yet
    if (daysRemaining < 8 && daysRemaining >= 0) {
      return {
        daysRemaining,
        siteUrl: selectedSite.url,
        isExpired: false,
      };
    }

    // Show if trial has expired (days remaining is negative)
    if (daysRemaining < 0) {
      return {
        daysRemaining: 0,
        siteUrl: selectedSite.url,
        isExpired: true,
      };
    }

    return null;
  }, [selectedDomain, sitesData]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onVisibilityChange) {
      onVisibilityChange(false);
    }
  };

  // Notify parent when visibility changes - fire immediately
  useEffect(() => {
    if (onVisibilityChange) {
      const willRender = isVisible && trialInfo !== null;
      onVisibilityChange(willRender);
    }
  }, [isVisible, trialInfo, onVisibilityChange]);

  const handleSeePricing = () => {
    // Open the payment modal similar to "Buy License" button
    if (openModal && setPaymentView && setOptionalDomain && selectedDomain) {
      setPaymentView(true);
      setOptionalDomain(selectedDomain);
      openModal();
    }
  };

  if (!isVisible || !trialInfo) return null;

  return (
    <div 
      className="text-white w-full z-50 relative shadow-md"
      style={{ backgroundColor: '#3b82f6' }} // Using blue-500 for better visibility
    >
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
        {/* Mobile Layout: Stacked (screens ≤ 768px) */}
        <div className="flex flex-col md:hidden gap-2">
          {/* Text with icon and Buy License button */}
          <div className="flex items-center justify-center flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <FaClock className="text-white h-4 w-4 flex-shrink-0" />
              <p className="font-medium text-sm text-center">
                {trialInfo.isExpired 
                  ? 'Your free trial has expired.'
                  : `You have ${trialInfo.daysRemaining} ${trialInfo.daysRemaining === 1 ? 'day' : 'days'} left on your free trial.`}
              </p>
            </div>
            <button
              onClick={handleSeePricing}
              className="px-3 py-1.5 bg-transparent hover:bg-blue-600 text-white border border-white rounded-md text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500"
            >
              Buy License
            </button>
          </div>
          
          {/* Dismiss button row */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleDismiss}
              className="text-white hover:text-blue-100 transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 rounded"
              aria-label="Dismiss"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop Layout: Horizontal (screens ≥ 768px) */}
        <div className="hidden md:flex items-center justify-between min-h-[48px]">
          {/* Text with icon and Buy License button - centered */}
          <div className="flex items-center justify-center space-x-3 flex-1">
            <FaClock className="text-white h-5 w-5 flex-shrink-0" />
            <p className="font-medium text-base">
              {trialInfo.isExpired 
                ? 'Your free trial has expired.'
                : `You have ${trialInfo.daysRemaining} ${trialInfo.daysRemaining === 1 ? 'day' : 'days'} left on your free trial.`}
            </p>
            <button
              onClick={handleSeePricing}
              className="px-4 py-1.5 bg-transparent hover:bg-blue-600 text-white border border-white rounded-md text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 ml-2"
            >
              Buy License
            </button>
          </div>

          {/* Right-aligned dismiss button */}
          <div className="flex items-center">
            <button
              onClick={handleDismiss}
              className="text-white hover:text-blue-100 transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 rounded"
              aria-label="Dismiss"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialExpirationBanner;

