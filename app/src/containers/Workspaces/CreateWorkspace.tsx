import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import CREATE_WORKSPACE from '@/queries/workspace/createWorkspace';
import { toast } from 'react-toastify';
import { CreateWorkspaceMutation } from '@/generated/graphql';

interface CreateWorkspaceProps {
  onWorkspaceCreated?: () => void;
}

export const CreateWorkspace: React.FC<CreateWorkspaceProps> = ({
  onWorkspaceCreated,
}) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');

  const [createWorkspace, { loading: createLoading }] =
    useMutation<CreateWorkspaceMutation>(CREATE_WORKSPACE);

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setName('');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      const { errors, data } = await createWorkspace({
        variables: { name: name.trim() },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to create workspace.'),
        );

        return;
      }

      const workspace = data?.createWorkspace;

      if (workspace) {
        toast.success(`Workspace "${workspace.name}" created successfully!`);

        handleClose();
        onWorkspaceCreated?.();
      } else {
        toast.error('Failed to create workspace.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create workspace.');
    }
  };

  return (
    <>
      <Button
        size="large"
        variant="contained"
        color="primary"
        onClick={handleOpen}
      >
        Create Workspace
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create Workspace</DialogTitle>

        <DialogContent>
          <TextField
            label="Workspace name"
            fullWidth
            value={name}
            onChange={handleNameChange}
            autoFocus
            margin="normal"
          />
        </DialogContent>

        <DialogActions>
          <Button
            color="primary"
            variant="outlined"
            size="large"
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            size="large"
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={!name.trim() || createLoading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
