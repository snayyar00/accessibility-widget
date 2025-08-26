import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Avatar, AvatarGroup, Tooltip } from '@mui/material';

import { useLazyQuery, useQuery } from '@apollo/client';
import GET_ORGANIZATION_WORKSPACES from '@/queries/workspace/getOrganizationWorkspaces';
import GET_USER_SITES from '@/queries/sites/getSites';
import { Query } from '@/generated/graphql';
import { CreateWorkspace } from './CreateWorkspace';
import { EditWorkspace } from './EditWorkspace';
import { DeleteWorkspace } from './DeleteWorkspace';
import { InviteWorkspaceMember } from '@/components/Invite/InviteWorkspaceMember';

type TableWorkspacesProps = {
  onUpdate: () => void;
};

export const TableWorkspaces = ({ onUpdate }: TableWorkspacesProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);

  const { data, loading, error, refetch } = useQuery<Query>(
    GET_ORGANIZATION_WORKSPACES,
  );

  const { data: userSitesData, loading: userSitesLoading } =
    useQuery<Query>(GET_USER_SITES);

  const workspaces = data?.getOrganizationWorkspaces || [];
  const userSites = (userSitesData?.getUserSites || []).filter(
    (site): site is NonNullable<typeof site> => site !== null,
  );

  const rows = React.useMemo(
    () =>
      workspaces.map((workspace, idx) => ({
        number: idx + 1,
        id: workspace.id,
        name: workspace.name ?? '',
        alias: workspace.alias ?? '',
        membersCount: workspace.members?.length ?? 0,
        members: workspace.members ?? [],
        domains: workspace.domains ?? [],
      })),
    [workspaces],
  );

  const columns: GridColDef[] = [
    {
      field: 'number',
      headerName: '№',
      width: 60,
    },
    {
      field: 'id',
      headerName: 'ID',
      width: 60,
    },
    {
      field: 'alias',
      headerName: 'Alias',
      width: 150,
      minWidth: 120,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
    {
      field: 'name',
      headerName: 'Workspace Name',
      width: 220,
      minWidth: 220,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
    {
      field: 'membersCount',
      headerName: '',
      width: 40,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => <>({params.value})</>,
    },
    {
      field: 'members',
      headerName: 'Members',
      width: 150,
      renderCell: (params) => {
        const members = params.value || [];

        return (
          <AvatarGroup
            sx={{
              '.MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' },
            }}
            max={6}
          >
            {members.map((member: any, memberIndex: number) => (
              <Tooltip
                key={`${params.row.id}-member-${member.id}-${memberIndex}`}
                title={`${member.user?.name || 'Unknown'} (${member.role})`}
              >
                <Avatar
                  src={member.user?.avatarUrl}
                  alt={member.user?.name || 'User'}
                >
                  {(member.user?.name || 'U').charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <InviteWorkspaceMember
            preSelectedWorkspace={params.row.id}
            onUserInvited={handleUpdate}
            buttonSize="medium"
            allWorkspaces={workspaces}
            workspacesLoading={loading}
          />
          <EditWorkspace
            workspace={params.row}
            onWorkspaceUpdated={handleUpdate}
            userSites={userSites}
            userSitesLoading={userSitesLoading}
          />
          <DeleteWorkspace
            workspace={params.row}
            onWorkspaceDeleted={handleUpdate}
          />
        </div>
      ),
    },
  ];

  const handleUpdate = () => {
    refetch();
    onUpdate();
  };

  return (
    <>
      <div className="static mb-5 top-[15px] right-[17px] lg:absolute lg:mb-0">
        <CreateWorkspace onWorkspaceCreated={handleUpdate} />
      </div>

      <div className="h-[calc(100vh-310px)]">
        <DataGrid
          style={{ background: 'white' }}
          error={error}
          loading={loading}
          pageSize={pageSize}
          onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
          rowsPerPageOptions={[25, 50, 100]}
          rows={rows}
          columns={columns}
          disableSelectionOnClick
          sx={{
            '.MuiDataGrid-columnHeader:focus, .MuiDataGrid-cell:focus': {
              outline: 'none !important',
            },
            '.MuiDataGrid-columnHeader:focus-within, .MuiDataGrid-cell:focus-within':
              {
                outline: 'none !important',
              },
          }}
        />
      </div>
    </>
  );
};
