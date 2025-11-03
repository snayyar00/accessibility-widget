import * as React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import {
  WorkspaceUserRole,
  ChangeWorkspaceMemberRoleMutation,
} from '@/generated/graphql';
import CHANGE_WORKSPACE_MEMBER_ROLE from '@/queries/workspace/changeWorkspaceMemberRole';

type RoleSelectorProps = {
  initialRole: WorkspaceUserRole;
  workspaceUserId: number;
  disabled?: boolean;
  availableRoles?: string[]; // Filtered roles based on user permissions
  onRoleChanged?: () => void;
};

const ALL_ROLE_OPTIONS = [
  { value: WorkspaceUserRole.Owner, label: 'Owner' },
  { value: WorkspaceUserRole.Admin, label: 'Admin' },
  { value: WorkspaceUserRole.Member, label: 'Member' },
] as const;

export const RoleSelector = ({
  initialRole,
  workspaceUserId,
  disabled = false,
  availableRoles,
  onRoleChanged,
}: RoleSelectorProps) => {
  const [currentRole, setCurrentRole] =
    React.useState<WorkspaceUserRole>(initialRole);

  React.useEffect(() => {
    setCurrentRole(initialRole);
  }, [initialRole]);

  // Filter role options based on available roles
  const roleOptions = React.useMemo(() => {
    if (!availableRoles || availableRoles.length === 0) {
      return ALL_ROLE_OPTIONS;
    }

    // Always include the current role, even if not in availableRoles
    // This ensures the current value is visible in the select
    const currentRoleOption = ALL_ROLE_OPTIONS.find(
      (option) => option.value === currentRole,
    );

    const filteredOptions = ALL_ROLE_OPTIONS.filter((option) =>
      availableRoles.includes(option.value),
    );

    // If current role is not in filtered options, add it
    if (
      currentRoleOption &&
      !filteredOptions.some((opt) => opt.value === currentRole)
    ) {
      return [currentRoleOption, ...filteredOptions];
    }

    return filteredOptions;
  }, [availableRoles, currentRole]);

  const [changeWorkspaceMemberRole, { loading: changingRole }] =
    useMutation<ChangeWorkspaceMemberRoleMutation>(
      CHANGE_WORKSPACE_MEMBER_ROLE,
    );

  const handleRoleChange = async (event: SelectChangeEvent) => {
    const newRole = event.target.value as WorkspaceUserRole;

    if (newRole === currentRole) {
      return;
    }

    if (!workspaceUserId) {
      toast.error('Workspace user ID is required');
      return;
    }

    try {
      const { errors, data } = await changeWorkspaceMemberRole({
        variables: {
          id: workspaceUserId,
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
      {roleOptions.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
};
