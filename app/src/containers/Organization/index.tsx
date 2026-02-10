import React from 'react';
import { RootState } from '@/config/store';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import Settings from './Settings';
import AgencyProgram from './AgencyProgram';
import AgencyBillingPortal from './AgencyBillingPortal';
import { isOwner } from '@/helpers/permissions';

const Organization: React.FC = () => {
  const { data: userData } = useSelector((state: RootState) => state.user);
  const organization = userData?.currentOrganization;

  const isOrganizationOwner = isOwner(userData.currentOrganizationUser);
  const hasAgencyAccountId =
    !!userData.currentOrganizationUser?.hasAgencyAccountId;

  const hasAccess = userData.isAdminOrOwnerOrSuper && organization;

  if (!hasAccess) {
    return <Redirect to="/" />;
  }

  return (
    <section className="p-2 md:p-4 relative">
      <h1 className="text-3xl font-bold text-gray-900 md:text-4xl mb-8 hidden lg:block lg:pr-[300px]">
        Organization
      </h1>

      <div className="space-y-6 empty:hidden">
        <Settings organization={organization} isOwner={isOrganizationOwner} />

        {/* Agency Program - Only show to owners */}
        <AgencyProgram
          hasAgencyAccountId={hasAgencyAccountId}
          isOwner={isOrganizationOwner}
        />
        
        {/* Agency Billing Portal - Only show when fully onboarded */}
        <AgencyBillingPortal hasAgencyAccountId={hasAgencyAccountId} />
      </div>
    </section>
  );
};

export default Organization;
