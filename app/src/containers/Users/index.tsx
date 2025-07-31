import { RootState } from '@/config/store';
import { TableUsers } from '@/containers/Users/TableUsers';
import React from 'react';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

const Users: React.FC = () => {
  const { data: userData } = useSelector((state: RootState) => state.user);

  if (!userData.isAdminOrOwner) {
    return <Redirect to="/" />;
  }

  return (
    <section className="p-2 md:p-4">
      <h1 className="text-3xl font-bold text-gray-900 md:text-4xl mb-8">
        Organization Users
      </h1>

      {userData.current_organization_id && (
        <TableUsers organizationId={userData.current_organization_id} />
      )}
    </section>
  );
};

export default Users;
