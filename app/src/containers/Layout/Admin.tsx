import React from 'react';
import { useMutation } from '@apollo/client';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

import AdminLayout from '@/components/Layout/Admin';
import { logout as logoutUser } from '@/features/auth/user';
import logoutQuery from '@/queries/auth/logout';
import { clearAuthenticationCookie } from '@/utils/cookie';

type props = {
  options: string[];
};
const AdminLayoutContainer: React.FC<props> = ({ options }) => {
  const [logout] = useMutation(logoutQuery);
  const dispatch = useDispatch();
  const history = useHistory();

  async function signout() {
    dispatch(logoutUser());
    clearAuthenticationCookie();

    await logout();

    history.push('/auth/signin');
  }

  return <AdminLayout signout={signout} options={options} />;
};

export default AdminLayoutContainer;
