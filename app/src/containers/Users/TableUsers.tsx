import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Chip } from '@mui/material';
import { useLazyQuery } from '@apollo/client';
import GET_ORGANIZATION_USERS from '@/queries/organization/getOrganizationUsers';
import { Query } from '@/generated/graphql';
import { ChangeOrganizationSelect } from './ChangeOrganizationSelect';
import { AddUserToOrganization } from './AddUserToOrganization';
import { DeleteUserFromOrganization } from './DeleteUserFromOrganization';

type TableUsersProps = {
  organizationId: number;
  userId: number;
};

export const TableUsers = ({ organizationId, userId }: TableUsersProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);

  const [getUsers, { data, loading, error, refetch }] = useLazyQuery<Query>(
    GET_ORGANIZATION_USERS,
  );

  React.useEffect(() => {
    if (organizationId) {
      getUsers();
    }
  }, [organizationId]);

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
        role: row?.role ?? '',
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

        if (!value) {
          return (
            <Chip
              label="No access"
              color="warning"
              size="small"
              variant="filled"
            />
          );
        }

        return (
          <ChangeOrganizationSelect
            disabled={rowUserId === userId}
            initialValue={value}
            organizations={organizations}
            userId={rowUserId}
          />
        );
      },
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 100,
      renderCell: (params) => {
        let chipStyle = {};

        switch ((params.value || '').toLowerCase()) {
          case 'admin':
            chipStyle = { backgroundColor: '#f87171', color: '#fff' };
            break;
          case 'owner':
            chipStyle = { backgroundColor: '#4ade80', color: '#fff' };
            break;
          case 'member':
            chipStyle = { backgroundColor: '#2563eb', color: '#fff' };
            break;
          default:
            chipStyle = {};
        }

        return (
          <Chip
            label={params.value}
            size="small"
            variant="filled"
            sx={{ textTransform: 'capitalize', ...chipStyle }}
          />
        );
      },
    },
    {
      field: 'updated_at',
      headerName: 'Updated At',
      width: 200,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        if (!params.value) return '';

        const date = new Date(params.value);

        return date.toLocaleString();
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const rowUserId = params.row.id;
        const rowOwner = params.row.role === 'owner';

        return (
          <DeleteUserFromOrganization
            disabled={rowUserId === userId || rowOwner}
            userId={rowUserId}
            organizationId={organizationId}
            onUserDeleted={refetch}
          />
        );
      },
    },
  ];

  return (
    <>
      <div className="static mb-5 top-[15px] right-[17px] lg:absolute lg:mb-0">
        <AddUserToOrganization
          onUserAdded={refetch}
          organizationId={organizationId}
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
