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
import REMOVE_WORKSPACE_INVITATION from '@/queries/workspace/removeWorkspaceInvitation';
import { toast } from 'react-toastify';
import DeleteIcon from '@mui/icons-material/Delete';

type RemoveWorkspaceInvitationProps = {
  invitationId: number;
  inviteeEmail?: string;
  onInvitationRemoved?: () => void;
  disabled?: boolean;
};

export const RemoveWorkspaceInvitation: React.FC<
  RemoveWorkspaceInvitationProps
> = ({ invitationId, inviteeEmail, onInvitationRemoved, disabled }) => {
  const [open, setOpen] = React.useState(false);

  const [removeWorkspaceInvitation, { loading }] = useMutation(
    REMOVE_WORKSPACE_INVITATION,
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleRemove = async () => {
    try {
      const { errors, data } = await removeWorkspaceInvitation({
        variables: { id: invitationId },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to remove invitation.'),
        );

        return;
      }

      if (!data || !data.removeWorkspaceInvitation) {
        toast.error('Failed to remove invitation.');
        return;
      }

      toast.success(
        `Invitation for "${inviteeEmail || 'User'}" removed successfully!`,
      );

      handleClose();
      onInvitationRemoved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove invitation.');
    }
  };

  const displayEmail = inviteeEmail || 'this invitation';

  return (
    <>
      <IconButton
        color="error"
        onClick={handleOpen}
        aria-label="remove invitation"
        size="medium"
        disabled={disabled}
      >
        <DeleteIcon fontSize="inherit" />
      </IconButton>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Remove invitation</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to remove the invitation? This action cannot
            be undone.
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
            onClick={handleRemove}
            color="error"
            variant="contained"
            disableElevation
            disabled={loading}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
