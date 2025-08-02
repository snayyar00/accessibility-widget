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
import REMOVE_USER_FROM_ORGANIZATION from '@/queries/organization/removeUserFromOrganization';
import { toast } from 'react-toastify';
import DeleteIcon from '@mui/icons-material/Delete';
import { RemoveUserFromOrganizationMutation } from '@/generated/graphql';

type DeleteUserFromOrganizationProps = {
  userId: number;
  organizationId: number;
  onUserDeleted?: () => void;
  disabled?: boolean;
};

export const DeleteUserFromOrganization: React.FC<
  DeleteUserFromOrganizationProps
> = ({ userId, organizationId, onUserDeleted, disabled }) => {
  const [open, setOpen] = React.useState(false);
  const [removeUser, { loading }] =
    useMutation<RemoveUserFromOrganizationMutation>(
      REMOVE_USER_FROM_ORGANIZATION,
    );

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleDelete = async () => {
    try {
      const { errors, data } = await removeUser({
        variables: { organizationId, userId: Number(userId) },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to remove user.'),
        );

        return;
      }

      if (!data || !data.removeUserFromOrganization) {
        toast.error('Failed to remove user.');
        return;
      }

      toast.success('User removed from organization!');

      handleClose();
      onUserDeleted?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove user.');
    }
  };

  return (
    <>
      <IconButton
        color="error"
        onClick={handleOpen}
        aria-label="delete"
        size="medium"
        disabled={disabled}
      >
        <DeleteIcon fontSize="inherit" />
      </IconButton>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Remove user from organization</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to remove this user from the organization?
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
            disabled={loading}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
