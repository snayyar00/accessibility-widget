import React from 'react';
import { useMutation, useApolloClient } from '@apollo/client';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

import AdminLayout from '@/components/Layout/Admin';
import { logout as logoutUser } from '@/features/auth/user';
import logoutQuery from '@/queries/auth/logout';
import { clearAuthenticationCookie } from '@/utils/cookie';
import GET_ORGANIZATION from '@/queries/organization/getOrganization';
import { setOrganization } from '@/features/organization/organizationSlice';

type props = {
  options: string[];
};
const AdminLayoutContainer: React.FC<props> = ({ options }) => {
  const [logout] = useMutation(logoutQuery);
  const dispatch = useDispatch();
  const history = useHistory();
  const apolloClient = useApolloClient();

  async function signout() {
    dispatch(logoutUser());
    clearAuthenticationCookie();

    await logout();

    try {
      const result = await apolloClient.query({
        query: GET_ORGANIZATION,
        fetchPolicy: 'network-only',
      });

      if (result.data?.getOrganizationByDomain) {
        dispatch(setOrganization(result.data.getOrganizationByDomain));
      }
    } catch (error) {
      console.error('Failed to refetch organization after logout:', error);
    }

    history.push('/auth/signin');
  }

  return <AdminLayout signout={signout} options={options} />;
};

export default AdminLayoutContainer;
