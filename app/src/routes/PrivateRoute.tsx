import React, { useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import { Route, RouteProps, useHistory } from 'react-router-dom';
import { RootState } from '@/config/store';

import GET_PROFILE from '@/queries/auth/getProfile';

import { setProfileUser } from '@/features/auth/user';
import { CircularProgress } from '@mui/material';
import { redirectToUserOrganization } from '@/helpers/redirectToOrganization';
import { IS_LOCAL } from '@/config/env';

type Props = {
  render: RouteProps['render'];
};

const PrivateRoute: React.FC<Props> = ({ render }) => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [getProfile, { data: userProfile, loading: loadingUserProfile }] =
    useLazyQuery(GET_PROFILE);
  const { data } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) {
      getProfile();
    }
  }, []);

  useEffect(() => {
    if (userProfile && userProfile.profileUser) {
      const domain = userProfile?.profileUser?.currentOrganization?.domain;

      if (domain && !IS_LOCAL) {
        const redirected = redirectToUserOrganization(domain);

        if (redirected) return;
      }

      if (userProfile?.profileUser?.invitationToken) {
        history.push(`/invitation/${userProfile.profileUser.invitationToken}`);

        return;
      }

      dispatch(
        setProfileUser({
          data: userProfile.profileUser,
          loading: loadingUserProfile,
        }),
      );
    }
  }, [userProfile]);

  return (
    <>
      {data && data.id && !loadingUserProfile && render && (
        <Route render={(props) => render(props)} />
      )}
      {(!data || !data.id || loadingUserProfile) && (
        <div className="flex items-center justify-center h-screen w-screen">
          <CircularProgress size={150} />
        </div>
      )}
    </>
  );
};

export default PrivateRoute;
