import React from 'react';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import GET_USER_WORKSPACES from '@/queries/workspace/getUserWorkspaces';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { ChangeCurrentWorkspaceMutation, Query } from '@/generated/graphql';
import { setProfileUser } from '@/features/auth/user';
import { toast } from 'react-toastify';
import CHANGE_CURRENT_WORKSPACE from '@/queries/user/changeCurrentWorkspace';
import getProfileQuery from '@/queries/auth/getProfile';

const WorkspacesSelect: React.FC = () => {
  const dispatch = useDispatch();
  const { data: userData } = useSelector((state: RootState) => state.user);

  const skipWorkspacesQuery = !userData || !userData.currentOrganization;

  const { data: workspacesData, loading: workspacesLoading } = useQuery<Query>(
    GET_USER_WORKSPACES,
    {
      skip: skipWorkspacesQuery,
    },
  );

  const [changeCurrentWorkspaceMutation, { loading: changeWorkspaceLoading }] =
    useMutation<ChangeCurrentWorkspaceMutation>(CHANGE_CURRENT_WORKSPACE);

  const [getProfile, { loading: profileLoading }] =
    useLazyQuery(getProfileQuery);

  const workspaces = workspacesData?.getUserWorkspaces || [];

  const handleChange = async (event: SelectChangeEvent) => {
    const { value } = event.target;
    const newWorkspaceId = value === 'none' ? null : Number(value);

    try {
      const { data } = await changeCurrentWorkspaceMutation({
        variables: { workspaceId: newWorkspaceId },
      });

      if (!data || !data.changeCurrentWorkspace) {
        toast.error('Failed to change workspace. Please try again.');
        return;
      }

      const profileResult = await getProfile();
      const profileUser = profileResult?.data?.profileUser;

      if (profileUser) {
        dispatch(
          setProfileUser({
            data: profileUser,
            loading: profileLoading,
          }),
        );

        toast.success('Workspace changed successfully!');
      } else {
        toast.error('Failed to update user profile after workspace change.');
      }
    } catch (error) {
      toast.error('Failed to change workspace. Please try again.');
    }
  };

  if (!workspaces.length) return null;

  const empty = {
    value: 'none',
    label: 'My Workspace',
  };

  return (
    <FormControl fullWidth>
      <Select
        disabled={workspacesLoading || changeWorkspaceLoading || profileLoading}
        size="small"
        value={
          userData?.currentOrganizationUser?.currentWorkspace?.id || empty.value
        }
        label={
          userData?.currentOrganizationUser?.currentWorkspace?.name ||
          empty.label
        }
        onChange={handleChange}
        className="[&>fieldset>legend>span]:hidden"
      >
        <MenuItem value={empty.value}>{empty.label}</MenuItem>
        {workspaces.map(({ id, name }) => (
          <MenuItem key={id} value={id}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default WorkspacesSelect;
