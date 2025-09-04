import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import { ReactComponent as DashboardIcon } from '@/assets/images/svg/dashboard.svg';
import { HiOutlineDocumentMagnifyingGlass } from 'react-icons/hi2';
import { BiBarChartAlt2 } from 'react-icons/bi';
import type { RootState } from '@/config/store';
import { toggleSidebar } from '@/features/admin/sidebar';
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
import { HiOutlineUser } from 'react-icons/hi';
import { PiNotebookBold, PiBookOpenBold } from 'react-icons/pi';
import { MdLightbulbOutline } from 'react-icons/md';
import WorkspacesSelect from '@/containers/Dashboard/WorkspacesSelect';
import Dropdown from '../../containers/Dashboard/DropDown';
import { useState, useEffect } from 'react';

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

  const { isOpen } = useSelector((state: RootState) => state.sidebar);
  const history = useHistory();

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

  const { data: userData } = useSelector((state: RootState) => state.user);

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
    dispatch(toggleSidebar(false));
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
    setIsCollapsed(true);
  }

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
        className={`h-[100dvh] sticky top-0 flex flex-none flex-col sm:fixed sm:transition-all sm:duration-[400ms] bg-[#D4E6EF] ${
          isCollapsed ? 'w-[96px]' : 'w-[280px]'
        } ${
          isOpen ? 'sm:left-0 sm:z-[50]' : 'sm:-left-full sm:z-[50]'
        } transition-all duration-300 ${
          isCollapsed ? 'px-2 py-4 pl-4' : 'p-0 pl-6'
        }`}
      >
        {/* Sidebar Card - Only show in expanded mode */}
        {!isCollapsed ? (
          <div className="flex-grow bg-white rounded-2xl overflow-hidden p-2">
            {/* Add new domain button */}
            <div className="p-4">
              <button
                onClick={handleRedirect}
                className="bg-[#000000] hover:bg-[#000000] text-white font-medium rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md w-full py-2 px-4 space-x-2"
              >
                <span className="text-sm whitespace-nowrap">
                  Add new domain
                </span>
                <Plus size={18} className="text-[#559EC1] flex-shrink-0" />
              </button>
            </div>

            {/* Navigation Section */}
            <div className="flex-grow px-4 pb-4">
              <nav className="space-y-0.5">
                {/* Dashboard */}
                <NavLink
                  to="/dashboard"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/dashboard')
                      ? isCollapsed
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <BiBarChartAlt2
                      size={24}
                      className={
                        isActiveRoute('/dashboard')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/dashboard')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Dashboard
                    </span>
                  )}
                </NavLink>

                {/* Customization */}
                <NavLink
                  to="/customize-widget"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/customize-widget')
                      ? isCollapsed
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Pencil
                      size={24}
                      className={
                        isActiveRoute('/customize-widget')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/customize-widget')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Customization
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
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <RiStackLine
                      size={24}
                      className={
                        isActiveRoute('/installation')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/installation')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }`}
                    >
                      Installation
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
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Monitor
                      size={24}
                      className={
                        isActiveRoute('/add-domain')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/add-domain')
                          ? 'text-[#559EC1]'
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
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <HiOutlineDocumentMagnifyingGlass
                      size={24}
                      className={
                        isActiveRoute('/scanner')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/scanner')
                          ? 'text-[#559EC1]'
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
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PiNotebookBold
                      size={24}
                      className={
                        isActiveRoute('/problem-reports')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/problem-reports')
                          ? 'text-[#559EC1]'
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
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <MdLightbulbOutline
                      size={24}
                      className={
                        isActiveRoute('/statement-generator')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/statement-generator')
                          ? 'text-[#559EC1]'
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
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PiBookOpenBold
                      size={24}
                      className={
                        isActiveRoute('/proof-of-effort-toolkit')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/proof-of-effort-toolkit')
                          ? 'text-[#559EC1]'
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
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Sparkles
                      size={24}
                      className={
                        isActiveRoute('/ai-insights')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/ai-insights')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }`}
                    >
                      AI insights
                    </span>
                  )}
                </NavLink>

                {/* License Owner */}
                <NavLink
                  to="/license-owner-info"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 ${
                    isActiveRoute('/license-owner-info')
                      ? isCollapsed
                        ? 'w-10 h-10 bg-[#D4E6EF]  text-[#559EC1] font-medium justify-center mx-auto'
                        : 'space-x-3 px-3 py-2 bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : isCollapsed
                      ? 'w-10 h-10 justify-center mx-auto text-black hover:bg-gray-50 hover:text-gray-900'
                      : 'space-x-3 px-3 py-2 text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <HiOutlineUser
                      size={24}
                      className={
                        isActiveRoute('/license-owner-info')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        isActiveRoute('/license-owner-info')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }`}
                    >
                      License Owner
                    </span>
                  )}
                </NavLink>
              </nav>
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
                <Plus size={24} className="text-[#559EC1]" />
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
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <BiBarChartAlt2
                      size={24}
                      className={
                        isActiveRoute('/dashboard')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* Customization */}
                <NavLink
                  to="/customize-widget"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/customize-widget')
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Pencil
                      size={24}
                      className={
                        isActiveRoute('/customize-widget')
                          ? 'text-[#559EC1]'
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
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <RiStackLine
                      size={24}
                      className={
                        isActiveRoute('/installation')
                          ? 'text-[#559EC1]'
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
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Monitor
                      size={24}
                      className={
                        isActiveRoute('/add-domain')
                          ? 'text-[#559EC1]'
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
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <HiOutlineDocumentMagnifyingGlass
                      size={24}
                      className={
                        isActiveRoute('/scanner')
                          ? 'text-[#559EC1]'
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
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PiNotebookBold
                      size={24}
                      className={
                        isActiveRoute('/problem-reports')
                          ? 'text-[#559EC1]'
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
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <MdLightbulbOutline
                      size={24}
                      className={
                        isActiveRoute('/statement-generator')
                          ? 'text-[#559EC1]'
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
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PiBookOpenBold
                      size={24}
                      className={
                        isActiveRoute('/proof-of-effort-toolkit')
                          ? 'text-[#559EC1]'
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
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Sparkles
                      size={24}
                      className={
                        isActiveRoute('/ai-insights')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>

                {/* License Owner */}
                <NavLink
                  to="/license-owner-info"
                  onClick={closeSidebar}
                  className={`flex items-center rounded-lg transition-all duration-200 w-12 h-12 justify-center mx-auto ${
                    isActiveRoute('/license-owner-info')
                      ? 'bg-[#D4E6EF]  text-[#559EC1] font-medium'
                      : 'text-black hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <HiOutlineUser
                      size={24}
                      className={
                        isActiveRoute('/license-owner-info')
                          ? 'text-[#559EC1]'
                          : 'text-[#656565]'
                      }
                    />
                  </div>
                </NavLink>
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
