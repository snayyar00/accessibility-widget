import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { PiBellBold } from 'react-icons/pi';
import { FiChevronDown } from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa6';
import { Headset } from 'lucide-react';
import { HiOutlinePlay } from 'react-icons/hi';

import Dropdown from '@/containers/Dashboard/DropDown';
import WorkspacesSelect from '@/containers/Dashboard/WorkspacesSelect';
import OrganizationsSelect from '@/containers/Dashboard/OrganizationsSelect';
import WhatsNewModal from '@/components/Common/WhatsNewModal';
import {
  openModal,
  selectLastSeenDate,
} from '@/features/whatsNew/whatsNewSlice';

// Actions
import { toggleSidebar, setSidebarLockedOpen } from '@/features/admin/sidebar';

import type { RootState } from '@/config/store';
import { resolveAvatarPath } from '@/helpers/avatar.helper';
import Avatar from '@/assets/images/avatar.jpg';
import InitialAvatar from '@/components/Common/InitialAvatar';
import { ReactComponent as ArrowDownIcon } from '@/assets/images/svg/arrow-down-18.svg';
import { ReactComponent as MenuIcon } from '@/assets/images/svg/menu.svg';
import Input from '@/components/Common/Input';
import { handleBilling } from '@/containers/Profile/BillingPortalLink';
import { CircularProgress } from '@mui/material';
import EmailVerificationBanner from '../Auth/EmailVerificationBanner';
import { useTourGuidance } from '@/hooks/useTourGuidance';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { baseColors } from '@/config/colors';
import { openHubSpotChat, openSupportEmail } from '@/utils/hubspot';

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
  setReloadSites?: any;
  selectedOption?: string;
  setSelectedOption?: any;
};

