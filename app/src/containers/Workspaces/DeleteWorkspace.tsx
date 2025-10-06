import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import DELETE_WORKSPACE from '@/queries/workspace/deleteWorkspace';
import { toast } from 'sonner';
import DeleteIcon from '@mui/icons-material/Delete';
import { DeleteWorkspaceMutation, Workspace } from '@/generated/graphql';

type DeleteWorkspaceProps = {
  workspace: Workspace;
  onWorkspaceDeleted?: () => void;
  disabled?: boolean;
};

export const DeleteWorkspace: React.FC<DeleteWorkspaceProps> = ({
  workspace,
  onWorkspaceDeleted,
  disabled,
}) => {
  const [open, setOpen] = React.useState(false);

  const [deleteWorkspace, { loading }] =
    useMutation<DeleteWorkspaceMutation>(DELETE_WORKSPACE);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleDelete = async () => {
    try {
      const { errors, data } = await deleteWorkspace({
        variables: { id: Number(workspace.id) },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to delete workspace.'),
        );

        return;
      }

      if (!data || !data.deleteWorkspace) {
        toast.error('Failed to delete workspace.');
        return;
      }

      toast.success(
        `Workspace "${workspace.name || 'Workspace'}" deleted successfully!`,
      );

      handleClose();
      onWorkspaceDeleted?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete workspace.');
    }
  };

  return (
    <>
      <IconButton
        color="error"
        onClick={handleOpen}
        aria-label="delete workspace"
        size="medium"
        disabled={disabled}
      >
        <DeleteIcon fontSize="inherit" />
      </IconButton>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Delete workspace</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to delete workspace{' '}
            <strong>{workspace.name || 'this workspace'}</strong> ? This action
            cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            color="primary"
            variant="outlined"
            size="medium"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            size="medium"
            onClick={handleDelete}
            color="error"
            variant="contained"
            disableElevation
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
