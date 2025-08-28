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
import REMOVE_WORKSPACE_MEMBER from '@/queries/workspace/removeWorkspaceMember';
import { toast } from 'react-toastify';
import DeleteIcon from '@mui/icons-material/Delete';
import { RemoveWorkspaceMemberMutation } from '@/generated/graphql';

type RemoveWorkspaceMemberProps = {
  workspaceUserId: number;
  memberName?: string;
  memberEmail?: string;
  onMemberRemoved?: () => void;
  disabled?: boolean;
};

export const RemoveWorkspaceMember: React.FC<RemoveWorkspaceMemberProps> = ({
  workspaceUserId,
  memberName,
  memberEmail,
  onMemberRemoved,
  disabled,
}) => {
  const [open, setOpen] = React.useState(false);

  const [removeWorkspaceMember, { loading }] =
    useMutation<RemoveWorkspaceMemberMutation>(REMOVE_WORKSPACE_MEMBER);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleRemove = async () => {
    try {
      const { errors, data } = await removeWorkspaceMember({
        variables: { id: workspaceUserId },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to remove member.'),
        );

        return;
      }

      if (!data || !data.removeWorkspaceMember) {
        toast.error('Failed to remove member.');
        return;
      }

      toast.success(
        `Member "${memberName || memberEmail || 'User'}" removed successfully!`,
      );

      handleClose();
      onMemberRemoved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove member.');
    }
  };

  const displayName = memberName || memberEmail || 'this member';

  return (
    <>
      <IconButton
        color="error"
        onClick={handleOpen}
        aria-label="remove member"
        size="medium"
        disabled={disabled}
      >
        <DeleteIcon fontSize="inherit" />
      </IconButton>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Remove member</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to remove &quot;
            {displayName}&quot; from this workspace? This action cannot be
            undone.
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
