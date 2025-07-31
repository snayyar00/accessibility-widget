import * as React from 'react';
import { Select, MenuItem, SelectChangeEvent } from '@mui/material';
import {
  ChangeCurrentOrganizationMutation,
  Organization,
} from '@/generated/graphql';
import { useMutation } from '@apollo/client';
import CHANGE_CURRENT_ORGANIZATION from '@/queries/user/changeCurrentOrganization';
import { toast } from 'react-toastify';

type ChangeOrganizationSelectProps = {
  initialValue: number | string;
  organizations: Organization[];
  userId: number | null;
  disabled: boolean;
};

export const ChangeOrganizationSelect: React.FC<
  ChangeOrganizationSelectProps
> = ({ initialValue, organizations, userId, disabled }) => {
  const [selected, setSelected] = React.useState<number | string>(initialValue);

  const [
    changeCurrentOrganizationMutation,
    { loading: changeOrganizationLoading },
  ] = useMutation<ChangeCurrentOrganizationMutation>(
    CHANGE_CURRENT_ORGANIZATION,
  );

  React.useEffect(() => {
    setSelected(initialValue);
  }, [initialValue]);

  const handleChange = async (e: SelectChangeEvent<string | number>) => {
    const organizationId = Number(e.target.value);

    try {
      const { data } = await changeCurrentOrganizationMutation({
        variables: {
          organizationId,
          userId: Number(userId),
        },
      });

      if (!data || !data.changeCurrentOrganization) {
        toast.error('Failed to change organization. Please try again.');
        return;
      }

      setSelected(organizationId);
      toast.success('Organization changed successfully!');
    } catch (error) {
      toast.error('Failed to change organization. Please try again.');
    }
  };

  return (
    <Select
      disabled={disabled || changeOrganizationLoading}
      value={selected}
      size="small"
      sx={{ minWidth: 150 }}
      onChange={handleChange}
    >
      {organizations.map((org: Organization) => (
        <MenuItem key={org.id} value={org.id}>
          {org.name}
        </MenuItem>
      ))}
    </Select>
  );
};
