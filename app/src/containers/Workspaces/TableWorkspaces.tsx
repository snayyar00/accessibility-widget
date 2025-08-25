import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Avatar, AvatarGroup, Tooltip } from '@mui/material';

import { useLazyQuery, useQuery } from '@apollo/client';
import GET_ORGANIZATION_WORKSPACES from '@/queries/workspace/getOrganizationWorkspaces';
import { Query } from '@/generated/graphql';
import { CreateWorkspace } from './CreateWorkspace';
import { EditWorkspace } from './EditWorkspace';
import { DeleteWorkspace } from './DeleteWorkspace';

type TableWorkspacesProps = {
  onUpdate: () => void;
};

export const TableWorkspaces = ({ onUpdate }: TableWorkspacesProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);

  const { data, loading, error, refetch } = useQuery<Query>(
    GET_ORGANIZATION_WORKSPACES,
  );

  const workspaces = data?.getOrganizationWorkspaces || [];

  const rows = React.useMemo(
    () =>
      workspaces.map((workspace, idx) => ({
        number: idx + 1,
        id: workspace.id,
        name: workspace.name ?? '',
        membersCount: workspace.members?.length ?? 0,
        members: workspace.members ?? [],
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
      field: 'name',
      headerName: 'Workspace Name',
      width: 220,
      minWidth: 220,
      flex: 1,
    },
    {
      field: 'membersCount',
      headerName: 'Count',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'members',
      headerName: 'Members',
      width: 250,
      renderCell: (params) => {
        const members = params.value || [];

        return (
          <AvatarGroup max={4}>
            {members.map((member: any, memberIndex: number) => (
              <Tooltip
                key={`${params.row.id}-member-${member.id}-${memberIndex}`}
                title={`${member.user?.name || 'Unknown'} (${member.role})`}
              >
                <Avatar
                  sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
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
      width: 120,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <EditWorkspace
            workspace={params.row}
            onWorkspaceUpdated={handleUpdate}
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
