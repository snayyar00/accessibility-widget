import { RootState } from '@/config/store';
import { isAdminOrOwner } from '@/helpers/organizationRole';
import React from 'react';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';

// GraphQL query to get all organizations of the current user
const GET_USER_ORGANIZATIONS = gql`
  query GetUserOrganizations {
    getUserOrganizations {
      id
      name
      subdomain
      logo_url
      settings
      created_at
      updated_at
    }
  }
`;

const OrganizationsPage: React.FC = () => {
  // Get current user data from Redux store
  const { data: userData } = useSelector((state: RootState) => state.user);

  // Only allow access for admin or owner roles
  if (!isAdminOrOwner(userData.currentOrganizationUser)) {
    return <Redirect to="/" />;
  }

  // Fetch organizations via GraphQL
  const { data, loading, error } = useQuery(GET_USER_ORGANIZATIONS);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-6 w-full max-w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">Organizations</h1>
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <div className="font-semibold mb-2">Current Organization:</div>
        <pre className="text-sm bg-white p-2 rounded border border-gray-200 overflow-x-auto">
          {JSON.stringify(userData.currentOrganization, null, 2)}
        </pre>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="text-left px-4 py-2 border-b">ID</th>
              <th className="text-left px-4 py-2 border-b">Name</th>
              <th className="text-left px-4 py-2 border-b">Subdomain</th>
              <th className="text-left px-4 py-2 border-b">Logo URL</th>
              <th className="text-left px-4 py-2 border-b">Settings</th>
              <th className="text-left px-4 py-2 border-b">Created At</th>
              <th className="text-left px-4 py-2 border-b">Updated At</th>
            </tr>
          </thead>
          <tbody>
            {data.getUserOrganizations.map((org: any) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="text-left px-4 py-2 border-b">{org.id}</td>
                <td className="text-left px-4 py-2 border-b">{org.name}</td>
                <td className="text-left px-4 py-2 border-b">{org.subdomain}</td>
                <td className="text-left px-4 py-2 border-b">{org.logo_url}</td>
                <td className="text-left px-4 py-2 border-b">
                  <pre className="whitespace-pre-wrap break-all text-xs bg-gray-50 p-1 rounded border border-gray-100 max-w-xs overflow-x-auto">{JSON.stringify(org.settings, null, 2)}</pre>
                </td>
                <td className="text-left px-4 py-2 border-b">{org.created_at}</td>
                <td className="text-left px-4 py-2 border-b">{org.updated_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrganizationsPage;
