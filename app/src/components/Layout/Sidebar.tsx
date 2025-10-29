import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import { ReactComponent as DashboardIcon } from '@/assets/images/svg/dashboard.svg';
import { HiOutlineDocumentMagnifyingGlass } from 'react-icons/hi2';
import { BiBarChartAlt2 } from 'react-icons/bi';
import type { RootState } from '@/config/store';
import { toggleSidebar, setSidebarLockedOpen } from '@/features/admin/sidebar';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import routes from '@/routes';
import { GoGear } from 'react-icons/go';
import { RiStackLine } from 'react-icons/ri';
import OrganizationsSelect from '@/containers/Dashboard/OrganizationsSelect';
import {
  Folders,
  UserIcon,
  Plus,
  Pencil,
  Layers,
  Monitor,
  Sparkles,
  Accessibility,
} from 'lucide-react';
import { LuCircleDollarSign } from 'react-icons/lu';
import { HiOutlineUser } from 'react-icons/hi';
import { PiNotebookBold, PiBookOpenBold } from 'react-icons/pi';
import { MdLightbulbOutline } from 'react-icons/md';
import WorkspacesSelect from '@/containers/Dashboard/WorkspacesSelect';
import Dropdown from '../../containers/Dashboard/DropDown';
import { useState, useEffect, useRef } from 'react';
import { handleBilling } from '@/containers/Profile/BillingPortalLink';
import { CircularProgress } from '@mui/material';
import { baseColors } from '@/config/colors';

