import * as React from 'react';
import { Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useMutation } from '@apollo/client';
import { toast } from 'react-toastify';
import CHANGE_ORGANIZATION_USER_ROLE from '@/queries/organization/changeOrganizationUserRole';
import { OrganizationUserRole } from '@/generated/graphql';

type ChangeOrganizationUserRoleProps = {
  initialValue: string;
  userId: number;
  disabled: boolean;
  onRoleChanged: () => void;
};

const ROLE_OPTIONS = [
  { value: OrganizationUserRole.Owner, label: 'Owner' },
  { value: OrganizationUserRole.Admin, label: 'Admin' },
  { value: OrganizationUserRole.Member, label: 'Member' },
] as const;

export const ChangeOrganizationUserRole: React.FC<
  ChangeOrganizationUserRoleProps
> = ({ initialValue, userId, disabled, onRoleChanged }) => {
  const [selected, setSelected] = React.useState<string>(initialValue);

  const [changeOrganizationUserRoleMutation, { loading }] = useMutation(
    CHANGE_ORGANIZATION_USER_ROLE,
  );

  React.useEffect(() => {
    setSelected(initialValue);
  }, [initialValue]);

  const handleChange = async (e: SelectChangeEvent<string>) => {
    const newRole = e.target.value;

    try {
      const { data, errors } = await changeOrganizationUserRoleMutation({
        variables: {
          userId: Number(userId),
          role: newRole,
        },
      });

      if (!data || !data.changeOrganizationUserRole) {
        const errorMsg =
          (errors && errors[0]?.message) ||
          'Failed to change user role. Please try again.';
        toast.error(errorMsg);
        return;
      }

      setSelected(newRole);
      onRoleChanged();

      toast.success('User role changed successfully!');

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('organizationUserRoleChanged', {
            detail: { userId, newRole },
          }),
        );
      }
    } catch (error) {
      console.error('Error changing user role:', error);
      toast.error('Failed to change user role. Please try again.');
    }
  };

  return (
    <Select
      fullWidth
      disabled={disabled || loading}
      value={selected}
      size="small"
      onChange={handleChange}
      sx={{
        fontSize: '0.875rem',
        height: '36px',
      }}
    >
      {ROLE_OPTIONS.map((option) => (
        <MenuItem
          sx={{
            fontSize: '0.875rem',
          }}
          key={option.value}
          value={option.value}
        >
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
};
