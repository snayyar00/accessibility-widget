import React, { useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import { Route, RouteProps, useHistory } from 'react-router-dom';
import { RootState } from '@/config/store';

// Queries
import getProfileQuery from '@/queries/auth/getProfile';

// Actions
import { setProfileUser } from '@/features/auth/user';
import { CircularProgress } from '@mui/material';
import { redirectToOrganization } from '@/helpers/redirectToOrganization';

type Props = {
  render: RouteProps['render'];
}

const PrivateRoute: React.FC<Props> = ({ render }) => {
  const history = useHistory();
  const dispatch = useDispatch();
  const [getProfile, { data: userProfile, loading: loadingUserProfile }] = useLazyQuery(
    getProfileQuery,
  );
  const { data } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) {
      getProfile();
    }
  }, []);

  useEffect(() => {
    if (userProfile && userProfile.profileUser) {
      if (userProfile?.profileUser?.invitationToken) {
        history.push(`/teams/invitation/${userProfile.profileUser.invitationToken}`);
      } else {
        const org = userProfile.profileUser.currentOrganization;

        if (org) {
          const baseDomain = process.env.REACT_APP_DOMAIN || window.location.origin;

          const redirected = redirectToOrganization(
            org,
            baseDomain,
            window.location.pathname,
            window.location.search
          );

          if (redirected) return;
        } else {
          const baseDomain = process.env.REACT_APP_DOMAIN || window.location.origin;
          
          const redirected = redirectToOrganization(
            null,
            baseDomain,
            window.location.pathname,
            window.location.search
          );

          if (redirected) return;
        }
        
        dispatch(setProfileUser({ data: userProfile.profileUser, loading: loadingUserProfile }));
      }
    }
  }, [userProfile]);

  return (
    <>
      {data && data.id && !loadingUserProfile && render && (
        <Route
          render={props => render(props)}
        />
      )}
      {(!data || !data.id || loadingUserProfile) && (
        <div className='flex items-center justify-center h-screen w-screen'><CircularProgress size={150}/></div>
      )}
    </>
  );
};

export default PrivateRoute;
