import { RootState } from '@/config/store';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { useLazyQuery } from '@apollo/client';
import GET_ORGANIZATION_USERS from '@/queries/organization/getOrganizationUsers';
import { Query } from '@/generated/graphql';

const Users: React.FC = () => {
  const { data: userData } = useSelector((state: RootState) => state.user);

  if (!userData.isAdminOrOwner) {
    return <Redirect to="/" />;
  }

  const [getUsers, { data, error }] = useLazyQuery<Query>(
    GET_ORGANIZATION_USERS,
  );

  useEffect(() => {
    if (userData.current_organization_id) {
      getUsers();
    }
  }, [userData.current_organization_id]);

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-6 w-full max-w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">Organization Users</h1>
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <div className="font-semibold mb-2">Current User:</div>
        <pre className="text-sm bg-white p-2 rounded border border-gray-200 overflow-x-auto">
          {JSON.stringify(userData.currentOrganizationUser, null, 2)}
        </pre>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="text-left px-4 py-2 border-b">ID</th>
              <th className="text-left px-4 py-2 border-b">User ID</th>
              <th className="text-left px-4 py-2 border-b">Role</th>
              <th className="text-left px-4 py-2 border-b">Status</th>
              <th className="text-left px-4 py-2 border-b">Invited By</th>
              <th className="text-left px-4 py-2 border-b">Created At</th>
              <th className="text-left px-4 py-2 border-b">Updated At</th>
            </tr>
          </thead>
          <tbody>
            {data?.getOrganizationUsers?.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="text-left px-4 py-2 border-b">{user.id}</td>
                <td className="text-left px-4 py-2 border-b">{user.user_id}</td>
                <td className="text-left px-4 py-2 border-b capitalize">
                  {user.role}
                </td>
                <td className="text-left px-4 py-2 border-b">{user.status}</td>
                <td className="text-left px-4 py-2 border-b">
                  {user.invited_by}
                </td>
                <td className="text-left px-4 py-2 border-b">
                  {user.created_at}
                </td>
                <td className="text-left px-4 py-2 border-b">
                  {user.updated_at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
