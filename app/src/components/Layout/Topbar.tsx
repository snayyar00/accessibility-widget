import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { FiBell } from 'react-icons/fi';

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

const GET_USER_NOTIFICATION_SETTINGS = gql`
  query GetUserNotificationSettings {
    getUserNotificationSettings {
      monthly_report_flag
      new_domain_flag
      issue_reported_flag
    }
  }
`;

const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($monthly_report_flag: Boolean, $new_domain_flag: Boolean, $issue_reported_flag: Boolean) {
    updateNotificationSettings(monthly_report_flag: $monthly_report_flag, new_domain_flag: $new_domain_flag, issue_reported_flag: $issue_reported_flag)
  }
`;

type Props = {
  signout: () => void;
}

const Topbar: React.FC<Props> = ({ signout }) => {
  const dispath = useDispatch();
  const { t } = useTranslation();
  const {
    data: { avatarUrl, name,email,isActive },
  } = useSelector((state: RootState) => state.user);

  const {
    data,
  } = useSelector((state: RootState) => state.user);

  const [isShowMenu, setIsShowMenu] = useState(false);
  const [isShowNotificationSettings, setIsShowNotificationSettings] = useState(false);
  const profileRef = useRef<HTMLElement>(null) as React.MutableRefObject<HTMLDivElement>;
  const notificationRef = useRef<HTMLElement>(null) as React.MutableRefObject<HTMLDivElement>;

  // GraphQL queries and mutations
  const { data: notificationData, refetch: refetchNotifications } = useQuery(GET_USER_NOTIFICATION_SETTINGS);
  const [updateNotificationSettings] = useMutation(UPDATE_NOTIFICATION_SETTINGS);

  const [notificationSettings, setNotificationSettings] = useState({
    monthly_report_flag: false,
    new_domain_flag: false,
    issue_reported_flag: false,
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
    if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
      setIsShowNotificationSettings(false);
    }
  }
  const [clicked,setClicked] = useState(false);

  // Tour guidance hook
  const { resetAndStartTour, hasCurrentPageTour } = useTourGuidance();

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNotificationToggle = async (flag: string, e?: React.MouseEvent) => {
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
    <div>
      {!isActive && (
        <EmailVerificationBanner
          email={(email as string)}
        />
      )}
      <div className="h-[80px] flex items-center justify-between pl-[25px] pr-[32px] relative sm:py-0 sm:px-[15px] sm:h-16">
      <div className="relative sm:w-full sm:mr-[15px] [&>input]:sm:h-[38px] [&>input]:sm:pl-[30px]">
        <div
          onClick={() => dispath(toggleSidebar(true))}
          role="presentation"
          className="hidden absolute top-1/2 translate-y-[-50%] left-[10px] z-[15] sm:block"
        >
          <MenuIcon className="w-8 h-auto" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Tour Guidance Button */}

        {/* Notification Settings Button */}
        <div
          ref={notificationRef}
          role="presentation"
          className="flex items-center cursor-pointer relative"
        >
          <button
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            onClick={() => setIsShowNotificationSettings(!isShowNotificationSettings)}
          >
            <FiBell className={`w-6 h-6 transition-colors duration-200 ${isShowNotificationSettings ? 'text-blue-600' : 'text-sapphire-blue'}`} />
          </button>
        </div>

        {hasCurrentPageTour() && (
          <button
            onClick={resetAndStartTour}
            className="relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                       bg-gradient-to-br from-primary to-light-primary 
                       hover:from-light-primary hover:to-primary 
                       active:from-sapphire-blue active:to-primary
                       shadow-lg hover:shadow-xl active:shadow-md
                       transform hover:scale-105 active:scale-95
                       transition-all duration-200 ease-in-out
                       group overflow-hidden
                       before:absolute before:inset-0 before:rounded-lg 
                       before:bg-white before:opacity-0 hover:before:opacity-10 
                       before:transition-opacity before:duration-200"
            title="Start Interactive Tour Guide"
          >
            {/* Animated ring effect */}
            <div className="absolute inset-0 rounded-lg border-2 border-white/20 
                           animate-pulse group-hover:border-white/40 
                           transition-colors duration-200"></div>
            
            {/* Icon with subtle animation */}
            <Compass 
              size={20} 
              className="text-white drop-shadow-sm 
                        group-hover:rotate-12 group-active:rotate-6
                        transition-all duration-200 ease-in-out
                        relative z-10" 
            />
            
            {/* Button Text */}
            <span className="text-white font-medium text-sm drop-shadow-sm relative z-10">
              Start Tour
            </span>
            
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-white/20 rounded-lg 
                           blur-md scale-110 opacity-0 group-hover:opacity-100 
                           transition-opacity duration-300"></div>
          </button>
        )}
        
    
        
        {/* Profile Section */}
        <div
          onClick={() => setIsShowMenu(!isShowMenu)}
          ref={profileRef}
          role="presentation"
          className="flex items-center cursor-pointer [&>svg]:sm:hidden"
        >
          <div className="w-[50px] h-[50px] flex justify-center items-center topbar_avatar">
            <InitialAvatar name={name || 'User'} size={50} />
          </div>
          <span className="font-medium text-[18px] leading-[22px] text-sapphire-blue mx-2 my-0 sm:hidden">
            {name}
          </span>
          <ArrowDownIcon />
        </div>
      </div>
      
      {/* Notification Settings Dropdown */}
      {isShowNotificationSettings && (
        <div className="absolute top-[calc(100%_+_10px)] right-[215px] w-[280px] sm:left-3/4 sm:transform sm:-translate-x-1/2 sm:top-[calc(100%_+_10px)] md:right-[215px] lg:right-[215px] z-50">
          <div className="relative p-4 border border-solid border-dark-grey rounded-[5px] shadow-xsl bg-white">
            <h3 className="text-lg font-semibold text-sapphire-blue mb-4">Notification Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-sapphire-blue">Monthly Reports</p>
                  <p className="text-xs text-gray-500">Receive monthly accessibility reports</p>
                </div>
                <button
                  onClick={(e) => handleNotificationToggle('monthly_report_flag', e)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notificationSettings.monthly_report_flag ? "bg-green-500 focus:ring-green-500" : "bg-gray-300 focus:ring-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                    notificationSettings.monthly_report_flag ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-sapphire-blue">New Domain Alerts</p>
                  <p className="text-xs text-gray-500">Get report when new domains are added</p>
                </div>
                <button
                  onClick={(e) => handleNotificationToggle('new_domain_flag', e)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notificationSettings.new_domain_flag ? "bg-green-500 focus:ring-green-500" : "bg-gray-300 focus:ring-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                    notificationSettings.new_domain_flag ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-sapphire-blue">Issue Reports</p>
                  <p className="text-xs text-gray-500">Receive notifications for reported issues</p>
                </div>
                <button
                  onClick={(e) => handleNotificationToggle('issue_reported_flag', e)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notificationSettings.issue_reported_flag ? "bg-green-500 focus:ring-green-500" : "bg-gray-300 focus:ring-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                    notificationSettings.issue_reported_flag ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Menu */}
      {isShowMenu && (
        <div className="absolute top-[calc(100%_+_17px)] right-[10px] w-[200px] sm:top-full z-50">
          <ul className="relative p-0 border border-solid border-dark-grey rounded-[5px] shadow-xsl bg-white before:content-[''] before:block before:absolute before:left-1/2 before:bottom-full before:translate-x-[-1/2] before:translate-y-0 before:w-0 before:h-0 before:border-[12px] before:border-solid before:border-transparent before:border-b-dark-grey sm:before:left-[unset] sm:before:right-1 after:content-[''] after:block after:absolute after:left-1/2 after:bottom-full after:translate-x-[-1/2] after:translate-y-0 after:w-0 after:h-0 after:border-[10px] after:border-solid after:border-transparent after:border-b-white sm:after:left-[unset] sm:after:right-2">
            <li className="list-none h-9">
              <NavLink
                to="/profile"
                onClick={(e) => {
                  e.stopPropagation(); // Prevents menu from closing
                  if (clicked){ e.preventDefault()}
                  else{
                    document.dispatchEvent(new MouseEvent('click'));
                  }
                }}
                className="text-[14px] text-sapphire-blue pl-6 overflow-hidden flex items-center w-full h-full active:bg-regular-primary"
              >
                {t('Common.label.profile')}
              </NavLink>
            </li>
            <li className="list-none h-9">
              <button
                disabled={clicked}
                onClick={async (e) => {
                  e.stopPropagation();

                  await handleBilling(setClicked, email); // Wait for billing portal action

                  // Manually trigger a click outside to close the menu
                  document.dispatchEvent(new MouseEvent('click'));
                }}
                className="text-[14px] text-sapphire-blue pl-6 overflow-hidden flex items-center w-full h-full active:bg-regular-primary"
              >
                {!clicked ? (
                  t('Common.label.billing')
                ) : (
                  <CircularProgress
                    size={20}
                    sx={{ color: 'blue' }}
                    className="my-auto"
                  />
                )}
              </button>
            </li>
            <li className="list-none h-9">
              <button
                type="button"
                disabled={clicked}
                onClick={signout}
                className="text-[14px] text-sapphire-blue pl-6 overflow-hidden flex items-center w-full h-full border-none outline-none bg-transparent cursor-pointer"
              >
                {t('Common.title.sign_out')}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
    </div>
    
  );
};

export default Topbar;
