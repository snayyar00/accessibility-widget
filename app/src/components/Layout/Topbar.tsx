import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const LANGUAGES = [
  { code: '', name: 'English' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'as', name: 'Assamese' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'my', name: 'Burmese' },
  { code: 'ca', name: 'Catalan' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'et', name: 'Estonian' },
  { code: 'fil', name: 'Filipino' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ht', name: 'Haitian Creole' },
  { code: 'ha', name: 'Hausa' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'ig', name: 'Igbo' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'ko', name: 'Korean' },
  { code: 'ky', name: 'Kyrgyz' },
  { code: 'lo', name: 'Lao' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mt', name: 'Maltese' },
  { code: 'mi', name: 'Maori' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'ne', name: 'Nepali' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'so', name: 'Somali' },
  { code: 'es', name: 'Spanish' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'tg', name: 'Tajik' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'yi', name: 'Yiddish' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' },
];

/** Get root domain for cookie sharing across subdomains (e.g. app.webability.io -> .webability.io) */
function getCookieDomain(): string | null {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  const parts = hostname.split('.');
  while (parts.length > 2) parts.shift();
  return '.' + parts.join('.');
}

/** Far-future expiry for googtrans cookie (2047) */
const GOOGTRANS_EXPIRES = 'Thu, 07-Mar-2047 20:22:40 GMT';

/** Custom language dropdown - Globe icon + dropdown, triggers Google Translate via cookie */
const GoogleTranslateWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    (window as any).googleTranslateElementInit = () => {
      const g = (window as any).google?.translate;
      if (g && document.getElementById('google_translate_element')) {
        const match = document.cookie.match(/googtrans=\/en\/([^;]+)/);
        if (match) {
          const code = match[1];
          const domain = getCookieDomain();
          document.cookie = `googtrans=/en/${code}; path=/; expires=${GOOGTRANS_EXPIRES}`;
          if (domain) document.cookie = `googtrans=/en/${code}; path=/; expires=${GOOGTRANS_EXPIRES}; domain=${domain}`;
        }
        new g.TranslateElement(
          { pageLanguage: 'en', layout: g.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false },
          'google_translate_element'
        );
      }
    };

    if (!document.querySelector('script[src*="translate.google.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onload = () => {
        if (!(window as any).google?.translate) {
          setTimeout(() => (window as any).googleTranslateElementInit?.(), 2000);
        }
      };
      document.body.appendChild(script);
      // Note: If using CSP, allow script-src https://translate.google.com https://translate.googleapis.com
    } else if ((window as any).google?.translate) {
      (window as any).googleTranslateElementInit();
    }
  }, []);

  useEffect(() => {
    if (isOpen && listboxRef.current) {
      const opts = listboxRef.current.querySelectorAll<HTMLButtonElement>('[role="option"]');
      const selected = Array.from(opts).find((o) => o.getAttribute('aria-selected') === 'true');
      (selected || opts[0])?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/en\/([^;]+)/);
    setCurrentLang(match ? match[1] : '');
  }, []);

  useEffect(() => {
    const hideBanner = () => {
      const frames = document.querySelectorAll('.goog-te-banner-frame, iframe.goog-te-banner-frame');
      frames.forEach((el) => {
        (el as HTMLElement).style.cssText = 'display:none!important;height:0!important;visibility:hidden!important';
      });
      document.body.style.top = '0';
      document.documentElement.style.top = '0';
    };
    hideBanner();
    const observer = new MutationObserver(hideBanner);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = setInterval(hideBanner, 1000);
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleListboxKeyDown = (e: React.KeyboardEvent, code: string) => {
    const opts = listboxRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    if (!opts?.length) return;
    const arr = Array.from(opts);
    let i = LANGUAGES.findIndex((l) => l.code === code);
    if (i < 0) i = arr.findIndex((o) => o.getAttribute('aria-selected') === 'true') || 0;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(code);
    } else if (e.key === 'ArrowDown' && i < arr.length - 1) {
      e.preventDefault();
      arr[i + 1].focus();
    } else if (e.key === 'ArrowUp' && i > 0) {
      e.preventDefault();
      arr[i - 1].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      arr[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      arr[arr.length - 1].focus();
    }
  };

  const handleSelect = (code: string) => {
    const expire = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
    const path = 'path=/';
    const domain = getCookieDomain();

    // Clear ALL googtrans cookies (host-only + domain) to prevent revert from duplicates
    document.cookie = `googtrans=; ${path}; ${expire}`;
    if (domain) document.cookie = `googtrans=; ${path}; ${expire}; domain=${domain}`;

    if (code !== '') {
      document.cookie = `googtrans=/en/${code}; path=/; expires=${GOOGTRANS_EXPIRES}`;
      if (domain) document.cookie = `googtrans=/en/${code}; path=/; expires=${GOOGTRANS_EXPIRES}; domain=${domain}`;
    }

    setIsOpen(false);
    setTimeout(() => {
      window.location.href = window.location.href;
    }, 300);
  };

  return (
    <div ref={ref} className="relative notranslate">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-blue-200 transition-colors duration-200"
        aria-label="Select language"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'google-translate-listbox' : undefined}
      >
        <Globe className="w-5 h-5" style={{ color: '#484848' }} />
        <FiChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: '#6b7280' }}
        />
      </button>
      {isOpen && (
        <div
          ref={listboxRef}
          id="google-translate-listbox"
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full mt-2 w-56 py-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-[400px] overflow-y-auto notranslate"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code || 'en'}
              role="option"
              type="button"
              aria-selected={lang.code === currentLang}
              onClick={() => handleSelect(lang.code)}
              onKeyDown={(e) => handleListboxKeyDown(e, lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                lang.code === currentLang ? 'font-semibold text-[#0052cc] bg-blue-50/50' : 'text-gray-700'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
      {/* Off-screen - Google script needs this div for translation to work */}
      <div id="google_translate_element" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true" />
    </div>
  );
};
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PiBellBold } from 'react-icons/pi';
import { FiChevronDown } from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa6';
import { Headset, Globe } from 'lucide-react';
import { HiOutlinePlay } from 'react-icons/hi';

import OrganizationsSelect from '@/containers/Dashboard/OrganizationsSelect';
import WhatsNewModal from '@/components/Common/WhatsNewModal';
import {
  openModal,
  selectLastSeenDate,
} from '@/features/whatsNew/whatsNewSlice';

// Actions
import { toggleSidebar, setSidebarLockedOpen } from '@/features/admin/sidebar';

import type { RootState } from '@/config/store';
import InitialAvatar from '@/components/Common/InitialAvatar';
import { handleBilling } from '@/containers/Profile/BillingPortalLink';
import { CircularProgress } from '@mui/material';
import EmailVerificationBanner from '../Auth/EmailVerificationBanner';
import TrialExpirationBanner from '../Auth/TrialExpirationBanner';
import { useTourGuidance } from '@/hooks/useTourGuidance';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { baseColors } from '@/config/colors';
import DomainsSelect from '@/containers/Dashboard/DomainsSelect';
import { openHubSpotChat, openSupportEmail } from '@/utils/hubspot';
import Logo from '@/components/Common/Logo';

const GET_USER_NOTIFICATION_SETTINGS = gql`
  query GetUserNotificationSettings {
    getUserNotificationSettings {
      monthly_report_flag
      new_domain_flag
      issue_reported_flag
      onboarding_emails_flag
      monitoring_alert_flag
    }
  }
`;

const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings(
    $monthly_report_flag: Boolean
    $new_domain_flag: Boolean
    $issue_reported_flag: Boolean
    $onboarding_emails_flag: Boolean
    $monitoring_alert_flag: Boolean
  ) {
    updateNotificationSettings(
      monthly_report_flag: $monthly_report_flag
      new_domain_flag: $new_domain_flag
      issue_reported_flag: $issue_reported_flag
      onboarding_emails_flag: $onboarding_emails_flag
      monitoring_alert_flag: $monitoring_alert_flag
    )
  }
`;

type Props = {
  signout: () => void;
  options?: any;
  sitesLoading?: boolean;
  setReloadSites?: any;
  selectedOption?: string;
  setSelectedOption?: any;
  openTrialModal?: () => void;
  setPaymentView?: (value: boolean) => void;
  setOptionalDomain?: (domain: string) => void;
  customerData?: any;
  onOpenActivateModal?: (domain: any) => void;
  billingLoading?: boolean;
  setBillingLoading?: (value: boolean) => void;
};

const Topbar: React.FC<Props> = ({
  signout,
  options,
  sitesLoading = false,
  setReloadSites,
  selectedOption,
  setSelectedOption,
  openTrialModal,
  setPaymentView,
  setOptionalDomain,
  customerData,
  onOpenActivateModal,
  billingLoading,
  setBillingLoading,
}) => {
  const dispath = useDispatch();
  const { t } = useTranslation();

  // Get colors configuration
  // Using baseColors directly
  const {
    data: { avatarUrl, name, email, isActive },
  } = useSelector((state: RootState) => state.user);

  const { data } = useSelector((state: RootState) => state.user);
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );
  const { isOpen: isSidebarOpen, lockedOpen } = useSelector(
    (state: RootState) => state.sidebar,
  );

  const shouldShowSupportIcon =
    organization?.id != null &&
    String(organization.id) === String(process.env.REACT_APP_CURRENT_ORG || '1');

  const lastSeenDate = useSelector(selectLastSeenDate);

  const [isShowMenu, setIsShowMenu] = useState(false);
  const [isShowNotificationSettings, setIsShowNotificationSettings] =
    useState(false);
  const toggleOnColor = '#0A6C30'; // >=3:1 on white
  const toggleOffColor = '#6B7280'; // >=3:1 on white
  const profileRef = useRef<HTMLButtonElement>(null);
  const notificationRef = useRef<HTMLButtonElement>(null);

  // GraphQL queries and mutations
  const { data: notificationData, refetch: refetchNotifications } = useQuery(
    GET_USER_NOTIFICATION_SETTINGS,
  );
  const [updateNotificationSettings] = useMutation(
    UPDATE_NOTIFICATION_SETTINGS,
  );

  const [notificationSettings, setNotificationSettings] = useState({
    monthly_report_flag: false,
    new_domain_flag: false,
    issue_reported_flag: false,
    onboarding_emails_flag: true,
    monitoring_alert_flag: true,
  });

  useEffect(() => {
    if (notificationData?.getUserNotificationSettings) {
      setNotificationSettings(notificationData.getUserNotificationSettings);
    }
  }, [notificationData]);

  function handleClickOutside(e: MouseEvent) {
    if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
      setIsShowMenu(false);
    }
    if (
      notificationRef.current &&
      !notificationRef.current.contains(e.target as Node)
    ) {
      setIsShowNotificationSettings(false);
    }
  }
  const [clicked, setClicked] = useState(false);

  // Tour guidance hook
  const { resetAndStartTour, hasCurrentPageTour } = useTourGuidance();

  // Auto-show logic is handled entirely by WhatsNewModal component

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNotificationToggle = async (
    flag: string,
    e?: React.MouseEvent,
  ) => {
    if (e) {
      e.stopPropagation(); // Prevent click from bubbling and closing the dropdown
    }
    const newSettings = {
      ...notificationSettings,
      [flag]: !notificationSettings[flag as keyof typeof notificationSettings],
    };
    setNotificationSettings(newSettings);
    try {
      await updateNotificationSettings({
        variables: newSettings,
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setNotificationSettings(notificationSettings);
    }
  };

  // Get selected domain from Redux
  const selectedDomain = useSelector(
    (state: RootState) => state.report.selectedDomain,
  );

  // Track if trial banner is visible (updated via callback from TrialExpirationBanner)
  const [isTrialBannerVisible, setIsTrialBannerVisible] = useState(false);

  // Determine which banner to show - wait for data to load before deciding
  // Don't show email banner while sites are loading (to avoid flicker)
  const showEmailBanner = !isActive && !sitesLoading && !isTrialBannerVisible;
  
  return (
    <div style={{ backgroundColor: baseColors.blueLight }}>
      {/* Only show email verification banner if trial banner is not showing and data has loaded */}
      {showEmailBanner && <EmailVerificationBanner email={email as string} />}
      {/* Trial Banner for mobile - shown above topbar on small screens */}
      <div className="md:hidden mx-4 mt-4 mb-2">
        <TrialExpirationBanner 
          sitesData={options} 
          openModal={openTrialModal}
          setPaymentView={setPaymentView}
          setOptionalDomain={setOptionalDomain}
          onVisibilityChange={setIsTrialBannerVisible}
          customerData={customerData}
          onOpenActivateModal={onOpenActivateModal}
          billingLoading={billingLoading}
          setBillingLoading={setBillingLoading}
        />
      </div>
      <div className="mx-4 mt-4 mb-2">
        <div className="bg-body rounded-lg flex items-center justify-between relative h-auto md:h-auto lg:h-16 px-3 md:px-4 lg:px-6 flex-wrap md:flex-wrap lg:flex-nowrap gap-3 md:gap-4 lg:gap-4">
          {/* Left side - Sidebar Toggle and Logo */}
          <div className="flex items-center -ml-0 md:-ml-2 lg:-ml-4 gap-2 lg:gap-0 lg:space-x-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center origin-left scale-90 md:scale-95 lg:scale-100">
                <Logo className="mb-0" />
              </div>
            </div>

            {/* Sidebar Toggle Button */}
            <button
              onClick={() => {
                if (lockedOpen) {
                  // Unlock and close
                  dispath(setSidebarLockedOpen(false));
                  dispath(toggleSidebar(false));
                  window.dispatchEvent(new CustomEvent('collapseSidebar'));
                } else if (isSidebarOpen) {
                  // Currently open but not locked: lock it open
                  dispath(setSidebarLockedOpen(true));
                  dispath(toggleSidebar(true));
                  window.dispatchEvent(new CustomEvent('expandSidebar'));
                } else {
                  // Currently closed: open and lock
                  dispath(setSidebarLockedOpen(true));
                  dispath(toggleSidebar(true));
                  window.dispatchEvent(new CustomEvent('expandSidebar'));
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center"
              aria-label="Sidebar"
              aria-expanded={isSidebarOpen || lockedOpen}
            >
              <svg
                width="25"
                height="25"
                viewBox="0 0 25 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.5 20.5V4.5M9.5 20.5H17.3031C18.421 20.5 18.98 20.5 19.4074 20.2822C19.7837 20.0905 20.0905 19.7837 20.2822 19.4074C20.5 18.98 20.5 18.421 20.5 17.3031V7.69691C20.5 6.57899 20.5 6.0192 20.2822 5.5918C20.0905 5.21547 19.7837 4.90973 19.4074 4.71799C18.9796 4.5 18.4203 4.5 17.3002 4.5H9.5M9.5 20.5H7.69692C6.57901 20.5 6.0192 20.5 5.5918 20.2822C5.21547 20.0905 4.90973 19.7837 4.71799 19.4074C4.5 18.9796 4.5 18.4203 4.5 17.3002V7.7002C4.5 6.58009 4.5 6.01962 4.71799 5.5918C4.90973 5.21547 5.21547 4.90973 5.5918 4.71799C6.01962 4.5 6.58009 4.5 7.7002 4.5H9.5"
                  stroke="#6D8FAC"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Trial Expiration Banner - between logo and tooltip, matches tooltip width */}
          {/* Hidden on mobile, shown on md+ screens */}
          <div className="hidden md:flex flex-1 justify-end min-w-0">
            <TrialExpirationBanner 
              sitesData={options} 
              openModal={openTrialModal}
              setPaymentView={setPaymentView}
              setOptionalDomain={setOptionalDomain}
              onVisibilityChange={setIsTrialBannerVisible}
              customerData={customerData}
              onOpenActivateModal={onOpenActivateModal}
              billingLoading={billingLoading}
              setBillingLoading={setBillingLoading}
            />
          </div>

          {/* Right side - Selectors and user actions */}
          <div
            className="rounded-lg px-3 md:px-3 lg:px-4 py-2 shadow-sm border border-gray-200 flex w-auto shrink-0 flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 lg:gap-0 space-y-2 md:space-y-0 md:space-x-4 sm:w-full sm:items-center sm:justify-between ml-auto"
            style={{ backgroundColor: baseColors.white }}
          >
            {/* Selectors Container */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full md:w-auto">
              {/* Organization/Domain Selector - Only for admin users */}
              {data?.isAdminOrOwnerOrSuper && (
                <div className="w-full md:w-auto min-w-[200px]">
                  <div className="bg-gray-50 rounded-lg border border-gray-200">
                    <OrganizationsSelect />
                  </div>
                </div>
              )}

              {/* Site Selector */}
              <div className="w-full md:w-auto">
                {options &&
                setReloadSites &&
                selectedOption &&
                setSelectedOption ? (
                  <DomainsSelect
                    data={options}
                    setReloadSites={setReloadSites}
                    selectedOption={selectedOption}
                    setSelectedOption={setSelectedOption}
                  />
                ) : (
                  <div className="flex items-center space-x-2 bg-[#D0D5F9] px-3 py-2 rounded-lg">
                    <span className="text-sm font-medium text-[#445AE7]">
                      Select a site
                    </span>
                    <FiChevronDown className="w-4 h-4 text-[#445AE7]" />
                  </div>
                )}
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center flex-wrap md:flex-wrap lg:flex-nowrap gap-2 md:gap-3 lg:gap-0 lg:space-x-3 sm:w-full sm:justify-evenly md:justify-end">
              {/* Start Tour Button */}
              {hasCurrentPageTour() && (
                <button
                  className="p-2 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                  onClick={resetAndStartTour}
                  title="Start Tour"
                >
                  <HiOutlinePlay
                    className="w-5 h-5 text-black"
                    style={{ color: '#484848' }}
                  />
                </button>
              )}

              {/* What's New Button */}
              <button
                className="p-2 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                onClick={() => dispath(openModal())}
                title="What's New"
              >
                <FaRocket
                  className="w-5 h-5 text-black"
                  style={{ color: '#484848' }}
                />
              </button>

              {/* Notifications */}
              <button
                ref={notificationRef}
                className="p-2 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                type="button"
                aria-haspopup="true"
                aria-expanded={isShowNotificationSettings}
                aria-controls="notification-settings-dropdown"
                onClick={() =>
                  setIsShowNotificationSettings(!isShowNotificationSettings)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsShowNotificationSettings(!isShowNotificationSettings);
                  }
                }}
                title="Notification Settings"
              >
                <PiBellBold className="w-5 h-5" style={{ color: '#484848' }} />
              </button>

              {/* Support - only show when current org matches REACT_APP_CURRENT_ORG */}
              {shouldShowSupportIcon && (
                <button
                  className="p-2 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                  onClick={openHubSpotChat}
                  title="Contact Support"
                >
                  <Headset className="w-5 h-5" style={{ color: '#484848' }} />
                </button>
              )}

              {/* Google Translate - load script after mount so the div exists */}
              <GoogleTranslateWidget />

              {/* User Avatar */}
              <button
                type="button"
                onClick={() => setIsShowMenu(!isShowMenu)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsShowMenu(!isShowMenu);
                  }
                }}
                ref={profileRef}
                className="flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-transform duration-200 hover:scale-110 active:scale-95 hover:bg-transparent hover:!bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                aria-label={`Profile picture for ${name || 'User'}`}
                aria-expanded={isShowMenu}
                aria-haspopup="menu"
                aria-controls="profile-menu"
                title={`${name || 'User'} - Profile Picture`}
                tabIndex={0}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center hover:border-gray-300">
                  <InitialAvatar
                    name={name || 'User'}
                    size={40}
                    className="rounded-lg"
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Notification Settings Dropdown */}
          {isShowNotificationSettings && (
            <div
              id="notification-settings-dropdown"
              className="absolute top-full right-0 mt-3 w-[280px] sm:w-[260px] z-50"
            >
              <div className="relative p-4 border border-solid border-dark-grey rounded-[5px] shadow-xsl bg-white">
                <h2 className="text-lg font-semibold text-sapphire-blue mb-4">
                  Notification Settings
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium text-sapphire-blue">
                        Monthly Reports
                      </p>
                      <p className="text-xs text-gray-500">
                        Receive monthly accessibility reports
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label="Monthly Reports"
                      aria-checked={notificationSettings.monthly_report_flag ? 'true' : 'false'}
                      onClick={(e) =>
                        handleNotificationToggle('monthly_report_flag', e)
                      }
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        backgroundColor: notificationSettings.monthly_report_flag
                          ? toggleOnColor
                          : toggleOffColor,
                        borderColor: notificationSettings.monthly_report_flag
                          ? toggleOnColor
                          : toggleOffColor,
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          notificationSettings.monthly_report_flag
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium text-sapphire-blue">
                        New Domain Alerts
                      </p>
                      <p className="text-xs text-gray-500">
                        Get report when new domains are added
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label="New Domain Alerts"
                      aria-checked={notificationSettings.new_domain_flag ? 'true' : 'false'}
                      onClick={(e) =>
                        handleNotificationToggle('new_domain_flag', e)
                      }
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        backgroundColor: notificationSettings.new_domain_flag
                          ? toggleOnColor
                          : toggleOffColor,
                        borderColor: notificationSettings.new_domain_flag
                          ? toggleOnColor
                          : toggleOffColor,
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          notificationSettings.new_domain_flag
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium text-sapphire-blue">
                        Issue Reports
                      </p>
                      <p className="text-xs text-gray-500">
                        Receive notifications for reported issues
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label="Issue Reports"
                      aria-checked={notificationSettings.issue_reported_flag ? 'true' : 'false'}
                      onClick={(e) =>
                        handleNotificationToggle('issue_reported_flag', e)
                      }
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        backgroundColor: notificationSettings.issue_reported_flag
                          ? toggleOnColor
                          : toggleOffColor,
                        borderColor: notificationSettings.issue_reported_flag
                          ? toggleOnColor
                          : toggleOffColor,
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          notificationSettings.issue_reported_flag
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium text-sapphire-blue">
                        Onboarding Emails
                      </p>
                      <p className="text-xs text-gray-500">
                        Receive helpful emails to get started
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label="Onboarding Emails"
                      aria-checked={notificationSettings.onboarding_emails_flag ? 'true' : 'false'}
                      onClick={(e) =>
                        handleNotificationToggle('onboarding_emails_flag', e)
                      }
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        backgroundColor: notificationSettings.onboarding_emails_flag
                          ? toggleOnColor
                          : toggleOffColor,
                        borderColor: notificationSettings.onboarding_emails_flag
                          ? toggleOnColor
                          : toggleOffColor,
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          notificationSettings.onboarding_emails_flag
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Menu */}
          {isShowMenu && (
            <div className="absolute top-full right-0 mt-3 w-[200px] z-50">
              <div 
                id="profile-menu"
                role="menu"
                className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
              >
                <div className="py-2">
                  <NavLink
                    to="/profile"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents menu from closing
                      if (clicked) {
                        e.preventDefault();
                      } else {
                        document.dispatchEvent(new MouseEvent('click'));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    className="flex items-center px-4 py-3 text-sm font-medium text-[#0074E8] hover:translate-x-1 focus:translate-x-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:bg-transparent transition-transform duration-200 cursor-pointer hover:bg-transparent"
                    style={{ color: '#0074E8' }}
                    tabIndex={0}
                    aria-label={`${t('Common.label.profile')} (menu item 1 of 3 in list)`}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      style={{ color: '#8D95A3' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {t('Common.label.profile')}
                  </NavLink>

                  <button
                    type="button"
                    role="menuitem"
                    aria-label={
                      clicked
                        ? 'Loading, opening Billing & Plans '
                        : 'Billing & Plans '
                    }
                    aria-busy={clicked}
                    aria-describedby="billing-menu-loading-announcement"
                    disabled={clicked}
                    onClick={async (e) => {
                      e.stopPropagation();

                      await handleBilling(setClicked, email); // Wait for billing portal action

                      // Manually trigger a click outside to close the menu
                      document.dispatchEvent(new MouseEvent('click'));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!clicked) {
                          e.currentTarget.click();
                        }
                      }
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:translate-x-1 focus:translate-x-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:bg-transparent transition-transform duration-200 cursor-pointer border-none bg-transparent hover:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    tabIndex={0}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      style={{ color: '#8D95A3' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    {!clicked ? (
                      t('Common.label.billing')
                    ) : (
                      <>
                        <CircularProgress
                          size={16}
                          sx={{ color: '#3B82F6' }}
                          className="mr-3"
                        />
                        <span className="sr-only">Loading, opening billing portal</span>
                      </>
                    )}
                  </button>
                  <div
                    id="billing-menu-loading-announcement"
                    role="status"
                    aria-live="assertive"
                    aria-atomic="true"
                    className="sr-only"
                  >
                    {clicked ? 'Loading, opening billing portal' : ''}
                  </div>

                  <div className="border-t border-gray-100 my-1"></div>

                  <button
                    type="button"
                    role="menuitem"
                    aria-label="Sign Out (item 3 of 3)"
                    disabled={clicked}
                    onClick={signout}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!clicked) {
                          signout();
                        }
                      }
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:translate-x-1 focus:translate-x-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset focus:bg-transparent transition-transform duration-200 cursor-pointer border-none bg-transparent hover:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    tabIndex={0}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      style={{ color: '#8D95A3' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    {t('Common.title.sign_out')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* What's New Modal */}
          <WhatsNewModal autoShow={true} />
        </div>
      </div>
    </div>
  );
};

export default Topbar;
