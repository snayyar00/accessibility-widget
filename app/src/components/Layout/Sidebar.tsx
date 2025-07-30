import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { ReactComponent as DashboardIcon } from '@/assets/images/svg/dashboard.svg';
import { HiOutlineGlobeAlt } from 'react-icons/hi';
import type { RootState } from '@/config/store';
import { toggleSidebar } from '@/features/admin/sidebar';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import routes from '@/routes';
import Dropdown from '@/containers/Dashboard/DropDown';
import { GoGear } from 'react-icons/go';
import { GrInstallOption } from 'react-icons/gr';
import { useQuery } from '@apollo/client';
import { Query } from '@/generated/graphql';
import GET_USER_ORGANIZATIONS from '@/queries/organization/getUserOrganizations';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { useMutation } from '@apollo/client';
import CHANGE_CURRENT_ORGANIZATION from '@/queries/user/changeCurrentOrganization';
import { toast } from 'react-toastify';
import { useLazyQuery } from '@apollo/client';
import getProfileQuery from '@/queries/auth/getProfile';
import { IS_LOCAL } from '@/config/env';
import { setProfileUser } from '@/features/auth/user';
import { redirectToUserOrganization } from '@/helpers/redirectToOrganization';

const Sidebar = ({
  options,
  setReloadSites,
  selectedOption,
  setSelectedOption,
}: any) => {
  const dispatch = useDispatch();

  const { isOpen } = useSelector((state: RootState) => state.sidebar);

  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  const { data: userData } = useSelector((state: RootState) => state.user);
  const { data: organizationsData } = useQuery<Query>(GET_USER_ORGANIZATIONS);

  function closeSidebar() {
    dispatch(toggleSidebar(false));
  }

  const [changeCurrentOrganizationMutation] = useMutation(
    CHANGE_CURRENT_ORGANIZATION,
  );

  const [getProfile] = useLazyQuery(getProfileQuery);

  const handleChange = async (event: SelectChangeEvent) => {
    const newOrgId = Number(event.target.value);

    try {
      const { data } = await changeCurrentOrganizationMutation({
        variables: { organizationId: newOrgId },
      });

      if (!data) {
        toast.error('Failed to change organization. Please try again.');
        return;
      }

      if (!IS_LOCAL) {
        const targetOrganization = organizations.find(
          (org) => Number(org.id) === newOrgId,
        );

        if (targetOrganization?.domain) {
          const redirected = redirectToUserOrganization(
            targetOrganization.domain,
          );

          if (redirected) return;
        }
      }

      const profileResult = await getProfile();
      const profileUser = profileResult?.data?.profileUser;

      if (profileUser) {
        dispatch(
          setProfileUser({
            data: profileUser,
            loading: false,
          }),
        );

        toast.success('Organization changed successfully!');
      } else {
        toast.error('Failed to update user profile after organization change.');
      }
    } catch (error) {
      toast.error('Failed to change organization. Please try again.');
    }
  };

  const organizations = organizationsData?.getUserOrganizations || [];
  const currentOrganization = userData?.currentOrganization || null;

  const showOrganizationsSelect =
    !!organizations.length && currentOrganization && userData.isAdminOrOwner;

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
        className={`h-screen flex w-[250px] flex-col sm:fixed sm:bg-white sm:transition-all sm:duration-[400ms] ${
          isOpen ? 'sm:left-0 sm:z-[50]' : 'sm:-left-full sm:z-[50]'
        }`}
      >
        <a
          href="/"
          className="flex h-[81px] flex-none items-center px-4 border-b border-r border-solid border-gray"
        >
          {organization?.logo_url ? (
            <img
              width={198}
              height={47}
              src={organization.logo_url}
              alt={organization.name}
            />
          ) : (
            <LogoIcon />
          )}
        </a>

        <div className="flex-grow min-w-[250px] sm:w-[20%] md:w-[18%] lg:w-[15%] transition-all duration-300">
          <div className="px-3 py-5 space-y-3 max-w-full">
            {showOrganizationsSelect && (
              <FormControl fullWidth>
                <Select
                  size="small"
                  value={currentOrganization.id}
                  label={currentOrganization.domain}
                  onChange={handleChange}
                  className="[&>fieldset>legend>span]:hidden"
                >
                  {organizations.map(({ id, domain }) => (
                    <MenuItem key={id} value={id}>
                      {domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

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
                  <DashboardIcon aria-label="Dashboard navigation icon" />
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
                    aria-label="Installation guide icon"
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
                    aria-label="Customization settings icon"
                  />
                </div>
                <span className="menu-text text-lg text-left text-white-blue ml-4 pr-2">
                  Customization
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
                  <HiOutlineGlobeAlt
                    className="menu-icon text-white-blue transition-colors duration-200"
                    size={25}
                    aria-label="Add domain navigation icon"
                  />
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
