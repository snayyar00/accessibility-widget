import React from 'react';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import {
  useApolloClient,
  useLazyQuery,
  useMutation,
  useQuery,
} from '@apollo/client';
import GET_USER_ORGANIZATIONS from '@/queries/organization/getUserOrganizations';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { ChangeCurrentOrganizationMutation, Query } from '@/generated/graphql';
import CHANGE_CURRENT_ORGANIZATION from '@/queries/user/changeCurrentOrganization';
import GET_PROFILE from '@/queries/auth/getProfile';
import { IS_LOCAL } from '@/config/env';
import { toast } from 'sonner';
import { redirectToUserOrganization } from '@/helpers/redirectToOrganization';
import { setProfileUser } from '@/features/auth/user';

const OrganizationsSelect: React.FC = () => {
  const dispatch = useDispatch();
  const client = useApolloClient();
  const { data: userData } = useSelector((state: RootState) => state.user);

  const skipOrganizationsQuery = !userData || !userData.currentOrganization;

  const { data: organizationsData, loading: organizationsLoading } =
    useQuery<Query>(GET_USER_ORGANIZATIONS, { skip: skipOrganizationsQuery });

  const [
    changeCurrentOrganizationMutation,
    { loading: changeOrganizationLoading },
  ] = useMutation<ChangeCurrentOrganizationMutation>(
    CHANGE_CURRENT_ORGANIZATION,
  );

  const [getProfile, { loading: profileLoading }] = useLazyQuery(GET_PROFILE);

  const organizations = organizationsData?.getUserOrganizations || [];

  const handleChange = async (event: SelectChangeEvent) => {
    const newOrgId = Number(event.target.value);

    try {
      const { data } = await changeCurrentOrganizationMutation({
        variables: { organizationId: newOrgId },
      });

      if (!data || !data.changeCurrentOrganization) {
        toast.error('Failed to change organization. Please try again.');
        return;
      }

      if (!IS_LOCAL) {
        const targetOrganization = organizations.find(
          (org) => Number(org.id) === newOrgId,
        );

        if (targetOrganization?.domain) {
          const redirected = redirectToUserOrganization(
            targetOrganization.domain,
          );

          if (redirected) return;
        }
      }

      client.refetchQueries({
        include: 'active',
      });

      const profileResult = await getProfile();
      const profileUser = profileResult?.data?.profileUser;

      if (profileUser) {
        dispatch(
          setProfileUser({
            data: profileUser,
            loading: profileLoading,
          }),
        );

        toast.success('Organization changed successfully!');
      } else {
        toast.error('Failed to update user profile after organization change.');
      }
    } catch (error) {
      toast.error('Failed to change organization. Please try again.');
    }
  };

  if (!organizations.length || organizations.length === 1) return null;

  return (
    <FormControl fullWidth>
      <Select
        disabled={
          organizationsLoading || changeOrganizationLoading || profileLoading
        }
        size="small"
        value={userData.currentOrganization?.id}
        label={userData.currentOrganization?.domain}
        onChange={handleChange}
        className="[&>fieldset>legend>span]:hidden"
      >
        {organizations.map(({ id, domain }) => (
          <MenuItem key={id} value={id}>
            {domain}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default OrganizationsSelect;
