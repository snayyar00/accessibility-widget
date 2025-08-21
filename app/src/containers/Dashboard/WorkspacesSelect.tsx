import React from 'react';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useLazyQuery, useQuery } from '@apollo/client';
import GET_USER_WORKSPACES from '@/queries/workspace/getUserWorkspaces';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { Query } from '@/generated/graphql';
// import { setProfileUser } from '@/features/auth/user';
import { toast } from 'react-toastify';

const WorkspacesSelect: React.FC = () => {
  //   const dispatch = useDispatch();
  const { data: userData } = useSelector((state: RootState) => state.user);

  const skipWorkspacesQuery = !userData || !userData.currentOrganization;

  const { data: workspacesData, loading: workspacesLoading } = useQuery<Query>(
    GET_USER_WORKSPACES,
    {
      variables: { organizationId: userData?.currentOrganization?.id },
      skip: skipWorkspacesQuery,
    },
  );

  const workspaces = workspacesData?.getUserWorkspaces || [];

  const handleChange = async (event: SelectChangeEvent) => {
    const newWorkspaceId = Number(event.target.value);
    // Здесь можно реализовать смену текущего workspace в redux или вызвать mutation
    // Например:
    // dispatch(setCurrentWorkspace(newWorkspaceId));
    toast.success('Workspace changed!');
  };

  if (!workspaces.length) return null;

  return (
    <FormControl fullWidth>
      <Select
        disabled={workspacesLoading}
        size="small"
        value="4"
        label={'123'}
        // value={userData.currentWorkspace?.id || ''}
        // label={userData.currentWorkspace?.name}
        onChange={handleChange}
        className="[&>fieldset>legend>span]:hidden"
      >
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
