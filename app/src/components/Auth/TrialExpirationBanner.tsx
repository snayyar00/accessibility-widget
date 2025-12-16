import React, { useState, useMemo, useEffect } from 'react';
import { FaClock, FaTimes } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { APP_SUMO_BUNDLE_NAMES } from '@/constants';
import { getAuthenticationCookie } from '@/utils/cookie';
import PurchaseActionButton from '@/components/Common/PurchaseActionButton';

interface TrialExpirationBannerProps {
  sitesData?: any;
  openModal?: () => void;
  setPaymentView?: (value: boolean) => void;
  setOptionalDomain?: (domain: string) => void;
  onVisibilityChange?: (isVisible: boolean) => void;
  customerData?: any;
  onOpenActivateModal?: (domain: any) => void;
  billingLoading?: boolean;
  setBillingLoading?: (value: boolean) => void;
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
  customerData,
  onOpenActivateModal,
  billingLoading = false,
  setBillingLoading,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const selectedDomain = useSelector(
    (state: RootState) => state.report.selectedDomain,
  );
  const { data: userData } = useSelector((state: RootState) => state.user);
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  const isAppSumoOrg =
    organization?.id === (process.env.REACT_APP_CURRENT_ORG || '1');

  const appSumoData = useMemo(() => {
    if (!customerData) {
      return {
        appSumoCount: 0,
        codeCount: 0,
        activePlan: '',
        tierPlan: false,
        isYearly: false,
        isStripeCustomer: false,
      };
    }

    let codeCount = 0;
    if (customerData.codeCount) {
      if (customerData.codeCount === 9999) {
        codeCount = Infinity;
      } else {
        codeCount = customerData.codeCount * 2;
      }
    }

    return {
      appSumoCount: customerData.appSumoCount || 0,
      codeCount,
      activePlan: customerData.plan_name || '',
      tierPlan: customerData.tierPlan === true,
      isYearly: customerData.interval === 'yearly',
      isStripeCustomer:
        customerData.isCustomer === true && customerData.card ? true : false,
    };
  }, [customerData]);

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

    // If not marked as trial but has an expiration date, skip (likely paid/active)
    // If not marked as trial and no expiration date, treat as expired (mirrors DomainTable "Trial Expired")
    if (selectedSite.trial !== 1 && selectedSite.expiredAt) {
      return null;
    }

    // If no expiredAt is present, treat as expired to mirror DomainTable behavior
    if (!selectedSite.expiredAt) {
      return {
        daysRemaining: 0,
        siteUrl: selectedSite.url,
        isExpired: true,
      };
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

  const selectedSiteObject = useMemo(() => {
    if (!selectedDomain || !sitesData) {
      return null;
    }
    const sites = sitesData?.getUserSites?.sites || sitesData?.getUserSites || [];
    if (!sites || sites.length === 0) {
      return null;
    }
    const normalizedSelectedDomain = normalizeDomain(selectedDomain);
    return sites.find(
      (site: any) => {
        if (!site?.url) return false;
        return (
          site.url === selectedDomain ||
          normalizeDomain(site.url) === normalizedSelectedDomain
        );
      },
    );
  }, [selectedDomain, sitesData]);

  const handleActivateSubscription = async () => {
    if (!selectedSiteObject || !setBillingLoading) return;

    setBillingLoading(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/create-subscription`;
    const bodyData = {
      email: userData?.email,
      returnURL: window.location.href,
      planName: appSumoData.activePlan.toLowerCase(),
      billingInterval:
        !appSumoData.isYearly ||
        APP_SUMO_BUNDLE_NAMES.includes(appSumoData.activePlan.toLowerCase())
          ? 'MONTHLY'
          : 'YEARLY',
      domainId: selectedSiteObject.id,
      domainUrl: selectedSiteObject.url,
      userId: userData?.id,
    };

    const token = getAuthenticationCookie();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      if (data.error) {
        console.error('Subscription error:', data.error);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('There was a problem with the subscription:', error);
    } finally {
      if (setBillingLoading) {
        setBillingLoading(false);
      }
    }
  };

  const handleActivateModal = () => {
    if (onOpenActivateModal && selectedSiteObject) {
      onOpenActivateModal(selectedSiteObject);
    }
  };

  const handleBuyLicense = () => {
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
      {/* Right-aligned dismiss button - positioned absolutely */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-2 md:top-4 md:right-4 text-white hover:text-blue-100 transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 rounded z-10"
        aria-label="Dismiss"
      >
        <FaTimes className="h-4 w-4 md:h-5 md:w-5" />
      </button>

      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
        {/* Mobile Layout: Stacked (screens ≤ 768px) */}
        <div className="flex flex-col md:hidden gap-2">
          
          {/* Text with icon and action button */}
          <div className="flex items-center justify-center flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <FaClock className="text-white h-4 w-4 flex-shrink-0" />
              <p className="font-medium text-sm text-center">
                {trialInfo.isExpired 
                  ? 'Your free trial has expired.'
                  : `You have ${trialInfo.daysRemaining} ${trialInfo.daysRemaining === 1 ? 'day' : 'days'} left on your free trial.`}
              </p>
            </div>
            <PurchaseActionButton
              isAppSumoOrg={isAppSumoOrg}
              activePlan={appSumoData.activePlan}
              tierPlan={appSumoData.tierPlan}
              appSumoCount={appSumoData.appSumoCount}
              codeCount={appSumoData.codeCount}
              billingLoading={billingLoading}
              onActivateSubscription={handleActivateSubscription}
              onOpenActivateModal={handleActivateModal}
              onBuyLicense={handleBuyLicense}
              className="px-3 py-1.5 bg-transparent hover:bg-blue-600 text-white border border-white rounded-md text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Desktop Layout: Horizontal (screens ≥ 768px) */}
        <div className="hidden md:flex items-center justify-center min-h-[48px]">
          {/* Text with icon and Buy License button - centered */}
          <div className="flex items-center justify-center space-x-3">
            <FaClock className="text-white h-5 w-5 flex-shrink-0" />
            <p className="font-medium text-base">
              {trialInfo.isExpired 
                ? 'Your free trial has expired.'
                : `You have ${trialInfo.daysRemaining} ${trialInfo.daysRemaining === 1 ? 'day' : 'days'} left on your free trial.`}
            </p>
            <PurchaseActionButton
              isAppSumoOrg={isAppSumoOrg}
              activePlan={appSumoData.activePlan}
              tierPlan={appSumoData.tierPlan}
              appSumoCount={appSumoData.appSumoCount}
              codeCount={appSumoData.codeCount}
              billingLoading={billingLoading}
              onActivateSubscription={handleActivateSubscription}
              onOpenActivateModal={handleActivateModal}
              onBuyLicense={handleBuyLicense}
              className="px-4 py-1.5 bg-transparent hover:bg-blue-600 text-white border border-white rounded-md text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialExpirationBanner;

