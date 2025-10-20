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
import REMOVE_ALL_USER_INVITATIONS from '@/queries/workspace/removeAllUserInvitations';
import { toast } from 'sonner';
import DeleteIcon from '@mui/icons-material/Delete';

type RemoveAllUserInvitationsProps = {
  email: string;
  onInvitationRemoved?: () => void;
  disabled?: boolean;
};

export const RemoveAllUserInvitations: React.FC<
  RemoveAllUserInvitationsProps
> = ({ email, onInvitationRemoved, disabled }) => {
  const [open, setOpen] = React.useState(false);

  const [removeAllUserInvitations, { loading }] = useMutation(
    REMOVE_ALL_USER_INVITATIONS,
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleRemove = async () => {
    try {
      const { errors, data } = await removeAllUserInvitations({
        variables: { email },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to remove invitations.'),
        );

        return;
      }

      if (!data || !data.removeAllUserInvitations) {
        toast.error('Failed to remove invitation.');
        return;
      }

      toast.success('Invitation removed successfully!');

      handleClose();
      onInvitationRemoved?.();
    } catch (error) {
      console.error('Error removing invitations:', error);
      toast.error('Failed to remove invitation.');
    }
  };

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
            Are you sure you want to remove the invitation for{' '}
            <strong>{email}</strong>? This action cannot be undone.
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
