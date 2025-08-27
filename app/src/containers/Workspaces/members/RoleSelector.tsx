import * as React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import { toast } from 'react-toastify';
import {
  WorkspaceUserRole,
  ChangeWorkspaceMemberRoleMutation,
} from '@/generated/graphql';
import CHANGE_WORKSPACE_MEMBER_ROLE from '@/queries/workspace/changeWorkspaceMemberRole';

type RoleSelectorProps = {
  initialRole: WorkspaceUserRole;
  userId: number;
  alias: string;
  disabled?: boolean;
  onRoleChanged?: () => void;
};

const ROLE_OPTIONS = [
  { value: WorkspaceUserRole.Owner, label: 'Owner' },
  { value: WorkspaceUserRole.Admin, label: 'Admin' },
  { value: WorkspaceUserRole.Member, label: 'Member' },
] as const;

export const RoleSelector = ({
  initialRole,
  userId,
  alias,
  disabled = false,
  onRoleChanged,
}: RoleSelectorProps) => {
  const [currentRole, setCurrentRole] =
    React.useState<WorkspaceUserRole>(initialRole);

  React.useEffect(() => {
    setCurrentRole(initialRole);
  }, [initialRole]);

  const [changeWorkspaceMemberRole, { loading: changingRole }] =
    useMutation<ChangeWorkspaceMemberRoleMutation>(
      CHANGE_WORKSPACE_MEMBER_ROLE,
    );

  const handleRoleChange = async (event: SelectChangeEvent) => {
    const newRole = event.target.value as WorkspaceUserRole;

    if (newRole === currentRole) {
      return;
    }

    if (!alias) {
      toast.error('Workspace alias is required');
      return;
    }

    try {
      const { errors, data } = await changeWorkspaceMemberRole({
        variables: {
          alias,
          userId: userId.toString(),
          role: newRole,
        },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to change member role.'),
        );
        return;
      }

      if (data?.changeWorkspaceMemberRole === true) {
        toast.success('Member role updated successfully!');
        setCurrentRole(newRole);
        onRoleChanged?.();
      } else {
        toast.error('Failed to change member role.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to change member role.');
    }
  };

  return (
    <Select
      size="small"
      fullWidth
      value={currentRole}
      onChange={handleRoleChange}
      disabled={disabled || changingRole}
      sx={{
        fontSize: '0.875rem',
        height: '36px',
      }}
    >
      {ROLE_OPTIONS.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
};
