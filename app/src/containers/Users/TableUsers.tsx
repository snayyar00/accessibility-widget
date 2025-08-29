import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import GET_ORGANIZATION_USERS from '@/queries/organization/getOrganizationUsers';
import GET_ORGANIZATION_WORKSPACES from '@/queries/workspace/getOrganizationWorkspaces';
import {
  Query,
  OrganizationUserStatus,
  OrganizationUserRole,
} from '@/generated/graphql';
import { ChangeOrganizationSelect } from './ChangeOrganizationSelect';
import { ChangeOrganizationUserRole } from './ChangeOrganizationUserRole';
import { DeleteUserFromOrganization } from './DeleteUserFromOrganization';
import { InviteWorkspaceMember } from '@/components/Invite/InviteWorkspaceMember';
import { RemoveAllUserInvitations } from '@/components/Invite/RemoveAllUserInvitations';

type TableUsersProps = {
  organizationId: number;
  userId: number;
};

const STATUS_STYLES = {
  [OrganizationUserStatus.Active]: {
    backgroundColor: '#22c55e',
    color: '#fff',
  },
  [OrganizationUserStatus.Invited]: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  [OrganizationUserStatus.Pending]: {
    backgroundColor: '#f59e0b',
    color: '#fff',
  },
  [OrganizationUserStatus.Removed]: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
} as const;

export const TableUsers = ({ organizationId, userId }: TableUsersProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);

  const { data, loading, error, refetch } = useQuery<Query>(
    GET_ORGANIZATION_USERS,
  );

  const { data: workspacesData, loading: workspacesLoading } = useQuery<Query>(
    GET_ORGANIZATION_WORKSPACES,
  );

  const users = data?.getOrganizationUsers || [];
  const allWorkspaces = workspacesData?.getOrganizationWorkspaces || [];

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
        invitationId: row?.invitationId ?? null,
      })),
    [users],
  );

  const columns: GridColDef[] = [
    { field: 'number', headerName: '№', width: 60 },
    {
      field: 'id',
      headerName: 'User ID',
      width: 100,
      renderCell: (params) => {
        const isInvited = params.row.status === OrganizationUserStatus.Invited;

        if (isInvited) {
          return <span>—</span>;
        }

        return params.value;
      },
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 220,
      minWidth: 160,
      flex: 1,
      renderCell: (params) => {
        const rowUserId = params.row.id;
        const isInvited = params.row.status === OrganizationUserStatus.Invited;

        let name = params.value;

        if (isInvited) {
          return <span>—</span>;
        }

        if (rowUserId === userId) {
          name += ' (you)';
        }

        return <span className="truncate">{name}</span>;
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 280,
      minWidth: 200,
      flex: 1,
      renderCell: (params) => {
        const rowUserId = params.row.id;
        let email = params.value;

        if (rowUserId === userId) {
          email += ' (you)';
        }

        return <span className="truncate">{email}</span>;
      },
    },
    {
      field: 'isActive',
      headerName: 'Account',
      width: 150,
      renderCell: (params) => {
        const isInvited = params.row.status === OrganizationUserStatus.Invited;

        if (isInvited) {
          return <span>—</span>;
        }

        return (
          <Chip
            key={`account-status-${params.row.id}-${params.row.number}`}
            label={params.value ? 'Verified' : 'Unverified'}
            color={params.value ? 'success' : 'error'}
            size="small"
            variant="filled"
          />
        );
      },
    },
    {
      field: 'workspaces',
      headerName: 'Workspaces',
      width: 250,
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
            }}
          >
            {workspaces.slice(0, 3).map((workspace: any, index: number) => (
              <Link
                key={
                  workspace.id
                    ? `workspace-link-${workspace.id}`
                    : `workspace-link-${params.row.id}-${index}`
                }
                to={`/workspaces/${workspace.alias}`}
                style={{ textDecoration: 'none' }}
              >
                <Chip
                  label={workspace.name}
                  size="small"
                  variant="outlined"
                  clickable
                  sx={{
                    fontSize: '0.75rem',
                    height: '20px',
                    maxWidth: '110px',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    },
                  }}
                />
              </Link>
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
      field: 'currentOrganization',
      headerName: 'Active Organization',
      width: 200,
      renderCell: (params) => {
        const organizations = params.row.organizations || [];
        const value = params.row.currentOrganizationId;
        const rowUserId = params.row.id || null;
        const NonActive = params.row?.status !== OrganizationUserStatus.Active;
        const isInvited = params.row.status === OrganizationUserStatus.Invited;

        if (isInvited) {
          return <span>—</span>;
        }

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
        const status = params.value as OrganizationUserStatus;
        const chipStyle = STATUS_STYLES[status] || {
          backgroundColor: '#6b7280',
          color: '#fff',
        };

        return (
          <Chip
            key={`org-status-${params.row.id}-${params.row.number}`}
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
      headerName: 'Org Role',
      width: 140,
      renderCell: (params) => {
        const rowUserId = params.row.id;
        const isSelf = rowUserId === userId;
        const isInvited = params.row.status === OrganizationUserStatus.Invited;

        if (isInvited) {
          return <span>—</span>;
        }

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
        const rowOwner = params.row.role === OrganizationUserRole.Owner;
        const userEmail = params.row.email;
        const userWorkspaces = params.row.workspaces || [];
        const isInvited = params.row.status === OrganizationUserStatus.Invited;

        return (
          <div className="flex">
            {rowUserId !== userId && (
              <InviteWorkspaceMember
                userEmail={userEmail}
                userWorkspaces={userWorkspaces}
                onUserInvited={refetch}
                buttonSize="medium"
                allWorkspaces={allWorkspaces}
                workspacesLoading={workspacesLoading}
              />
            )}
            {isInvited ? (
              <RemoveAllUserInvitations
                email={userEmail}
                onInvitationRemoved={refetch}
              />
            ) : (
              <DeleteUserFromOrganization
                disabled={rowUserId === userId || rowOwner}
                userId={rowUserId}
                organizationId={organizationId}
                onUserDeleted={refetch}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="static mb-5 top-[15px] right-[17px] lg:absolute lg:mb-0">
        <InviteWorkspaceMember
          onUserInvited={refetch}
          allWorkspaces={allWorkspaces}
          workspacesLoading={workspacesLoading}
        />
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
