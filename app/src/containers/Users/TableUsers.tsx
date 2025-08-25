import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Chip } from '@mui/material';
import { useQuery } from '@apollo/client';
import GET_ORGANIZATION_USERS from '@/queries/organization/getOrganizationUsers';
import { Query } from '@/generated/graphql';
import { ChangeOrganizationSelect } from './ChangeOrganizationSelect';
import { ChangeOrganizationUserRole } from './ChangeOrganizationUserRole';
import { DeleteUserFromOrganization } from './DeleteUserFromOrganization';
import { InviteWorkspaceMember } from '@/components/Invite/InviteWorkspaceMember';

type TableUsersProps = {
  organizationId: number;
  userId: number;
};

export const TableUsers = ({ organizationId, userId }: TableUsersProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);

  const { data, loading, error, refetch } = useQuery<Query>(
    GET_ORGANIZATION_USERS,
  );

  const users = data?.getOrganizationUsers || [];

  const rows = React.useMemo(
    () =>
      users.map((row, idx) => ({
        number: idx + 1,
        id: row.user?.id,
        name: row.user?.name ?? '',
        email: row.user?.email ?? '',
        isActive: row.user?.isActive ?? false,
        currentOrganization: row.currentOrganization?.name ?? '',
        currentOrganizationId: row.currentOrganization?.id ?? '',
        organizations: row.organizations ?? [],
        workspaces: row.workspaces ?? [],
        role: row?.role ?? '',
        status: row?.status ?? '',
        updated_at: row?.updated_at ?? '',
      })),
    [users],
  );

  const columns: GridColDef[] = [
    { field: 'number', headerName: '№', width: 60 },
    { field: 'id', headerName: 'User ID', width: 100 },
    {
      field: 'name',
      headerName: 'Name',
      width: 220,
      minWidth: 220,
      flex: 1,
      renderCell: (params) => {
        const rowUserId = params.row.id;
        let name = params.value;

        if (rowUserId === userId) {
          name += ' (you)';
        }

        return name;
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 280,
      minWidth: 280,
      flex: 1,
      renderCell: (params) => {
        const rowUserId = params.row.id;
        let email = params.value;

        if (rowUserId === userId) {
          email += ' (you)';
        }

        return email;
      },
    },
    {
      field: 'isActive',
      headerName: 'Account',
      width: 150,
      renderCell: (params) => (
        <Chip
          key={`account-status-${params.row.id}-${params.row.number}`}
          label={params.value ? 'Verified' : 'Unverified'}
          color={params.value ? 'success' : 'error'}
          size="small"
          variant="filled"
        />
      ),
    },
    {
      field: 'currentOrganization',
      headerName: 'Active Organization',
      width: 200,
      renderCell: (params) => {
        const organizations = params.row.organizations || [];
        const value = params.row.currentOrganizationId;
        const rowUserId = params.row.id || null;
        const NonActive = params.row?.status !== 'active';

        if (!value) {
          return (
            <Chip
              key={`no-access-${params.row.id}-${params.row.number}`}
              label="No access"
              color="warning"
              size="small"
              variant="filled"
            />
          );
        }

        return (
          <ChangeOrganizationSelect
            disabled={rowUserId === userId || NonActive}
            initialValue={value}
            organizations={organizations}
            userId={rowUserId}
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Org Status',
      width: 140,
      renderCell: (params) => {
        let chipStyle = {};
        let label = params.value;

        switch ((params.value || '').toLowerCase()) {
          case 'active':
            chipStyle = { backgroundColor: '#22c55e', color: '#fff' };
            break;
          case 'invited':
            chipStyle = { backgroundColor: '#3b82f6', color: '#fff' };
            break;
          case 'pending':
            chipStyle = { backgroundColor: '#f59e0b', color: '#fff' };
            break;
          case 'removed':
            chipStyle = { backgroundColor: '#ef4444', color: '#fff' };
            break;
          default:
            chipStyle = { backgroundColor: '#6b7280', color: '#fff' };
        }

        return (
          <Chip
            key={`org-status-${params.row.id}-${params.row.number}`}
            label={label}
            size="small"
            variant="filled"
            sx={{ textTransform: 'capitalize', ...chipStyle }}
          />
        );
      },
    },
    {
      field: 'role',
      headerName: 'Org Role',
      width: 140,
      renderCell: (params) => {
        const rowUserId = params.row.id;
        const isSelf = rowUserId === userId;

        return (
          <ChangeOrganizationUserRole
            disabled={isSelf}
            initialValue={params.value}
            userId={rowUserId}
            onRoleChanged={refetch}
          />
        );
      },
    },
    {
      field: 'workspaces',
      headerName: 'Workspaces',
      width: 250,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        const workspaces = params.row.workspaces || [];

        if (workspaces.length === 0) {
          return (
            <div key={`workspaces-empty-${params.row.id}-${params.row.number}`}>
              <Chip
                label="No workspaces"
                size="small"
                variant="filled"
                sx={{
                  fontSize: '0.75rem',
                  height: '20px',
                }}
              />
            </div>
          );
        }

        return (
          <div
            key={`workspaces-container-${params.row.id}-${params.row.number}`}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              justifyContent: 'flex-end',
            }}
          >
            {workspaces.slice(0, 3).map((workspace: any, index: number) => (
              <Chip
                key={
                  workspace.id
                    ? `workspace-${workspace.id}`
                    : `workspace-${params.row.id}-${index}`
                }
                label={workspace.name}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.75rem',
                  height: '20px',
                  maxWidth: '110px',
                }}
              />
            ))}
            {workspaces.length > 3 && (
              <Chip
                key={`workspaces-more-${params.row.id}-${params.row.number}`}
                label={`+${workspaces.length - 3}`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.75rem',
                  height: '20px',
                }}
              />
            )}
          </div>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 105,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const rowUserId = params.row.id;
        const rowOwner = params.row.role === 'owner';
        const userEmail = params.row.email;
        const userWorkspaces = params.row.workspaces || [];

        return (
          <div className="flex">
            {rowUserId !== userId && (
              <InviteWorkspaceMember
                userEmail={userEmail}
                userWorkspaces={userWorkspaces}
                onUserInvited={refetch}
                buttonText=""
                buttonSize="medium"
              />
            )}
            <DeleteUserFromOrganization
              disabled={rowUserId === userId || rowOwner}
              userId={rowUserId}
              organizationId={organizationId}
              onUserDeleted={refetch}
            />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="static mb-5 top-[15px] right-[17px] lg:absolute lg:mb-0">
        <InviteWorkspaceMember onUserInvited={refetch} />
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
