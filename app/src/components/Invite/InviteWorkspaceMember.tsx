import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useMutation, useQuery } from '@apollo/client';
import INVITE_WORKSPACE_MEMBER from '@/queries/workspace/inviteWorkspaceMember';
import GET_ORGANIZATION_WORKSPACES from '@/queries/workspace/getOrganizationWorkspaces';
import { toast } from 'react-toastify';
import { Query, WorkspaceUserRole } from '@/generated/graphql';

interface InviteWorkspaceMemberProps {
  onUserInvited?: () => void;
  userEmail?: string;
  userWorkspaces?: Array<{ id: number; name: string; alias?: string }>;
  buttonText?: string;
  buttonSize?: 'small' | 'medium' | 'large';
}

export const InviteWorkspaceMember: React.FC<InviteWorkspaceMemberProps> = ({
  onUserInvited,
  userEmail = '',
  userWorkspaces = [],
  buttonText = 'Invite User',
  buttonSize = 'large',
}) => {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState(userEmail);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState('');
  const [role, setRole] = React.useState<WorkspaceUserRole>(
    WorkspaceUserRole.Member,
  );

  const { data: workspacesData, loading: workspacesLoading } = useQuery<Query>(
    GET_ORGANIZATION_WORKSPACES,
  );

  const [inviteWorkspaceMember, { loading: inviteLoading }] = useMutation(
    INVITE_WORKSPACE_MEMBER,
  );

  const allWorkspaces = workspacesData?.getOrganizationWorkspaces || [];

  const isUserInWorkspace = (workspace: any, userWorkspaces: any[]) => {
    return userWorkspaces.some((userWorkspace) => {
      const sameId = userWorkspace.id === Number(workspace.id);
      const sameName = userWorkspace.name === workspace.name;
      const sameAlias =
        userWorkspace.alias &&
        workspace.alias &&
        userWorkspace.alias === workspace.alias;

      return sameId || sameName || sameAlias;
    });
  };

  const availableWorkspaces = allWorkspaces.filter(
    (workspace) => !isUserInWorkspace(workspace, userWorkspaces),
  );

  const handleOpen = () => {
    setEmail(userEmail);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setSelectedWorkspace('');
    setRole(WorkspaceUserRole.Member);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleWorkspaceChange = (e: SelectChangeEvent) => {
    setSelectedWorkspace(e.target.value);
  };

  const handleRoleChange = (e: SelectChangeEvent) => {
    setRole(e.target.value as WorkspaceUserRole);
  };

  const handleSave = async () => {
    if (!email || !selectedWorkspace) return;

    const selectedWorkspaceData = availableWorkspaces.find(
      (ws) => ws.id.toString() === selectedWorkspace,
    );
    if (!selectedWorkspaceData) {
      toast.error('Selected workspace not found');
      return;
    }

    try {
      const { errors, data } = await inviteWorkspaceMember({
        variables: {
          email,
          alias: selectedWorkspaceData.alias,
          role,
        },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to invite user.'),
        );
        return;
      }

      const result = data?.inviteWorkspaceMember;

      if (result) {
        toast.success('User invite successfully sent!');
        handleClose();
        onUserInvited?.();
      } else {
        toast.error('Failed to invite user.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to invite user.');
    }
  };

  if (!availableWorkspaces?.length) return null;

  return (
    <>
      {buttonText ? (
        <Button
          size={buttonSize}
          variant="contained"
          color="primary"
          onClick={handleOpen}
        >
          {buttonText}
        </Button>
      ) : (
        <IconButton size={buttonSize} color="primary" onClick={handleOpen}>
          <AddIcon />
        </IconButton>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Invite User</DialogTitle>

        <DialogContent>
          <TextField
            label="User email"
            fullWidth
            value={email}
            onChange={handleEmailChange}
            autoFocus
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Workspace</InputLabel>
            <Select
              value={selectedWorkspace}
              onChange={handleWorkspaceChange}
              label="Workspace"
              disabled={workspacesLoading}
            >
              {availableWorkspaces.map((workspace) => (
                <MenuItem key={workspace.id} value={workspace.id.toString()}>
                  {workspace.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Workspace Role</InputLabel>
            <Select
              value={role}
              onChange={handleRoleChange}
              label="Workspace Role"
            >
              <MenuItem value={WorkspaceUserRole.Member}>Member</MenuItem>
              <MenuItem value={WorkspaceUserRole.Admin}>Admin</MenuItem>
              <MenuItem value={WorkspaceUserRole.Owner}>Owner</MenuItem>
            </Select>
          </FormControl>
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
            disabled={
              !email || !selectedWorkspace || inviteLoading || workspacesLoading
            }
          >
            Invite
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
