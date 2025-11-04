import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import REMOVE_WORKSPACE_DOMAINS from '@/queries/workspace/removeWorkspaceDomains';
import { toast } from 'react-toastify';
import DeleteIcon from '@mui/icons-material/Delete';

type RemoveWorkspaceDomainsProps = {
  workspaceId: number;
  selectedDomainIds: number[];
  currentDomainIds: number[];
  onDomainsRemoved?: () => void;
  onCancel: () => void;
};

export const RemoveWorkspaceDomains: React.FC<RemoveWorkspaceDomainsProps> = ({
  workspaceId,
  selectedDomainIds,
  currentDomainIds,
  onDomainsRemoved,
  onCancel,
}) => {
  const [open, setOpen] = React.useState(true);

  const [removeWorkspaceDomains, { loading }] = useMutation(
    REMOVE_WORKSPACE_DOMAINS,
  );

  const handleClose = () => {
    setOpen(false);
    onCancel();
  };

  const handleRemove = async () => {
    try {
      const { errors, data } = await removeWorkspaceDomains({
        variables: {
          workspaceId: workspaceId.toString(),
          siteIds: selectedDomainIds.map((id) => id.toString()),
        },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to remove domains.'),
        );
        return;
      }

      if (!data || !data.removeWorkspaceDomains) {
        toast.error('Failed to remove domains.');
        return;
      }

      toast.success(
        `${selectedDomainIds.length} ${
          selectedDomainIds.length === 1 ? 'domain' : 'domains'
        } removed successfully!`,
      );

      handleClose();
      onDomainsRemoved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove domains.');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Remove Domains</DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography>
            Are you sure you want to remove{' '}
            <strong>
              {selectedDomainIds.length}{' '}
              {selectedDomainIds.length === 1 ? 'domain' : 'domains'}
            </strong>{' '}
            from this workspace?
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          color="primary"
          variant="outlined"
          size="medium"
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          color="error"
          variant="contained"
          size="medium"
          onClick={handleRemove}
          disabled={loading}
          disableElevation
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
};
