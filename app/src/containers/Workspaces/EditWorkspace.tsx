import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Box,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import UPDATE_WORKSPACE from '@/queries/workspace/updateWorkspace';
import { toast } from 'react-toastify';
import EditIcon from '@mui/icons-material/Edit';
import { UpdateWorkspaceMutation, Workspace, Site } from '@/generated/graphql';
import WorkspaceDomainsSelect from './WorkspaceDomainsSelect';

type EditWorkspaceProps = {
  workspace: Workspace;
  onWorkspaceUpdated?: () => void;
  disabled?: boolean;
  userSites: Site[];
  userSitesLoading: boolean;
};

const arraysEqual = (a: string[], b: string[]): boolean => {
  return a.length === b.length && a.every((val, i) => val === b[i]);
};

const getDomainIds = (workspace: Workspace): string[] => {
  return workspace.domains?.map((domain) => String(domain.id)) || [];
};

export const EditWorkspace: React.FC<EditWorkspaceProps> = ({
  workspace,
  onWorkspaceUpdated,
  disabled,
  userSites,
  userSitesLoading,
}) => {
  const [open, setOpen] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState(workspace.name);
  const [selectedDomainIds, setSelectedDomainIds] = React.useState<string[]>(
    [],
  );

  const [updateWorkspace, { loading }] =
    useMutation<UpdateWorkspaceMutation>(UPDATE_WORKSPACE);

  // Combine user sites with workspace domains to ensure all domains are available
  // This solves the issue where domains added by other users are not visible
  // in the select dropdown for the current user
  const allAvailableSites = React.useMemo(() => {
    const siteMap = new Map<string, Site>();

    // Add user's sites
    userSites.forEach((site) => {
      siteMap.set(String(site.id), site);
    });

    // Add workspace domains that might not be in user's sites
    workspace.domains?.forEach((domain) => {
      if (!siteMap.has(String(domain.id))) {
        siteMap.set(String(domain.id), {
          __typename: 'Site',
          id: Number(domain.id),
          url: domain.url,
          createAt: null,
          expiredAt: null,
          trial: null,
          updatedAt: null,
          user_id: null,
        } as Site);
      }
    });

    return Array.from(siteMap.values());
  }, [userSites, workspace.domains]);

  // Initialize form state when workspace changes
  React.useEffect(() => {
    setWorkspaceName(workspace.name);
    setSelectedDomainIds(getDomainIds(workspace));
  }, [workspace]);

  const resetForm = React.useCallback(() => {
    setWorkspaceName(workspace.name);
    setSelectedDomainIds(getDomainIds(workspace));
  }, [workspace]);

  const handleOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkspaceName(e.target.value);
  };

  const validateAndGetChanges = () => {
    const trimmedName = workspaceName.trim();

    if (!trimmedName) {
      toast.error('Workspace name cannot be empty');
      return null;
    }

    const hasNameChanged = trimmedName !== workspace.name;
    const currentDomainIds = getDomainIds(workspace).sort();
    const hasDomainsChanged = !arraysEqual(
      selectedDomainIds.sort(),
      currentDomainIds,
    );

    if (!hasNameChanged && !hasDomainsChanged) {
      return { hasChanges: false, updateMessage: [] };
    }

    const variables: Record<string, any> = { id: String(workspace.id) };
    const updateMessage: string[] = [];

    if (hasNameChanged) {
      variables.name = trimmedName;
      updateMessage.push('name');
    }

    if (hasDomainsChanged) {
      variables.allowedSiteIds = selectedDomainIds;
      updateMessage.push('domains');
    }

    return { hasChanges: true, variables, updateMessage };
  };

  const handleUpdate = async () => {
    const validation = validateAndGetChanges();

    if (!validation) return;

    if (!validation.hasChanges) {
      handleClose();
      return;
    }

    try {
      const { errors, data } = await updateWorkspace({
        variables: validation.variables,
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to update workspace.'),
        );
        return;
      }

      if (!data?.updateWorkspace) {
        toast.error('Failed to update workspace.');
        return;
      }

      toast.success(
        `Workspace ${validation.updateMessage.join(
          ' and ',
        )} updated successfully!`,
      );

      handleClose();
      onWorkspaceUpdated?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update workspace.');
    }
  };

  const isUpdateDisabled = loading || !workspaceName.trim();

  return (
    <>
      <IconButton
        color="primary"
        onClick={handleOpen}
        aria-label="edit workspace"
        size="medium"
        disabled={disabled}
      >
        <EditIcon fontSize="inherit" />
      </IconButton>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Workspace</DialogTitle>
        <DialogContent>
          <TextField
            label="Workspace Name"
            fullWidth
            value={workspaceName}
            onChange={handleNameChange}
            autoFocus
            margin="normal"
            disabled={loading}
          />

          <Box sx={{ mt: 2 }}>
            <WorkspaceDomainsSelect
              workspaceId={String(workspace.id)}
              value={selectedDomainIds}
              onChange={setSelectedDomainIds}
              disabled={loading}
              userSites={allAvailableSites}
              loading={userSitesLoading}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            color="primary"
            variant="outlined"
            size="large"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            size="large"
            onClick={handleUpdate}
            variant="contained"
            color="primary"
            disabled={isUpdateDisabled}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
