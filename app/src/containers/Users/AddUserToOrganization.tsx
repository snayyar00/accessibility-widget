import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useLazyQuery, useMutation } from '@apollo/client';
import ADD_USER_TO_ORGANIZATION from '@/queries/organization/addUserToOrganization';
import { toast } from 'react-toastify';
import { AddUserToOrganizationByEmailMutation } from '@/generated/graphql';

interface AddUserToOrganizationProps {
  organizationId: number;
  onUserAdded?: () => void;
}

export const AddUserToOrganization: React.FC<AddUserToOrganizationProps> = ({
  organizationId,
  onUserAdded,
}) => {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');

  const [addUserToOrganization, { loading: addLoading }] =
    useMutation<AddUserToOrganizationByEmailMutation>(ADD_USER_TO_ORGANIZATION);

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setEmail('');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSave = async () => {
    if (!email) return;

    try {
      const { errors, data } = await addUserToOrganization({
        variables: { organizationId, email },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to add user.'),
        );

        return;
      }

      const isSuccess = data?.addUserToOrganizationByEmail;

      if (isSuccess) {
        toast.success('User added to organization!');

        handleClose();
        onUserAdded?.();
      } else {
        toast.error('Failed to add user.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add user.');
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
        Add user to organization
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add user to organization</DialogTitle>

        <DialogContent>
          <TextField
            label="User email"
            fullWidth
            value={email}
            onChange={handleEmailChange}
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
            disabled={!email || addLoading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
