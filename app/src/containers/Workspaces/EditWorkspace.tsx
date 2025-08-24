import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
} from '@mui/material';
import { useMutation, useApolloClient } from '@apollo/client';
import UPDATE_WORKSPACE from '@/queries/workspace/updateWorkspace';
import { toast } from 'react-toastify';
import EditIcon from '@mui/icons-material/Edit';
import { UpdateWorkspaceMutation, Workspace } from '@/generated/graphql';

type EditWorkspaceProps = {
  workspace: Workspace;
  onWorkspaceUpdated?: () => void;
  disabled?: boolean;
};

export const EditWorkspace: React.FC<EditWorkspaceProps> = ({
  workspace,
  onWorkspaceUpdated,
  disabled,
}) => {
  const [open, setOpen] = React.useState(false);
  const [editedWorkspace, setEditedWorkspace] = React.useState(workspace);

  const [updateWorkspace, { loading }] =
    useMutation<UpdateWorkspaceMutation>(UPDATE_WORKSPACE);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedWorkspace({ ...editedWorkspace, name: e.target.value });
  };

  const handleUpdate = async () => {
    if (!editedWorkspace.name.trim()) {
      toast.error('Workspace name cannot be empty');
      return;
    }

    if (editedWorkspace.name.trim() === workspace.name) {
      handleClose();
      return;
    }

    try {
      const { errors, data } = await updateWorkspace({
        variables: {
          id: String(workspace.id),
          name: editedWorkspace.name.trim(),
        },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to update workspace.'),
        );

        return;
      }

      if (!data || !data.updateWorkspace) {
        toast.error('Failed to update workspace.');

        return;
      }

      toast.success(
        `Workspace "${editedWorkspace.name.trim()}" updated successfully!`,
      );

      handleClose();
      onWorkspaceUpdated?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update workspace.');
    }
  };

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
            value={editedWorkspace.name}
            onChange={handleNameChange}
            autoFocus
            margin="normal"
            disabled={loading}
          />
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
            disabled={loading || !editedWorkspace.name.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
