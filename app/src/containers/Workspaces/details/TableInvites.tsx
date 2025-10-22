import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Chip } from '@mui/material';
import { useQuery } from '@apollo/client';
import GET_WORKSPACE_INVITATIONS_BY_ALIAS from '@/queries/workspace/getWorkspaceInvitationsByAlias';
import { InvitationStatus, Query } from '@/generated/graphql';
import { RemoveWorkspaceInvitation } from './RemoveWorkspaceInvitation';
import { canDeleteWorkspaceMember } from '@/helpers/permissions';

type TableInvitesProps = {
  alias: string;
  onUpdate: () => void;
  hasAccess?: boolean;
  isAdminOrOwnerOrSuper?: boolean;
  userWorkspaceRole?: string | null;
  currentUserId?: number;
};

const STATUS_STYLES = {
  [InvitationStatus.Pending]: {
    backgroundColor: '#f59e0b',
    color: '#fff',
  },
  [InvitationStatus.Accepted]: {
    backgroundColor: '#22c55e',
    color: '#fff',
  },
  [InvitationStatus.Declined]: {
    backgroundColor: '#dc2626',
    color: '#fff',
  },
  [InvitationStatus.Expired]: {
    backgroundColor: '#6b7280',
    color: '#fff',
  },
} as const;

export const TableInvites = ({
  alias,
  onUpdate,
  hasAccess = true,
  isAdminOrOwnerOrSuper = false,
  userWorkspaceRole = null,
  currentUserId,
}: TableInvitesProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);

  const { data, loading, error, refetch } = useQuery<Query>(
    GET_WORKSPACE_INVITATIONS_BY_ALIAS,
    {
      variables: { alias },
      skip: !alias,
    },
  );

  const invitations = data?.getWorkspaceInvitationsByAlias || [];

  const rows = React.useMemo(
    () =>
      invitations.map((invitation, idx) => ({
        id: invitation.id || `fallback-${idx}`,
        invitationId: invitation.id,
        number: idx + 1,
        email: invitation.email,
        invited_by: invitation.invited_by,
        invited_by_id: invitation.invited_by_id,
        role: invitation.role,
        status: invitation.status,
        created_at: invitation.created_at
          ? new Date(invitation.created_at).toLocaleDateString()
          : '',
        workspace_id: invitation.workspace_id,
      })),
    [invitations],
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
      field: 'email',
      headerName: 'Invited Email',
      width: 280,
      minWidth: 200,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
    {
      field: 'invited_by',
      headerName: 'Invited By',
      width: 280,
      minWidth: 200,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value as InvitationStatus;
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
      field: 'created_at',
      headerName: 'Created Date',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => <span className="truncate">{params.value}</span>,
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
        const { invitationId } = params.row;
        const inviteeEmail = params.row.email;
        const invitedById = params.row.invited_by_id;
        const targetInvitationRole = params.row.role;

        if (!invitationId || !hasAccess) {
          return null;
        }

        // Only Org Admin can delete Owner invitation
        if (targetInvitationRole === 'owner' && !isAdminOrOwnerOrSuper) {
          return null;
        }

        // Check if user can delete using helper function
        const canDelete = canDeleteWorkspaceMember(
          isAdminOrOwnerOrSuper,
          userWorkspaceRole,
          invitedById,
          currentUserId,
          targetInvitationRole,
        );

        if (!canDelete) {
          return null;
        }

        return (
          <RemoveWorkspaceInvitation
            invitationId={invitationId}
            inviteeEmail={inviteeEmail}
            onInvitationRemoved={handleUpdate}
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
