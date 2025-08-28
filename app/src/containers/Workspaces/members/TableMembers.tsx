import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Chip } from '@mui/material';
import { useApolloClient, useQuery } from '@apollo/client';
import GET_WORKSPACE_MEMBERS_BY_ALIAS from '@/queries/workspace/getWorkspaceMembersByAlias';

import {
  Query,
  WorkspaceUserStatus,
  WorkspaceUserRole,
} from '@/generated/graphql';
import { RoleSelector } from './RoleSelector';
import { RemoveWorkspaceMember } from './RemoveWorkspaceMember';

type TableMembersProps = {
  alias: string;
  onUpdate: () => void;
};

const STATUS_STYLES = {
  [WorkspaceUserStatus.Active]: { backgroundColor: '#22c55e', color: '#fff' },
  [WorkspaceUserStatus.Pending]: { backgroundColor: '#f59e0b', color: '#fff' },
  [WorkspaceUserStatus.Inactive]: { backgroundColor: '#ef4444', color: '#fff' },
  [WorkspaceUserStatus.Decline]: { backgroundColor: '#dc2626', color: '#fff' },
} as const;

export const TableMembers = ({ alias, onUpdate }: TableMembersProps) => {
  const client = useApolloClient();
  const [pageSize, setPageSize] = React.useState<number>(50);

  const { data, loading, error, refetch } = useQuery<Query>(
    GET_WORKSPACE_MEMBERS_BY_ALIAS,
    {
      variables: { alias },
      skip: !alias,
    },
  );

  const members = data?.getWorkspaceMembersByAlias || [];

  const rows = React.useMemo(
    () =>
      members.map((member, idx) => ({
        number: idx + 1,
        id: member.id,
        user_id: member.user_id,
        workspace_id: member.workspace_id,
        email: member.user?.email ?? '',
        name: member.user?.name ?? '',
        role: member.role ?? '',
        status: member.status ?? '',
        created_at: member.created_at ?? '',
        updated_at: member.updated_at ?? '',
        avatarUrl: member.user?.avatarUrl ?? '',
      })),
    [members],
  );

  const handleUpdate = () => {
    refetch();
    onUpdate();
  };

  const columns: GridColDef[] = [
    {
      field: 'number',
      headerName: '№',
      width: 60,
    },
    {
      field: 'user_id',
      headerName: 'User ID',
      width: 100,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 280,
      minWidth: 200,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 220,
      minWidth: 160,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value as WorkspaceUserStatus;
        const chipStyle = STATUS_STYLES[status] || {
          backgroundColor: '#6b7280',
          color: '#fff',
        };

        return (
          <Chip
            key={`status-${params.row.id}-${params.row.number}`}
            label={status}
            size="small"
            variant="filled"
            sx={{ textTransform: 'capitalize', ...chipStyle }}
          />
        );
      },
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 140,
      renderCell: (params) => {
        const currentRole = params.value as WorkspaceUserRole;

        return (
          <RoleSelector
            disabled={
              params.row.status === WorkspaceUserStatus.Inactive ||
              params.row.status === WorkspaceUserStatus.Decline
            }
            initialRole={currentRole}
            workspaceUserId={params.row.id}
            onRoleChanged={handleUpdate}
          />
        );
      },
    },

    {
      field: 'actions',
      headerName: '',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const userId = params.row.user_id;
        const memberName = params.row.name;
        const memberEmail = params.row.email;

        return (
          <RemoveWorkspaceMember
            workspaceUserId={params.row.id}
            memberName={memberName}
            memberEmail={memberEmail}
            onMemberRemoved={handleUpdate}
          />
        );
      },
    },
  ];

  return (
    <div className="h-[calc(100vh-367px)]">
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
  );
};
