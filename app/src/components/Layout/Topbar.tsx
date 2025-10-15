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
import { toggleSidebar } from '@/features/admin/sidebar';

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
  const { isOpen: isSidebarOpen } = useSelector(
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
                <svg
                  width="148"
                  height="29"
                  viewBox="0 0 148 29"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M31.6083 0.895264H41.34L35.1117 28.1049H22.3438L20.67 17.7115L18.9961 28.1049H6.22825L0 0.895264H9.73163L12.6511 19.8525L16.1934 0.895264H25.1465L28.6499 19.8525L31.6083 0.895264Z"
                    fill="#559EC1"
                  />
                  <path
                    d="M20.544 17.8326L16.4351 0.986084L12.3262 18.6544C12.6549 23.2564 17.1199 26.8722 19.3113 28.1049L20.544 17.8326Z"
                    fill="#205A76"
                  />
                  <path
                    d="M34.9252 28.1049C31.3093 26.4613 29.3097 21.6676 28.7618 19.4762L31.2272 0.986084H41.4994L34.9252 28.1049Z"
                    fill="#205A76"
                  />
                  <path
                    d="M55.34 20.5L51.82 6.42H54.06L56.6 17.5C56.72 18.04 56.76 18.7 56.78 19.18C56.78 19.3 56.82 19.38 56.94 19.38C57.06 19.38 57.1 19.3 57.1 19.18C57.1 18.7 57.12 18.04 57.24 17.5L59.66 6.42H61.9L64.32 17.5C64.44 18.04 64.46 18.7 64.46 19.18C64.46 19.3 64.5 19.38 64.62 19.38C64.74 19.38 64.78 19.3 64.78 19.18C64.8 18.7 64.84 18.04 64.96 17.5L67.5 6.42H69.74L66.22 20.5H63.18L61.06 10.44C61 10.18 60.96 9.72 60.94 9.22C60.94 9.1 60.9 9.02 60.78 9.02C60.66 9.02 60.62 9.1 60.62 9.22C60.6 9.72 60.56 10.18 60.5 10.44L58.38 20.5H55.34ZM79.0056 15.24C79.0056 15.52 78.9856 15.72 78.9456 15.94H71.3056C71.4456 17.58 72.5656 18.9 74.4256 18.9C75.8056 18.9 76.4856 18.22 76.8456 17.04H78.8256C78.4056 18.94 77.0056 20.66 74.3856 20.66C71.1656 20.66 69.4056 18.28 69.4056 15.38C69.4056 12.3 71.4056 10.1 74.3456 10.1C76.6256 10.1 79.0056 11.6 79.0056 15.24ZM71.4056 14.34H77.0856C76.9656 12.84 76.0056 11.78 74.4456 11.78C72.5256 11.78 71.6856 12.96 71.4056 14.34ZM80.612 6.1H82.532V11.06C82.532 11.44 82.472 11.74 82.332 12.16C82.272 12.32 82.152 12.52 82.332 12.58C82.492 12.64 82.552 12.44 82.572 12.38C83.172 11.06 84.372 10.1 86.012 10.1C88.672 10.1 90.532 12.34 90.532 15.38C90.532 18.42 88.672 20.66 86.012 20.66C84.412 20.66 83.192 19.72 82.572 18.34C82.552 18.28 82.492 18.12 82.372 18.16C82.172 18.22 82.272 18.4 82.332 18.56C82.472 19 82.532 19.28 82.532 19.64V20.5H80.612V6.1ZM85.612 18.9C87.612 18.9 88.612 17.28 88.612 15.38C88.612 13.48 87.612 11.86 85.612 11.86C83.792 11.86 82.532 13.48 82.532 15.38C82.532 17.28 83.792 18.9 85.612 18.9ZM104.452 20.5H102.132L100.992 17.14H94.4717L93.3317 20.5H91.0117L96.1317 6.42H99.3317L104.452 20.5ZM97.3717 8.5L95.0517 15.38H100.412L98.0917 8.5C98.0117 8.24 97.9317 8 97.8917 7.66C97.8717 7.54 97.8717 7.42 97.7317 7.42C97.5917 7.42 97.5917 7.54 97.5717 7.66C97.5317 8 97.4517 8.24 97.3717 8.5ZM105.729 6.1H107.649V11.06C107.649 11.44 107.589 11.74 107.449 12.16C107.389 12.32 107.269 12.52 107.449 12.58C107.609 12.64 107.669 12.44 107.689 12.38C108.289 11.06 109.489 10.1 111.129 10.1C113.789 10.1 115.649 12.34 115.649 15.38C115.649 18.42 113.789 20.66 111.129 20.66C109.529 20.66 108.309 19.72 107.689 18.34C107.669 18.28 107.609 18.12 107.489 18.16C107.289 18.22 107.389 18.4 107.449 18.56C107.589 19 107.649 19.28 107.649 19.64V20.5H105.729V6.1ZM110.729 18.9C112.729 18.9 113.729 17.28 113.729 15.38C113.729 13.48 112.729 11.86 110.729 11.86C108.909 11.86 107.649 13.48 107.649 15.38C107.649 17.28 108.909 18.9 110.729 18.9ZM117.329 8.34V6.1H119.409V8.34H117.329ZM117.409 10.26H119.329V20.5H117.409V10.26ZM123.645 6.1V20.5H121.725V6.1H123.645ZM125.962 8.34V6.1H128.042V8.34H125.962ZM126.042 10.26H127.962V20.5H126.042V10.26ZM135.962 10.26V11.94H133.082V17.3C133.082 18.46 133.322 18.82 134.442 18.82H135.962V20.5H134.282C132.162 20.5 131.162 19.72 131.162 17.5V11.94H129.242V10.26H131.162V7.38H133.082V10.26H135.962ZM141.13 20.9L136.93 10.26H139.01L141.77 17.82C141.91 18.18 141.93 18.56 141.93 18.9C141.93 19.02 141.93 19.16 142.09 19.16C142.25 19.16 142.25 19.02 142.25 18.9C142.25 18.56 142.31 18.18 142.43 17.82L145.09 10.26H147.17L142.73 21.72C142.01 23.6 141.01 24.34 139.17 24.34H137.85V22.66H138.77C140.29 22.66 140.55 22.32 140.85 21.58L141.13 20.9Z"
                    fill="#2C2C2C"
                  />
                </svg>
              </div>
            </div>

            {/* Sidebar Toggle Button */}
            <button
              onClick={() => {
                if (isSidebarOpen) {
                  // Close the sidebar
                  dispath(toggleSidebar(false));
                  // For desktop: trigger collapse behavior
                  window.dispatchEvent(new CustomEvent('collapseSidebar'));
                } else {
                  // Open the sidebar
                  dispath(toggleSidebar(true));
                  // For desktop: trigger hover behavior by dispatching a custom event
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
                onClick={() =>
                  window.open('mailto:support@webability.io', '_blank')
                }
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
