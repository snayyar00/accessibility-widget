import { RootState } from '@/config/store';
import { TableWorkspaces } from '@/containers/Workspaces/TableWorkspaces';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import getProfileQuery from '@/queries/auth/getProfile';
import { useApolloClient, useLazyQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import { setProfileUser } from '@/features/auth/user';
import GET_USER_WORKSPACES from '@/queries/workspace/getUserWorkspaces';

const Workspaces: React.FC = () => {
  const dispatch = useDispatch();
  const { data: userData } = useSelector((state: RootState) => state.user);
  const client = useApolloClient();

  const [getProfile, { loading: profileLoading }] =
    useLazyQuery(getProfileQuery);

  if (!userData.isAdminOrOwner) {
    return <Redirect to="/" />;
  }

  const handleUpdate = async () => {
    try {
      await client.refetchQueries({
        include: [GET_USER_WORKSPACES],
      });

      const profileResult = await getProfile();
      const profileUser = profileResult?.data?.profileUser;

      if (profileUser) {
        dispatch(
          setProfileUser({
            data: profileUser,
            loading: profileLoading,
          }),
        );
      }
    } catch (error) {
      toast.error('Failed to update profile.');
    }
  };

  return (
    <section className="p-2 md:p-4 relative">
      <h1 className="text-3xl font-bold text-gray-900 md:text-4xl mb-8 hidden lg:block lg:pr-[300px]">
        Organization Workspaces
      </h1>

      {userData.current_organization_id && (
        <TableWorkspaces onUpdate={handleUpdate} />
      )}
    </section>
  );
};

export default Workspaces;
