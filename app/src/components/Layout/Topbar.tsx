import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';

// Actions
import { toggleSidebar } from '@/features/admin/sidebar';

import type { RootState } from '@/config/store';
import { resolveAvatarPath } from '@/helpers/avatar.helper';
import Avatar from '@/assets/images/avatar.jpg';
import { ReactComponent as ArrowDownIcon } from '@/assets/images/svg/arrow-down-18.svg';
import { ReactComponent as MenuIcon } from '@/assets/images/svg/menu.svg';
import Input from '@/components/Common/Input';
import { handleBilling } from '@/containers/Profile/BillingPortalLink';
import { CircularProgress } from '@mui/material';
import EmailVerificationBanner from '../Auth/EmailVerificationBanner';
import { useTourGuidance } from '@/hooks/useTourGuidance';

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
  const profileRef = useRef<HTMLElement>(null) as React.MutableRefObject<HTMLDivElement>;

  function handleClickOutside(e: MouseEvent) {
    if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
      setIsShowMenu(false);
    }
  }
  const [clicked,setClicked] = useState(false);

  // Tour guidance hook
  const { resetAndStartTour, hasCurrentPageTour } = useTourGuidance();

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
        {/* <Input placeholder="Search..." className="w-[468px] border-[#d2d5e1] sm:w-full" /> */}
      </div>
      <div className="flex items-center gap-4">
        {/* Tour Guidance Button */}
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
            <div className="absolute inset-0 rounded-lg bg-primary/20 
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
            <img src={resolveAvatarPath(avatarUrl, Avatar)} alt="avatar" />
          </div>
          <span className="font-medium text-[18px] leading-[22px] text-sapphire-blue mx-2 my-0 sm:hidden">
            {name}
          </span>
          <ArrowDownIcon />
        </div>
      </div>
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
                {t('Common.title.profile')}
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
                  t('Common.title.Billing')
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
