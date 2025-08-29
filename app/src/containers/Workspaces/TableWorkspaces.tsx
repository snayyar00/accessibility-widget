import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Avatar, AvatarGroup, Tooltip, Chip, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Link } from 'react-router-dom';

import { useQuery } from '@apollo/client';
import GET_ORGANIZATION_WORKSPACES from '@/queries/workspace/getOrganizationWorkspaces';
import GET_ALL_USER_SITES from '@/queries/sites/getAllUserSites';
import { Query, WorkspaceUser, AllowedSite } from '@/generated/graphql';
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

  const { data: allUserSitesData, loading: allUserSitesLoading } =
    useQuery<Query>(GET_ALL_USER_SITES);

  const workspaces = data?.getOrganizationWorkspaces || [];

  const allUserSites = (allUserSitesData?.getAllUserSites || []).filter(
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
        domainsCount: workspace.domains?.length ?? 0,
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
      field: 'domainsCount',
      headerName: '',
      width: 40,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => <>({params.value})</>,
    },
    {
      field: 'domains',
      headerName: 'Domains',
      width: 250,
      minWidth: 250,
      flex: 1,
      renderCell: (params) => {
        const domains = (params.row.domains as AllowedSite[]) || [];

        if (domains.length === 0) {
          return (
            <div key={`domains-empty-${params.row.id}-${params.row.number}`}>
              <Chip
                label="No domains"
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
            key={`domains-container-${params.row.id}-${params.row.number}`}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            {domains.slice(0, 3).map((domain, index: number) => (
              <Chip
                key={
                  domain.id
                    ? `domain-${domain.id}`
                    : `domain-${params.row.id}-${index}`
                }
                label={domain.url}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.75rem',
                  height: '20px',
                  maxWidth: '110px',
                }}
              />
            ))}
            {domains.length > 3 && (
              <Chip
                key={`domains-more-${params.row.id}-${params.row.number}`}
                label={`+${domains.length - 3}`}
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
      field: 'membersCount',
      headerName: '',
      width: 40,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => <>({params.value})</>,
    },
    {
      field: 'members',
      headerName: 'Members',
      width: 150,
      renderCell: (params) => {
        const members = (params.value as WorkspaceUser[]) || [];

        return (
          <AvatarGroup
            sx={{
              '.MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' },
            }}
            max={6}
          >
            {members.map((member, memberIndex: number) => (
              <Tooltip
                key={`${params.row.id}-member-${member.id}-${memberIndex}`}
                title={`${member.user?.name || 'Unknown'} (${member.role})`}
              >
                <Avatar
                  src={member.user?.avatarUrl || undefined}
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
      width: 190,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <InviteWorkspaceMember
            disableSelect
            preSelectedWorkspace={params.row.id}
            onUserInvited={handleUpdate}
            buttonSize="medium"
            allWorkspaces={workspaces}
            workspacesLoading={loading}
          />

          <Link to={`/workspaces/${params.row.alias}`}>
            <IconButton size="medium" color="primary">
              <VisibilityIcon fontSize="inherit" />
            </IconButton>
          </Link>

          <EditWorkspace
            workspace={params.row}
            onWorkspaceUpdated={handleUpdate}
            userSites={allUserSites}
            userSitesLoading={allUserSitesLoading}
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
