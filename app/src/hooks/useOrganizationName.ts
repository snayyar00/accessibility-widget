import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';

/**
 * Hook to get the current organization's name with a fallback
 * @param fallback - Optional fallback name (defaults to 'WebAbility.io')
 * @returns The organization name or fallback
 */
export const useOrganizationName = (fallback: string = 'WebAbility.io'): string => {
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );
  
  // Also check user's currentOrganization as a fallback
  const userOrganization = useSelector(
    (state: RootState) => state.user.data?.currentOrganization,
  );

  return organization?.name || userOrganization?.name || fallback;
};

export default useOrganizationName;

