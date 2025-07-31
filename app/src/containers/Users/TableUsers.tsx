import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Chip, Select, MenuItem } from '@mui/material';
import { useLazyQuery } from '@apollo/client';
import GET_ORGANIZATION_USERS from '@/queries/organization/getOrganizationUsers';
import { Organization, Query } from '@/generated/graphql';

type TableUsersProps = {
  organizationId: number;
};

export const TableUsers = ({ organizationId }: TableUsersProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);

  const [getUsers, { data, loading, error }] = useLazyQuery<Query>(
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
    { field: 'name', headerName: 'Name', width: 220, minWidth: 220, flex: 1 },
    { field: 'email', headerName: 'Email', width: 280, minWidth: 280, flex: 1 },
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
        const orgs = params.row.organizations || [];
        const value = params.row.currentOrganizationId;

        return (
          <Select
            value={value}
            size="small"
            sx={{ minWidth: 120 }}
            onChange={(e) => {
              // TODO
            }}
          >
            {orgs.map((org: Organization) => (
              <MenuItem key={org.id} value={org.id}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
        );
      },
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 100,
      renderCell: (params) => {
        let chipColor = 'default';
        let chipStyle = {};

        switch ((params.value || '').toLowerCase()) {
          case 'admin':
            chipColor = 'error';
            chipStyle = { backgroundColor: '#f87171', color: '#fff' };
            break;
          case 'owner':
            chipColor = 'success';
            chipStyle = { backgroundColor: '#4ade80', color: '#fff' };
            break;
          case 'member':
            chipColor = 'primary';
            chipStyle = { backgroundColor: '#2563eb', color: '#fff' };
            break;
          default:
            chipColor = 'default';
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
  ];

  return (
    <div className="bg-white h-[calc(100vh-310px)]">
      <DataGrid
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
