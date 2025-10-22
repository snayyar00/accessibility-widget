import { RootState } from '@/config/store';
import { TableUsers } from '@/containers/Users/TableUsers';
import React from 'react';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

const Users: React.FC = () => {
  const { data: userData } = useSelector((state: RootState) => state.user);

  if (!userData.isAdminOrOwnerOrSuper) {
    return <Redirect to="/" />;
  }

  return (
    <section className="p-2 md:p-4 relative">
      <h1 className="text-3xl font-bold text-gray-900 md:text-4xl mb-8 hidden lg:block lg:pr-[300px]">
        Users
      </h1>

      {userData.current_organization_id && userData.id && (
        <TableUsers
          userId={Number(userData.id)}
          organizationId={userData.current_organization_id}
          isSuperAdmin={userData.is_super_admin || false}
          isAdminOrOwnerOrSuper={userData.isAdminOrOwnerOrSuper || false}
        />
      )}
    </section>
  );
};

export default Users;
