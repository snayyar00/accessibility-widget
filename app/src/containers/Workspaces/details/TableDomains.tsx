import * as React from 'react';
import {
  DataGrid,
  GridColDef,
  GridSelectionModel,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import { Button, Typography } from '@mui/material';
import { useQuery } from '@apollo/client';
import GET_WORKSPACE_BY_ALIAS from '@/queries/workspace/getWorkspaceByAlias';
import { Query } from '@/generated/graphql';
import { RemoveWorkspaceDomains } from './RemoveWorkspaceDomains';
import { AddWorkspaceDomains } from './AddWorkspaceDomains';

type TableDomainsProps = {
  alias: string;
  onUpdate?: () => void;
  hasAccess?: boolean;
  isAdminOrOwnerOrSuper?: boolean;
  userWorkspaceRole?: string | null;
  currentUserId?: number;
};

type CustomToolbarProps = {
  domainsCount: number;
  selectedCount: number;
  onAddClick: () => void;
  onRemoveClick: () => void;
  hasAccess?: boolean;
};

const CustomToolbar: React.FC<CustomToolbarProps> = ({
  domainsCount,
  selectedCount,
  onAddClick,
  onRemoveClick,
  hasAccess = true,
}) => {
  return (
    <GridToolbarContainer
      sx={{
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'transparent',
        minHeight: '64px',
      }}
    >
      {selectedCount > 0 ? (
        <>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {selectedCount} {selectedCount === 1 ? 'domain' : 'domains'}{' '}
            selected
          </Typography>

          {hasAccess && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={onRemoveClick}
              disableElevation
            >
              Remove Selected
            </Button>
          )}
        </>
      ) : (
        <>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {domainsCount} {domainsCount === 1 ? 'domain' : 'domains'} in
            workspace
          </Typography>
          {hasAccess && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={onAddClick}
              disableElevation
            >
              Add Domains
            </Button>
          )}
        </>
      )}
    </GridToolbarContainer>
  );
};

export const TableDomains = ({
  alias,
  onUpdate,
  hasAccess = true,
  isAdminOrOwnerOrSuper = false,
  userWorkspaceRole = null,
  currentUserId,
}: TableDomainsProps) => {
  const [pageSize, setPageSize] = React.useState<number>(50);
  const [selectionModel, setSelectionModel] =
    React.useState<GridSelectionModel>([]);
  const [showRemoveDialog, setShowRemoveDialog] = React.useState(false);
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  const { data, loading, error, refetch } = useQuery<Query>(
    GET_WORKSPACE_BY_ALIAS,
    {
      variables: { alias },
      skip: !alias,
    },
  );

  const workspace = data?.getWorkspaceByAlias;
  const domains = workspace?.domains || [];

  const rows = React.useMemo(
    () =>
      domains.map((domain, idx) => ({
        id: domain.id || `fallback-${idx}`,
        number: idx + 1,
        url: domain.url,
        domainId: domain.id,
        addedByEmail: domain.added_by_user_email || '—',
        siteOwnerEmail: domain.site_owner_user_email || '—',
        siteOwnerId: domain.site_owner_user_id,
      })),
    [domains],
  );

  const handleUpdate = () => {
    refetch();
    onUpdate?.();
    setSelectionModel([]);
  };

  const handleRemoveClick = () => {
    setShowRemoveDialog(true);
  };

  const handleCancelRemove = () => {
    setShowRemoveDialog(false);
  };

  const handleAddClick = () => {
    setShowAddDialog(true);
  };

  const handleCancelAdd = () => {
    setShowAddDialog(false);
  };

  const columns: GridColDef[] = [
    {
      field: 'number',
      headerName: '№',
      width: 60,
    },
    {
      field: 'domainId',
      headerName: 'Site ID',
      width: 100,
    },
    {
      field: 'url',
      headerName: 'Domain URL',
      width: 280,
      minWidth: 200,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
    {
      field: 'siteOwnerEmail',
      headerName: 'Domain Owner',
      width: 280,
      minWidth: 200,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
    {
      field: 'addedByEmail',
      headerName: 'Added By',
      width: 280,
      minWidth: 200,
      flex: 1,
      renderCell: (params) => <span className="truncate">{params.value}</span>,
    },
  ];

  const selectedDomainIds = selectionModel.map((id) => Number(id));
  const currentDomainIds = domains.map((d) => Number(d.id));

  const isRowSelectable = React.useCallback(
    (params: any) => {
      if (isAdminOrOwnerOrSuper) return true;
      if (userWorkspaceRole === 'owner' || userWorkspaceRole === 'admin')
        return true;

      const siteOwnerId = params.row.siteOwnerId;

      return siteOwnerId === currentUserId;
    },
    [isAdminOrOwnerOrSuper, userWorkspaceRole, currentUserId],
  );

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
        checkboxSelection
        isRowSelectable={isRowSelectable}
        selectionModel={selectionModel}
        onSelectionModelChange={(newSelection) => {
          setSelectionModel(newSelection);
        }}
        components={{
          Toolbar: CustomToolbar,
        }}
        componentsProps={{
          toolbar: {
            domainsCount: domains.length,
            selectedCount: selectionModel.length,
            onAddClick: handleAddClick,
            onRemoveClick: handleRemoveClick,
            hasAccess,
          },
        }}
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

      {showRemoveDialog && workspace?.id && (
        <RemoveWorkspaceDomains
          workspaceId={Number(workspace.id)}
          selectedDomainIds={selectedDomainIds}
          currentDomainIds={currentDomainIds}
          onDomainsRemoved={handleUpdate}
          onCancel={handleCancelRemove}
        />
      )}

      {showAddDialog && workspace?.id && (
        <AddWorkspaceDomains
          workspaceId={Number(workspace.id)}
          currentDomainIds={currentDomainIds}
          onDomainsAdded={handleUpdate}
          onCancel={handleCancelAdd}
        />
      )}
    </div>
  );
};
