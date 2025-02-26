import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReactComponent as DashboardIcon } from '@/assets/images/svg/dashboard.svg';
import { ReactComponent as UserIcon } from '@/assets/images/svg/user.svg';
import type { RootState } from '@/config/store';
import { toggleSidebar } from '@/features/admin/sidebar';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import routes from '@/routes';
import Dropdown from '@/containers/Dashboard/DropDown';
import { GoGear } from 'react-icons/go';
import { GrInstallOption } from 'react-icons/gr';

const Sidebar = ({
  options,
  setReloadSites,
  selectedOption,
  setSelectedOption,
}: any) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { isOpen } = useSelector((state: RootState) => state.sidebar);

  function closeSidebar() {
    dispatch(toggleSidebar(false));
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
        className={`h-screen flex min-w-fit flex-col sm:fixed sm:bg-white sm:transition-all sm:duration-[400ms] 
  ${isOpen ? 'sm:left-0 sm:z-[50]' : 'sm:-left-full sm:z-[50]'}`}
      >
        <a
          href="/"
          className="flex h-[81px] items-center px-4 border-b border-r border-solid border-gray"
        >
          <LogoIcon />
        </a>

        <div className="flex-grow min-w-[250px] sm:w-[20%] md:w-[18%] lg:w-[15%] transition-all duration-300">
          <div className="mb-2 w-full pl-6 border-l-2 border-transparent flex items-center">
            <Dropdown
              data={options}
              setReloadSites={setReloadSites}
              selectedOption={selectedOption}
              setSelectedOption={setSelectedOption}
            />
          </div>

          <ul className="p-0 space-y-1">
            <li key="/dashboard" className="h-[60px] flex items-center">
              <NavLink
                to="/dashboard"
                activeClassName="active"
                onClick={closeSidebar}
                className="w-full h-full flex items-center px-2 border-l-2 border-transparent 
          [&.active]:bg-regular-primary [&.active]:border-primary [&.active>.menu-text]:text-primary 
          [&.active>.menu-text]:font-medium [&.active>.menu-icon>.menu-icon]:text-primary transition-all duration-200 [&.active>.menu-icon>svg_*[fill]]:fill-primary [&.active>.menu-icon>svg_*[stroke]]:stroke-primary"
              >
                <div className="menu-icon flex items-center justify-center w-12 h-6">
                  <DashboardIcon/>
                </div>
                <span className="menu-text text-lg text-white-blue ml-4">
                  Dashboard
                </span>
              </NavLink>
            </li>

            <li key="/installation" className="h-[60px] flex items-center">
              <NavLink
                to="/installation"
                activeClassName="active"
                onClick={closeSidebar}
                className="w-full h-full flex items-center px-2 border-l-2 border-transparent 
          [&.active]:bg-regular-primary [&.active]:border-primary [&.active>.menu-text]:text-primary 
          [&.active>.menu-text]:font-medium [&.active>.menu-icon>.menu-icon]:text-primary transition-all duration-200"
              >
                <div className="menu-icon flex items-center justify-center w-12 h-6">
                  <GrInstallOption
                    className="menu-icon text-white-blue transition-colors duration-200"
                    size={25}
                  />
                </div>
                <span className="menu-text text-lg text-white-blue ml-4">
                  Installation
                </span>
              </NavLink>
            </li>

            <li key="/customize-widget" className="h-[60px] flex items-center">
              <NavLink
                to="/customize-widget"
                activeClassName="active"
                onClick={closeSidebar}
                className="w-full h-full flex items-center px-2 border-l-2 border-transparent 
          [&.active]:bg-regular-primary [&.active]:border-primary [&.active>.menu-text]:text-primary 
          [&.active>.menu-text]:font-medium [&.active>.menu-icon>.menu-icon]:text-primary transition-all duration-200"
              >
                <div className="menu-icon flex items-center justify-center w-12 h-6 ml-0">
                  <GoGear
                    className="menu-icon text-white-blue transition-colors duration-200"
                    size={30}
                  />
                </div>
                <span className="menu-text text-lg text-left text-white-blue ml-4 pr-2">
                  Customize Widget
                </span>
              </NavLink>
            </li>

            <li key="/add-domain" className="h-[60px] flex items-center">
              <NavLink
                to="/add-domain"
                activeClassName="active"
                onClick={closeSidebar}
                className="w-full h-full flex items-center px-2 border-l-2 border-transparent 
          [&.active]:bg-regular-primary [&.active]:border-primary [&.active>.menu-text]:text-primary 
          [&.active>.menu-text]:font-medium [&.active>.menu-icon>.menu-icon]:text-primary transition-all duration-200 [&.active>.menu-icon>svg_*[fill]]:fill-primary [&.active>.menu-icon>svg_*[stroke]]:stroke-primary"
              >
                <div className="menu-icon flex items-center justify-center w-12 h-6">
                  <UserIcon />
                </div>
                <span className="menu-text text-lg text-white-blue ml-4">
                  Add Domain
                </span>
              </NavLink>
            </li>

            {routes
              .filter((route) => route.isSidebar)
              .map((route) => (
                <li key={route.path} className="h-[60px] flex items-center">
                  <NavLink
                    to={route.path}
                    activeClassName="active"
                    onClick={closeSidebar}
                    className="w-full h-full flex items-center px-2 border-l-2 border-transparent 
              [&.active]:bg-regular-primary [&.active]:border-primary [&.active>.menu-text]:text-primary 
              [&.active>.menu-text]:font-medium [&.active>.menu-icon>.menu-icon]:text-primary transition-all duration-200"
                  >
                    <div className="menu-icon flex items-center justify-center w-12 h-6">
                      {route.icon}
                    </div>
                    <span className="menu-text text-center text-lg text-white-blue ml-4">
                      {route.name}
                    </span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
