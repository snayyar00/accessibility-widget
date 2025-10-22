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
import { useMutation } from '@apollo/client';
import INVITE_USER from '@/queries/invitations/inviteUser';
import { toast } from 'react-toastify';
import {
  Workspace,
  WorkspaceUserRole,
  OrganizationUserRole,
} from '@/generated/graphql';

type InviteMode = 'organization' | 'workspace';

interface InviteUserProps {
  mode: InviteMode;
  onUserInvited?: () => void;
  userEmail?: string;
  userWorkspaces?: Workspace[];
  buttonSize?: 'medium' | 'large';
  allWorkspaces?: Workspace[];
  workspacesLoading?: boolean;
  preSelectedWorkspace?: string;
  disableSelect?: boolean;
  buttonText?: string;
  isSuperAdmin?: boolean;
  isAdminOrOwnerOrSuper?: boolean;
  userWorkspaceRole?: string | null;
}

export const InviteUser: React.FC<InviteUserProps> = ({
  mode,
  onUserInvited,
  userEmail = '',
  userWorkspaces = [],
  buttonSize = 'large',
  allWorkspaces = [],
  workspacesLoading = false,
  preSelectedWorkspace,
  disableSelect = false,
  buttonText,
  isSuperAdmin = false,
  isAdminOrOwnerOrSuper,
  userWorkspaceRole,
}) => {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState(userEmail);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState('');
  const [role, setRole] = React.useState<
    WorkspaceUserRole | OrganizationUserRole
  >(
    mode === 'workspace'
      ? WorkspaceUserRole.Member
      : OrganizationUserRole.Member,
  );

  const [inviteUser, { loading: inviteLoading }] = useMutation(INVITE_USER);

  const isUserInWorkspace = (workspace: any, userWorkspaces: any[]) => {
    return userWorkspaces.some((userWorkspace) => {
      return userWorkspace.alias === workspace.alias;
    });
  };

  const availableWorkspaces = allWorkspaces.filter(
    (workspace) => !isUserInWorkspace(workspace, userWorkspaces),
  );

  const handleOpen = () => {
    setEmail(userEmail);
    if (preSelectedWorkspace) {
      setSelectedWorkspace(preSelectedWorkspace);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setSelectedWorkspace('');
    setRole(
      mode === 'workspace'
        ? WorkspaceUserRole.Member
        : OrganizationUserRole.Member,
    );
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleWorkspaceChange = (e: SelectChangeEvent) => {
    setSelectedWorkspace(e.target.value);
  };

  const handleRoleChange = (e: SelectChangeEvent) => {
    setRole(e.target.value as WorkspaceUserRole | OrganizationUserRole);
  };

  const handleSave = async () => {
    if (!email) return;
    if (mode === 'workspace' && !selectedWorkspace) return;

    let selectedWorkspaceData: Workspace | undefined;

    if (mode === 'workspace') {
      selectedWorkspaceData = availableWorkspaces.find(
        (ws) => ws.id.toString() === selectedWorkspace,
      );
      if (!selectedWorkspaceData) {
        toast.error('Selected workspace not found');
        return;
      }
    }

    try {
      const { errors, data } = await inviteUser({
        variables: {
          type: mode,
          email,
          role,
          workspaceId:
            mode === 'workspace' ? selectedWorkspaceData?.id : undefined,
        },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to invite user.'),
        );
        return;
      }

      const result = data?.inviteUser;

      if (result) {
        toast.success(
          `User invite to ${
            mode === 'workspace' ? 'workspace' : 'organization'
          } successfully sent!`,
        );
        handleClose();
        onUserInvited?.();
      } else {
        toast.error('Failed to invite user.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to invite user.');
    }
  };

  const getDialogTitle = () => {
    return mode === 'workspace'
      ? 'Invite User to Workspace'
      : 'Invite User to Organization';
  };

  const getRoleLabel = () => {
    return mode === 'workspace' ? 'Workspace Role' : 'Organization Role';
  };

  const getButtonText = () => {
    if (buttonText) return buttonText;
    return mode === 'workspace'
      ? 'Invite to Workspace'
      : 'Invite to Organization';
  };

  const createRoleMenuItem = (
    role: WorkspaceUserRole | OrganizationUserRole,
  ) => (
    <MenuItem key={role} value={role}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </MenuItem>
  );

  const getWorkspaceRoles = () => {
    const allRoles = [
      WorkspaceUserRole.Member,
      WorkspaceUserRole.Admin,
      WorkspaceUserRole.Owner,
    ];

    const memberOnlyRoles = [WorkspaceUserRole.Member];

    if (isAdminOrOwnerOrSuper) {
      return allRoles.map(createRoleMenuItem);
    }

    if (
      userWorkspaceRole === WorkspaceUserRole.Owner ||
      userWorkspaceRole === WorkspaceUserRole.Admin
    ) {
      return allRoles.map(createRoleMenuItem);
    }

    if (userWorkspaceRole === WorkspaceUserRole.Member) {
      return memberOnlyRoles.map(createRoleMenuItem);
    }

    if (
      isAdminOrOwnerOrSuper === undefined &&
      userWorkspaceRole === undefined
    ) {
      return allRoles.map(createRoleMenuItem);
    }

    return memberOnlyRoles.map(createRoleMenuItem);
  };

  const getOrganizationRoles = () => {
    const baseRoles = [OrganizationUserRole.Member, OrganizationUserRole.Admin];

    const allRoles = [
      OrganizationUserRole.Member,
      OrganizationUserRole.Admin,
      OrganizationUserRole.Owner,
    ];

    if (isSuperAdmin) {
      return allRoles.map(createRoleMenuItem);
    }

    return baseRoles.map(createRoleMenuItem);
  };

  if (
    mode === 'workspace' &&
    !availableWorkspaces?.length &&
    !workspacesLoading
  ) {
    return null;
  }

  return (
    <>
      {buttonSize === 'large' ? (
        <Button
          size={buttonSize}
          variant="contained"
          color="primary"
          onClick={handleOpen}
          disableElevation
        >
          {getButtonText()}
        </Button>
      ) : (
        <IconButton size={buttonSize} color="primary" onClick={handleOpen}>
          <AddIcon />
        </IconButton>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{getDialogTitle()}</DialogTitle>

        <DialogContent>
          <TextField
            label="User email"
            fullWidth
            value={email}
            onChange={handleEmailChange}
            autoFocus
            margin="normal"
          />

          {mode === 'workspace' && (
            <FormControl fullWidth margin="normal">
              <InputLabel id="workspace-select-label">Workspace</InputLabel>
              <Select
                labelId="workspace-select-label"
                id="workspace-select"
                value={selectedWorkspace}
                onChange={handleWorkspaceChange}
                label="Workspace"
                disabled={workspacesLoading || disableSelect}
              >
                {availableWorkspaces.map((workspace) => (
                  <MenuItem key={workspace.id} value={workspace.id.toString()}>
                    {workspace.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth margin="normal">
            <InputLabel id="role-select-label">{getRoleLabel()}</InputLabel>
            <Select
              labelId="role-select-label"
              id="role-select"
              value={role}
              onChange={handleRoleChange}
              label={getRoleLabel()}
            >
              {mode === 'workspace'
                ? getWorkspaceRoles()
                : getOrganizationRoles()}
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
            disableElevation
            disabled={
              !email ||
              (mode === 'workspace' && !selectedWorkspace) ||
              inviteLoading ||
              (mode === 'workspace' && workspacesLoading)
            }
          >
            Invite
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