const Sidebar = ({
  options,
  setReloadSites,
  selectedOption,
  setSelectedOption,
}: any) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [billingClicked, setBillingClicked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Get colors configuration
  // Using baseColors directly

  const { isOpen, lockedOpen } = useSelector(
    (state: RootState) => state.sidebar,
  );
  const history = useHistory();

  // Detect narrow mode (treat <768px as mobile-like: applies to sm and md)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 770);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for custom expand/collapse events from Topbar
  useEffect(() => {
    const handleExpandSidebar = () => {
      setIsCollapsed(false);
      setIsHovered(true);
    };

    const handleCollapseSidebar = () => {
      setIsCollapsed(true);
      setIsHovered(false);
    };

    window.addEventListener('expandSidebar', handleExpandSidebar);
    window.addEventListener('collapseSidebar', handleCollapseSidebar);

    return () => {
      window.removeEventListener('expandSidebar', handleExpandSidebar);
      window.removeEventListener('collapseSidebar', handleCollapseSidebar);
    };
  }, []);

  // Sync collapsed state with Redux isOpen and lockedOpen state
  useEffect(() => {
    if (!isOpen && !lockedOpen) {
      setIsCollapsed(true);
      setIsHovered(false);
    } else if (isOpen || lockedOpen) {
      setIsCollapsed(false);
    }
  }, [isOpen, lockedOpen]);

  // Close sidebar in mobile mode on navigation (only when route changes, not on initial mount)
  const prevPathname = useRef(location.pathname);
  const isInitialNavigationMount = useRef(true);
  useEffect(() => {
    // Skip on initial mount
    if (isInitialNavigationMount.current) {
      isInitialNavigationMount.current = false;
      prevPathname.current = location.pathname;
      return;
    }

    if (isMobile && location.pathname !== prevPathname.current && isOpen) {
      prevPathname.current = location.pathname;
      dispatch(toggleSidebar(false));
      if (lockedOpen) {
        dispatch(setSidebarLockedOpen(false));
      }
    } else if (location.pathname !== prevPathname.current) {
      prevPathname.current = location.pathname;
    }
  }, [location.pathname, isMobile, isOpen, lockedOpen, dispatch]);

  // Close sidebar only when switching to mobile mode from desktop (not on initial mount)
  const prevIsMobile = useRef(isMobile);
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevIsMobile.current = isMobile;
      return;
    }

    // Only close if switching from desktop to mobile while sidebar is open
    if (!prevIsMobile.current && isMobile && isOpen) {
      dispatch(toggleSidebar(false));
      if (lockedOpen) {
        dispatch(setSidebarLockedOpen(false));
      }
    }
    prevIsMobile.current = isMobile;
  }, [isMobile, isOpen, lockedOpen, dispatch]);

  const { data: userData } = useSelector((state: RootState) => state.user);
  const { data: user } = useSelector((state: RootState) => state.user);

  // Helper function to check if a route is active
  const isActiveRoute = (path: string) => {
    const currentPath = location.pathname;

    // Exact match
    if (currentPath === path) {
      return true;
    }

    // Sub-route match (only if the path ends with a slash or the next character is a slash)
    if (currentPath.startsWith(path + '/')) {
      return true;
    }

    return false;
  };
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  function closeSidebar() {
    // In mobile mode, always allow closing
    // In desktop mode, only close if not locked
    if (!isMobile && lockedOpen) return;
    dispatch(toggleSidebar(false));
    // Also unlock when closing in mobile mode
    if (isMobile && lockedOpen) {
      dispatch(setSidebarLockedOpen(false));
    }
  }

  const handleRedirect = () => {
    history.push('/add-domain?open-modal=true');
  };

  function handleMouseEnter() {
    setIsHovered(true);
    setIsCollapsed(false);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    if (!lockedOpen) {
      setIsCollapsed(true);
    }
  }

  const handleBillingClick = async () => {
    await handleBilling(setBillingClicked, user?.email);
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={closeSidebar}
          role="presentation"
          className="sm:fixed sm:h-screen sm:w-screen overflow-hidden sm:left-0 sm:top-0 sm:z-[49] text-black opacity-30"
        />
      )}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`h-[100dvh] sticky top-0 flex flex-none flex-col sm:fixed sm:transition-all sm:duration-[400ms] ${
          isCollapsed ? 'w-[96px]' : 'w-[280px]'
        } ${
          isOpen ? 'sm:left-0 sm:z-[50]' : 'sm:-left-full sm:z-[50]'
        } transition-all duration-300 ${
          isCollapsed
            ? 'px-2 py-4 pl-4 sm:px-0 sm:py-0 sm:pl-0'
            : 'p-0 pl-6 sm:p-0 sm:pl-0'
        }`}
        style={{ backgroundColor: baseColors.blueLight }}
      >
        {/* Sidebar Card - Only show in expanded mode */}
        {!isCollapsed ? (
          <div
            className="flex-grow rounded-2xl overflow-hidden p-2 flex flex-col"
            style={{ backgroundColor: baseColors.white }}
          >
            {/* Add new domain button */}
            <div className="p-4">
              <button
                onClick={handleRedirect}
                className="font-medium rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md w-full py-2 px-4 space-x-2"
                style={{
                  backgroundColor: baseColors.black,
                  color: baseColors.white,
                }}
              >
                <span className="text-sm whitespace-nowrap">
                  Add new domain
                </span>
                <Plus
                  size={18}
                  className="flex-shrink-0"
                  style={{ color: baseColors.white }}
                />
              </button>
            </div>

            {/* Navigation Section */}
            <div className="flex-grow px-4">
              <nav className="space-y-2">
                {/* Dashboard */}
                <NavLink
                  to="/dashboard"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/dashboard')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#d0d5f9] text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#d0d5f9] text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <BiBarChartAlt2
                      size={24}
                      className={
                        isActiveRoute('/dashboard')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/dashboard')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Dashboard
                    </span>
                  )}
                </NavLink>

                {/* Installation */}
                <NavLink
                  to="/installation"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/installation')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#d0d5f9] text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#d0d5f9] text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <RiStackLine
                      size={24}
                      className={
                        isActiveRoute('/installation')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/installation')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Installation
                    </span>
                  )}
                </NavLink>

                {/* Customization */}
                <NavLink
                  to="/widget-selection"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/widget-selection') ||
                    isActiveRoute('/customize-widget') ||
                    isActiveRoute('/old-widget')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#d0d5f9] text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#d0d5f9] text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Pencil
                      size={24}
                      className={
                        isActiveRoute('/widget-selection') ||
                        isActiveRoute('/customize-widget') ||
                        isActiveRoute('/old-widget')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/widget-selection') ||
                        isActiveRoute('/customize-widget') ||
                        isActiveRoute('/old-widget')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Customization
                    </span>
                  )}
                </NavLink>

                {/* My sites */}
                <NavLink
                  to="/add-domain"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/add-domain')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#D0D5F9]  text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Monitor
                      size={24}
                      className={
                        isActiveRoute('/add-domain')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/add-domain')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      My sites
                    </span>
                  )}
                </NavLink>

                {/* Scanner */}
                <NavLink
                  to="/scanner"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/scanner')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#D0D5F9]  text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <HiOutlineDocumentMagnifyingGlass
                      size={24}
                      className={
                        isActiveRoute('/scanner')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/scanner')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Scanner
                    </span>
                  )}
                </NavLink>

                {/* Issues */}
                <NavLink
                  to="/problem-reports"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/problem-reports')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#D0D5F9]  text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PiNotebookBold
                      size={24}
                      className={
                        isActiveRoute('/problem-reports')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/problem-reports')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Issues
                    </span>
                  )}
                </NavLink>

                {/* AI Statement */}
                <NavLink
                  to="/statement-generator"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/statement-generator')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#D0D5F9]  text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <MdLightbulbOutline
                      size={24}
                      className={
                        isActiveRoute('/statement-generator')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/statement-generator')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      AI statement
                    </span>
                  )}
                </NavLink>

                {/* Proof of effort */}
                <NavLink
                  to="/proof-of-effort-toolkit"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/proof-of-effort-toolkit')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#D0D5F9]  text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PiBookOpenBold
                      size={24}
                      className={
                        isActiveRoute('/proof-of-effort-toolkit')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/proof-of-effort-toolkit')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Proof of effort
                    </span>
                  )}
                </NavLink>

                {/* AI Insights */}
                <NavLink
                  to="/ai-insights"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/ai-insights')
                      ? isCollapsed
                        ? 'w-12 h-12 bg-[#D0D5F9]  text-[#445AE7] font-medium justify-center mx-auto'
                        : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : isCollapsed
                      ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Sparkles
                      size={24}
                      className={
                        isActiveRoute('/ai-insights')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm whitespace-nowrap ${
                        isActiveRoute('/ai-insights')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }`}
                    >
                      AI insights
                    </span>
                  )}
                </NavLink>

                {/* Admin Controls - Only visible for admin/owner roles */}
                {userData?.isAdminOrOwner && (
                  <>
                    {/* Users Management */}
                    <NavLink
                      to="/users"
                      onClick={closeSidebar}
                      className={`flex items-center rounded-lg transition-all duration-200 ${
                        isActiveRoute('/users')
                          ? isCollapsed
                            ? 'w-12 h-12 bg-[#D0D5F9]  text-[#445AE7] font-medium justify-center mx-auto'
                            : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#D0D5F9]  text-[#445AE7] font-medium'
                          : isCollapsed
                          ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                          : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <UserIcon
                          size={24}
                          className={
                            isActiveRoute('/users')
                              ? 'text-[#445AE7]'
                              : 'text-[#656565]'
                          }
                        />
                      </div>
                      {!isCollapsed && (
                        <span
                          className={`text-sm whitespace-nowrap ${
                            isActiveRoute('/users')
                              ? 'text-[#445AE7]'
                              : 'text-[#656565]'
                          }`}
                        >
                          Users
                        </span>
                      )}
                    </NavLink>

                    {/* Workspaces Management */}
                    <NavLink
                      to="/workspaces"
                      onClick={closeSidebar}
                      className={`flex items-center rounded-lg transition-all duration-200 ${
                        isActiveRoute('/workspaces')
                          ? isCollapsed
                            ? 'w-12 h-12 bg-[#D0D5F9]  text-[#445AE7] font-medium justify-center mx-auto'
                            : 'w-full h-12 space-x-3 justify-start px-3 py-2 bg-[#D0D5F9]  text-[#445AE7] font-medium'
                          : isCollapsed
                          ? 'w-12 h-12 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                          : 'w-full h-12 space-x-3 justify-start px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <Folders
                          size={24}
                          className={
                            isActiveRoute('/workspaces')
                              ? 'text-[#445AE7]'
                              : 'text-[#656565]'
                          }
                        />
                      </div>
                      {!isCollapsed && (
                        <span
                          className={`text-sm whitespace-nowrap ${
                            isActiveRoute('/workspaces')
                              ? 'text-[#445AE7]'
                              : 'text-[#656565]'
                          }`}
                        >
                          Workspaces
                        </span>
                      )}
                    </NavLink>
                  </>
                )}
              </nav>
            </div>

            {/* Billing Button - Always at the end */}
            <div className="px-4 pb-4 mt-auto">
              <a
                href="https://webability.getrewardful.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white border border-[#445AE7] rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md py-3 px-4 space-x-3 hover:bg-gray-50"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <LuCircleDollarSign size={24} className="text-[#94BFFF]" />
                </div>
                <span className="text-sm font-medium text-[#656565] whitespace-nowrap">
                  Join Referral Program
                </span>
              </a>
            </div>
          </div>
        ) : (
          /* Collapsed Mode - Direct navigation without card */
          <div className="flex-grow flex flex-col bg-white rounded-2xl">
            {/* Add new domain button */}
            <div className="pt-4 mb-4">
              <button
                onClick={handleRedirect}
                className="bg-[#000000] hover:bg-[#000000] text-white font-medium rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md w-12 h-12 mx-auto"
              >
                <Plus size={24} className="text-white" />
              </button>
            </div>

            {/* Navigation Section */}
            <div className="flex-grow">
              <nav className="space-y-2">
                {/* Dashboard */}
                <NavLink
                  to="/dashboard"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/dashboard')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <BiBarChartAlt2
                      size={24}
                      className={
                        isActiveRoute('/dashboard')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* Installation */}
                <NavLink
                  to="/installation"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/installation')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <RiStackLine
                      size={24}
                      className={
                        isActiveRoute('/installation')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* Customization */}
                <NavLink
                  to="/widget-selection"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/widget-selection') ||
                    isActiveRoute('/customize-widget') ||
                    isActiveRoute('/old-widget')
                      ? 'bg-[#D0D5F9] text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Pencil
                      size={24}
                      className={
                        isActiveRoute('/widget-selection') ||
                        isActiveRoute('/customize-widget') ||
                        isActiveRoute('/old-widget')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* My sites */}
                <NavLink
                  to="/add-domain"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/add-domain')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Monitor
                      size={24}
                      className={
                        isActiveRoute('/add-domain')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* Scanner */}
                <NavLink
                  to="/scanner"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/scanner')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <HiOutlineDocumentMagnifyingGlass
                      size={24}
                      className={
                        isActiveRoute('/scanner')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* Issues */}
                <NavLink
                  to="/problem-reports"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/problem-reports')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PiNotebookBold
                      size={24}
                      className={
                        isActiveRoute('/problem-reports')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* AI Statement */}
                <NavLink
                  to="/statement-generator"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/statement-generator')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <MdLightbulbOutline
                      size={24}
                      className={
                        isActiveRoute('/statement-generator')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* Proof of effort */}
                <NavLink
                  to="/proof-of-effort-toolkit"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/proof-of-effort-toolkit')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PiBookOpenBold
                      size={24}
                      className={
                        isActiveRoute('/proof-of-effort-toolkit')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* AI Insights */}
                <NavLink
                  to="/ai-insights"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/ai-insights')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Sparkles
                      size={24}
                      className={
                        isActiveRoute('/ai-insights')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* License Owner
                <NavLink
                  to="/license-owner-info"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/license-owner-info')
                      ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <HiOutlineUser
                      size={24}
                      className={
                        isActiveRoute('/license-owner-info')
                          ? 'text-[#445AE7]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink> */}

                {/* Admin Controls - Only visible for admin/owner roles */}
                {userData?.isAdminOrOwner && (
                  <>
                    {/* Users Management */}
                    <NavLink
                      to="/users"
                      onClick={closeSidebar}
                      className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                        isActiveRoute('/users')
                          ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                          : 'text-black hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <UserIcon
                          size={24}
                          className={
                            isActiveRoute('/users')
                              ? 'text-[#445AE7]'
                              : 'text-[#656565]'
                          }
                        />
                      </div>
                    </NavLink>

                    {/* Workspaces Management */}
                    <NavLink
                      to="/workspaces"
                      onClick={closeSidebar}
                      className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                        isActiveRoute('/workspaces')
                          ? 'bg-[#D0D5F9]  text-[#445AE7] font-medium'
                          : 'text-black hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <Folders
                          size={24}
                          className={
                            isActiveRoute('/workspaces')
                              ? 'text-[#445AE7]'
                              : 'text-[#656565]'
                          }
                        />
                      </div>
                    </NavLink>
                  </>
                )}
              </nav>
            </div>

            {/* Billing Button - Collapsed - Always at the end */}
            <div className="pb-4 mt-auto">
              <a
                href="https://webability.getrewardful.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-white border border-[#C5D9E0] rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md mx-auto hover:bg-gray-50"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <LuCircleDollarSign size={24} className="text-[#94BFFF]" />
                </div>
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
