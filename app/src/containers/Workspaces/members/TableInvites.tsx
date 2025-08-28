import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Chip, IconButton } from '@mui/material';
import { useApolloClient, useQuery } from '@apollo/client';
import GET_WORKSPACE_INVITATIONS_BY_ALIAS from '@/queries/workspace/getWorkspaceInvitationsByAlias';
import { Query, WorkspaceInvitationStatus } from '@/generated/graphql';
import { RemoveWorkspaceInvitation } from './RemoveWorkspaceInvitation';

type TableInvitesProps = {
  alias: string;
  onUpdate: () => void;
};

const STATUS_STYLES = {
  [WorkspaceInvitationStatus.Pending]: {
    backgroundColor: '#f59e0b',
    color: '#fff',
  },
  [WorkspaceInvitationStatus.Accepted]: {
    backgroundColor: '#22c55e',
    color: '#fff',
  },
  [WorkspaceInvitationStatus.Declined]: {
    backgroundColor: '#dc2626',
    color: '#fff',
  },
  [WorkspaceInvitationStatus.Expired]: {
    backgroundColor: '#6b7280',
    color: '#fff',
  },
} as const;

export const TableInvites = ({ alias, onUpdate }: TableInvitesProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);
  const client = useApolloClient();

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
        const status = params.value as WorkspaceInvitationStatus;
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
        const invitationId = params.row.invitationId;
        const inviteeEmail = params.row.email;

        if (!invitationId) {
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