const Topbar: React.FC<Props> = ({
  signout,
  options,
  setReloadSites,
  selectedOption,
  setSelectedOption,
}) => {
  const dispath = useDispatch();
  const { t } = useTranslation();

  // Get colors configuration
  // Using baseColors directly
  const {
    data: { avatarUrl, name, email, isActive },
  } = useSelector((state: RootState) => state.user);

  const { data } = useSelector((state: RootState) => state.user);
  const { isOpen: isSidebarOpen, lockedOpen } = useSelector(
    (state: RootState) => state.sidebar,
  );

  const lastSeenDate = useSelector(selectLastSeenDate);

  const [isShowMenu, setIsShowMenu] = useState(false);
  const [isShowNotificationSettings, setIsShowNotificationSettings] =
    useState(false);
  const profileRef = useRef<HTMLElement>(
    null,
  ) as React.MutableRefObject<HTMLDivElement>;
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

  return (
    <div style={{ backgroundColor: baseColors.blueLight }}>
      {!isActive && <EmailVerificationBanner email={email as string} />}
      <div className="mx-4 mt-4 mb-2">
        <div className="bg-body rounded-lg flex items-center justify-between relative h-auto md:h-auto lg:h-16 px-3 md:px-4 lg:px-6 flex-wrap md:flex-wrap lg:flex-nowrap gap-3 md:gap-4 lg:gap-0">
          {/* Left side - Sidebar Toggle and Logo */}
          <div className="flex items-center -ml-0 md:-ml-2 lg:-ml-4 gap-2 lg:gap-0 lg:space-x-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center origin-left scale-90 md:scale-95 lg:scale-100">
                {/* WebAbility Logo */}
                <img
                  src="/images/logo.png"
                  alt="WebAbility Logo"
                  className="h-12"
                />
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
              title="Toggle Sidebar"
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
                  stroke="#A5BACC"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Right side - Selectors and user actions */}
          <div
            className="rounded-lg px-3 md:px-3 lg:px-4 py-2 shadow-sm border border-gray-200 flex w-auto shrink-0 flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 lg:gap-0 space-y-2 md:space-y-0 md:space-x-4 sm:w-full  sm:items-center sm:justify-between"
            style={{ backgroundColor: baseColors.white }}
          >
            {/* Selectors Container */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full md:w-auto">
              {/* Organization/Domain Selector - Only for admin users */}
              {data?.isAdminOrOwner && (
                <div className="w-full md:w-auto min-w-[200px]">
                  <div className="bg-gray-50 rounded-lg border border-gray-200">
                    <OrganizationsSelect />
                  </div>
                </div>
              )}

              {/* Workspace Selector - Only for admin users
              {data?.isAdminOrOwner && (
                <div className="w-full md:w-auto min-w-[150px]">
                  <div className="bg-gray-50 rounded-lg border border-gray-200">
                    <WorkspacesSelect />
                  </div>
                </div>
              )} */}

              {/* Site Selector */}
              <div className="w-full md:w-auto">
                {options &&
                setReloadSites &&
                selectedOption &&
                setSelectedOption ? (
                  <Dropdown
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
                onClick={() =>
                  setIsShowNotificationSettings(!isShowNotificationSettings)
                }
                title="Notification Settings"
              >
                <PiBellBold className="w-5 h-5" style={{ color: '#484848' }} />
              </button>

              {/* Support */}
              <button
                className="p-2 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                onClick={openHubSpotChat}
                title="Contact Support"
              >
                <Headset className="w-5 h-5" style={{ color: '#484848' }} />
              </button>

              {/* User Avatar */}
              <div
                onClick={() => setIsShowMenu(!isShowMenu)}
                ref={profileRef}
                className="flex items-center justify-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center">
                  <InitialAvatar
                    name={name || 'User'}
                    size={40}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings Dropdown */}
          {isShowNotificationSettings && (
            <div className="absolute top-full right-0 mt-3 w-[280px] sm:w-[260px] z-50">
              <div className="relative p-4 border border-solid border-dark-grey rounded-[5px] shadow-xsl bg-white">
                <h3 className="text-lg font-semibold text-sapphire-blue mb-4">
                  Notification Settings
                </h3>
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
                      onClick={(e) =>
                        handleNotificationToggle('monthly_report_flag', e)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        notificationSettings.monthly_report_flag
                          ? 'bg-green-500 focus:ring-green-500'
                          : 'bg-gray-300 focus:ring-gray-300'
                      }`}
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
                      onClick={(e) =>
                        handleNotificationToggle('new_domain_flag', e)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        notificationSettings.new_domain_flag
                          ? 'bg-green-500 focus:ring-green-500'
                          : 'bg-gray-300 focus:ring-gray-300'
                      }`}
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
                      onClick={(e) =>
                        handleNotificationToggle('issue_reported_flag', e)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        notificationSettings.issue_reported_flag
                          ? 'bg-green-500 focus:ring-green-500'
                          : 'bg-gray-300 focus:ring-gray-300'
                      }`}
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
                      onClick={(e) =>
                        handleNotificationToggle('onboarding_emails_flag', e)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        notificationSettings.onboarding_emails_flag
                          ? 'bg-green-500 focus:ring-green-500'
                          : 'bg-gray-300 focus:ring-gray-300'
                      }`}
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
              <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="py-2">
                  <NavLink
                    to="/profile"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents menu from closing
                      if (clicked) {
                        e.preventDefault();
                      } else {
                        document.dispatchEvent(new MouseEvent('click'));
                      }
                    }}
                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4 mr-3 text-gray-400"
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
                    disabled={clicked}
                    onClick={async (e) => {
                      e.stopPropagation();

                      await handleBilling(setClicked, email); // Wait for billing portal action

                      // Manually trigger a click outside to close the menu
                      document.dispatchEvent(new MouseEvent('click'));
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                  >
                    <svg
                      className="w-4 h-4 mr-3 text-gray-400"
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
                      <CircularProgress
                        size={16}
                        sx={{ color: '#3B82F6' }}
                        className="mr-3"
                      />
                    )}
                  </button>

                  <div className="border-t border-gray-100 my-1"></div>

                  <button
                    type="button"
                    disabled={clicked}
                    onClick={signout}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                  >
                    <svg
                      className="w-4 h-4 mr-3 text-gray-400"
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
