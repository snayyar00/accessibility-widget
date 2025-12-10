import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Divider,
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

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0px 16px 48px rgba(15, 23, 42, 0.18)',
            border: '1px solid #E5E7EB',
          },
        }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Typography variant="h6" fontWeight={700}>
            Remove invitation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            This action cannot be undone.
          </Typography>
        </DialogTitle>

        <Divider sx={{ mt: 2, mb: 0 }} />

        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" color="text.primary">
            Are you sure you want to remove the invitation for{' '}
            <strong>{email}</strong>?
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E5E7EB',
          }}
        >
          <Button
            color="primary"
            variant="outlined"
            size="medium"
            onClick={handleClose}
            sx={{ textTransform: 'none', borderRadius: 2 }}
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
            sx={{ textTransform: 'none', borderRadius: 2, minWidth: 110 }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
