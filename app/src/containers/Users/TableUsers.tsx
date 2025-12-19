import * as React from 'react';
import { Chip, CircularProgress, Tooltip } from '@mui/material';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import GET_ORGANIZATION_USERS from '@/queries/organization/getOrganizationUsers';
import GET_ORGANIZATION_WORKSPACES from '@/queries/workspace/getOrganizationWorkspaces';
import {
  Query,
  OrganizationUserStatus,
  OrganizationUserRole,
} from '@/generated/graphql';
import { ChangeOrganizationSelect } from './ChangeOrganizationSelect';
import { ChangeOrganizationUserRole } from './ChangeOrganizationUserRole';
import { DeleteUserFromOrganization } from './DeleteUserFromOrganization';
import { InviteUser } from '@/components/Invite/InviteUser';
import { RemoveAllUserInvitations } from '@/components/Invite/RemoveAllUserInvitations';
import Pagination from '@/components/Common/Pagination';

type TableUsersProps = {
  organizationId: number;
  userId: number;
  isSuperAdmin: boolean;
  isAdminOrOwnerOrSuper: boolean;
};

const STATUS_STYLES: Record<
  string,
  { backgroundColor: string; color: string }
> = {
  [OrganizationUserStatus.Active]: {
    backgroundColor: '#22c55e',
    color: '#fff',
  },
  [OrganizationUserStatus.Pending]: {
    backgroundColor: '#f59e0b',
    color: '#fff',
  },
  [OrganizationUserStatus.Inactive]: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
  [OrganizationUserStatus.Decline]: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
};

export const TableUsers = ({
  organizationId,
  userId,
  isSuperAdmin = false,
  isAdminOrOwnerOrSuper = false,
}: TableUsersProps) => {
  const [paginationLimit] = React.useState<number>(50);
  const [paginationOffset, setPaginationOffset] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  const previousSearchRef = React.useRef<string>('');

  // Debounce search term to avoid too many API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination offset when search term changes
  React.useEffect(() => {
    if (debouncedSearchTerm !== previousSearchRef.current) {
      previousSearchRef.current = debouncedSearchTerm;
      setPaginationOffset(0);
    }
  }, [debouncedSearchTerm]);

  const { data, loading, error, refetch } = useQuery<Query>(
    GET_ORGANIZATION_USERS,
    {
      variables: {
        search: debouncedSearchTerm || undefined,
      },
    },
  );

  const { data: workspacesData, loading: workspacesLoading } = useQuery<Query>(
    GET_ORGANIZATION_WORKSPACES,
  );

  // Wrapper to ensure refetch always includes current search term
  const refetchWithSearch = React.useCallback(() => {
    return refetch({
      search: debouncedSearchTerm || undefined,
    });
  }, [refetch, debouncedSearchTerm]);

  const users = data?.getOrganizationUsers || [];
  const allWorkspaces = workspacesData?.getOrganizationWorkspaces || [];

  const rows = React.useMemo(
    () =>
      users.map((row, idx) => ({
        number: idx + 1,
        id: Number(row.user_id),
        name: row.user?.name ?? '',
        email: row.user?.email ?? '',
        isActive: row.user?.isActive ?? false,
        currentOrganization: row.currentOrganization?.name ?? '',
        currentOrganizationId: row.currentOrganization?.id ?? '',
        organizations: row.organizations ?? [],
        workspaces: row.workspaces ?? [],
        role: row?.role ?? '',
        status: row?.status ?? '',
        updated_at: row?.updated_at ?? '',
        invitationId: row?.invitationId ?? null,
      })),
    [users],
  );

  // No local filtering needed - backend handles search
  const filteredRows = rows;

  // Paginate filtered rows
  const paginatedRows = React.useMemo(() => {
    const start = paginationOffset;
    const end = start + paginationLimit;
    return filteredRows.slice(start, end);
  }, [filteredRows, paginationOffset, paginationLimit]);

  const handlePageChange = React.useCallback(
    (offset: number, limit: number) => {
      setPaginationOffset(offset);
    },
    [],
  );

  return (
    <>
      <div
        className="min-h-screen bg-[#eaecfb] rounded-2xl border"
        style={{ borderColor: '#A2ADF3', borderWidth: '1px' }}
      >
        {/* Header Section */}
        <div className="bg-[#eaecfb] rounded-2xl border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full">
            {/* Search Bar and Invite Button */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
              {/* Search Bar - Left */}
              <div className="relative w-full md:w-80 md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ border: '1px solid #A2ADF3' }}
                />
              </div>

              {/* Invite Button - Right */}
              <div className="static md:static lg:absolute lg:top-[15px] lg:right-[17px] md:mt-0">
                <InviteUser
                  mode="organization"
                  onUserInvited={refetchWithSearch}
                  isSuperAdmin={isSuperAdmin}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-start px-4 sm:px-6 lg:px-8">
          <div className="h-0.5 bg-[#7383ED] w-full -mt-8"></div>
        </div>

        {/* Main Content */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:pr-12">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <CircularProgress />
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-red-500">Error loading users</div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No users found
                </h3>
                <p className="text-sm text-gray-500">
                  {searchTerm
                    ? 'Try adjusting your search terms.'
                    : 'No users in this organization.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Column Headers & Desktop Rows with horizontal scroll for small laptops */}
              <div className="hidden lg:block overflow-x-auto -mx-4 lg:mx-0">
                <div className="min-w-[1500px] w-full">
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-700 mb-4 pl-6 pr-8 w-full min-w-[1800px]">
                    <div className="flex-shrink-0 mr-2 w-12 flex items-center">
                      <span className="uppercase" style={{ color: '#445AE7' }}>
                        No
                      </span>
                    </div>
                    <div className="flex-shrink-0 mr-2 w-24 flex items-center">
                      <span className="uppercase" style={{ color: '#445AE7' }}>
                        User ID
                      </span>
                    </div>
                    <div className="flex-1 min-w-[180px] mr-2 flex items-center shrink-0">
                      <span className="uppercase whitespace-nowrap" style={{ color: '#445AE7' }}>
                        Name
                      </span>
                    </div>
                    <div className="flex-1 min-w-[220px] mr-2 flex items-center shrink-0">
                      <span className="uppercase whitespace-nowrap" style={{ color: '#445AE7' }}>
                        Email
                      </span>
                    </div>
                    <div className="flex-shrink-0 mr-4 w-32 flex items-center">
                      <span className="uppercase" style={{ color: '#445AE7' }}>
                        Account
                      </span>
                    </div>
                    <div className="flex-shrink-0 mr-4 w-48 flex items-center">
                      <span className="uppercase" style={{ color: '#445AE7' }}>
                        Workspaces
                      </span>
                    </div>
                    <div className="flex-shrink-0 mr-4 w-48 flex items-center">
                      <span className="uppercase" style={{ color: '#445AE7' }}>
                        Active Organization
                      </span>
                    </div>
                    <div className="flex-shrink-0 mr-4 w-32 flex items-center">
                      <span className="uppercase" style={{ color: '#445AE7' }}>
                        Status
                      </span>
                    </div>
                    <div className="flex-shrink-0 mr-4 w-32 flex items-center">
                      <span className="uppercase" style={{ color: '#445AE7' }}>
                        Role
                      </span>
                    </div>
                    <div className="flex-shrink-0 w-40 flex items-center">
                      <span className="uppercase" style={{ color: '#445AE7' }}>
                        Actions
                      </span>
                    </div>
                  </div>
                  <div className="border-b border-gray-200 mb-4"></div>

                  <div className="space-y-2">
                    {paginatedRows.map((row) => {
                      const isVirtualUser = row.id < 0;
                      const rowUserId = row.id;
                      const isSelf = rowUserId === userId;
                      const rowOwner = row.role === OrganizationUserRole.Owner;
                      const NonActive = row?.status !== OrganizationUserStatus.Active;
                      const status = row.status as OrganizationUserStatus;
                      const chipStyle = STATUS_STYLES[status] || {
                        backgroundColor: '#6b7280',
                        color: '#fff',
                      };

                      let displayName = row.name;
                      if (!isVirtualUser && rowUserId === userId) {
                        displayName += ' (you)';
                      }

                      let displayEmail = row.email;
                      if (!isVirtualUser && rowUserId === userId) {
                        displayEmail += ' (you)';
                      }

                      return (
                        <div
                          key={row.id}
                          className="bg-white border p-6 pr-8 hover:shadow-md transition-shadow rounded-lg min-h-[80px] w-full min-w-[1800px]"
                          style={{ borderColor: '#A2ADF3' }}
                        >
                          <div className="flex items-center gap-3">
                            {/* Number */}
                            <div className="flex-shrink-0 mr-2 w-12">
                              <div className="text-sm font-medium text-gray-900">
                                {row.number}
                              </div>
                            </div>

                            {/* User ID */}
                            <div className="flex-shrink-0 mr-2 w-24">
                              <div className="text-sm text-gray-900">
                                {isVirtualUser ? '—' : row.id}
                              </div>
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-[180px] mr-2 shrink-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {isVirtualUser ? '—' : displayName}
                              </div>
                            </div>

                            {/* Email */}
                            <div className="flex-1 min-w-[220px] mr-2 shrink-0">
                              <div className="text-sm text-gray-900 truncate">
                                {displayEmail}
                              </div>
                            </div>

                            {/* Account */}
                            <div className="flex-shrink-0 mr-4 w-32">
                              {isVirtualUser ? (
                                <span>—</span>
                              ) : (
                                <Chip
                                  label={row.isActive ? 'Verified' : 'Unverified'}
                                  color={row.isActive ? 'success' : 'error'}
                                  size="small"
                                  variant="filled"
                                />
                              )}
                            </div>

                            {/* Workspaces */}
                            <div className="flex-shrink-0 mr-4 w-48">
                              {row.workspaces.length === 0 ? (
                                <Chip
                                  label="No workspaces"
                                  size="small"
                                  variant="filled"
                                  sx={{
                                    fontSize: '0.75rem',
                                    height: '20px',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                  }}
                                >
                                  {row.workspaces.slice(0, 3).map(
                                    (workspace: any, index: number) => (
                                      <Link
                                        key={
                                          workspace.id
                                            ? `workspace-link-${workspace.id}`
                                            : `workspace-link-${row.id}-${index}`
                                        }
                                        to={`/workspaces/${workspace.alias}`}
                                        style={{ textDecoration: 'none' }}
                                      >
                                        <Chip
                                          label={workspace.name}
                                          size="small"
                                          variant="outlined"
                                          clickable
                                          sx={{
                                            fontSize: '0.75rem',
                                            height: '20px',
                                            maxWidth: '110px',
                                            '&:hover': {
                                              backgroundColor:
                                                'rgba(25, 118, 210, 0.08)',
                                            },
                                          }}
                                        />
                                      </Link>
                                    ),
                                  )}
                                  {row.workspaces.length > 3 && (
                                    <Chip
                                      label={`+${row.workspaces.length - 3}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        fontSize: '0.75rem',
                                        height: '20px',
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Active Organization */}
                            <div className="flex-shrink-0 mr-4 w-48">
                              {isVirtualUser ? (
                                <span>—</span>
                              ) : !row.currentOrganizationId ? (
                                <Chip
                                  label="No access"
                                  color="warning"
                                  size="small"
                                  variant="filled"
                                />
                              ) : (
                                <ChangeOrganizationSelect
                                  disabled={rowUserId === userId || NonActive}
                                  initialValue={row.currentOrganizationId}
                                  organizations={row.organizations}
                                  userId={rowUserId}
                                />
                              )}
                            </div>

                            {/* Status */}
                            <div className="flex-shrink-0 mr-4 w-32">
                              <Chip
                                label={status}
                                size="small"
                                variant="filled"
                                sx={{ textTransform: 'capitalize', ...chipStyle }}
                              />
                            </div>

                            {/* Role */}
                            <div className="flex-shrink-0 mr-4 w-32">
                              {isVirtualUser ? (
                                <span>—</span>
                              ) : (
                                <ChangeOrganizationUserRole
                                  disabled={isSelf && !isSuperAdmin}
                                  initialValue={row.role}
                                  userId={rowUserId}
                                  isSuperAdmin={isSuperAdmin}
                                  onRoleChanged={refetchWithSearch}
                                />
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0 w-40 flex items-center space-x-1">
                              {rowUserId !== userId && (
                                <InviteUser
                                  mode="workspace"
                                  userEmail={row.email}
                                  userWorkspaces={row.workspaces}
                                  onUserInvited={refetchWithSearch}
                                  buttonSize="medium"
                                  allWorkspaces={allWorkspaces}
                                  workspacesLoading={workspacesLoading}
                                  isSuperAdmin={isSuperAdmin}
                                  isAdminOrOwnerOrSuper={isAdminOrOwnerOrSuper}
                                />
                              )}

                              {isVirtualUser ? (
                                <RemoveAllUserInvitations
                                  email={row.email}
                                  onInvitationRemoved={refetchWithSearch}
                                />
                              ) : (
                                <DeleteUserFromOrganization
                                  disabled={
                                    (rowUserId === userId || rowOwner) &&
                                    !isSuperAdmin
                                  }
                                  userId={rowUserId}
                                  organizationId={organizationId}
                                  onUserDeleted={refetchWithSearch}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mobile View - Simplified */}
              <div className="lg:hidden space-y-3">
                {paginatedRows.map((row) => {
                  const isVirtualUser = row.id < 0;
                  const rowUserId = row.id;
                  const isSelf = rowUserId === userId;
                  const rowOwner = row.role === OrganizationUserRole.Owner;
                  const NonActive = row?.status !== OrganizationUserStatus.Active;
                  const status = row.status as OrganizationUserStatus;
                  const chipStyle = STATUS_STYLES[status] || {
                    backgroundColor: '#6b7280',
                    color: '#fff',
                  };

                  let displayName = row.name;
                  if (!isVirtualUser && rowUserId === userId) {
                    displayName += ' (you)';
                  }

                  let displayEmail = row.email;
                  if (!isVirtualUser && rowUserId === userId) {
                    displayEmail += ' (you)';
                  }

                  return (
                    <div
                      key={row.id}
                      className="bg-white border p-4 rounded-lg"
                      style={{ borderColor: '#A2ADF3' }}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {isVirtualUser ? '—' : displayName}
                            </div>
                            <div className="text-sm text-gray-500 break-all">
                              {displayEmail}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0">
                            #{row.id}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {isVirtualUser ? (
                            <Chip label="—" size="small" />
                          ) : (
                            <Chip
                              label={row.isActive ? 'Verified' : 'Unverified'}
                              color={row.isActive ? 'success' : 'error'}
                              size="small"
                              variant="filled"
                            />
                          )}
                          <Chip
                            label={status}
                            size="small"
                            variant="filled"
                            sx={{ textTransform: 'capitalize', ...chipStyle }}
                          />
                          {!isVirtualUser && (
                            <ChangeOrganizationUserRole
                              disabled={isSelf && !isSuperAdmin}
                              initialValue={row.role}
                              userId={rowUserId}
                              isSuperAdmin={isSuperAdmin}
                              onRoleChanged={refetch}
                            />
                          )}
                        </div>

                        {/* Workspaces - Mobile */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            Workspaces:
                          </div>
                          {row.workspaces.length === 0 ? (
                            <Chip
                              label="No workspaces"
                              size="small"
                              variant="filled"
                              sx={{
                                fontSize: '0.75rem',
                                height: '20px',
                              }}
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.workspaces.slice(0, 3).map(
                                (workspace: any, index: number) => (
                                  <Link
                                    key={
                                      workspace.id
                                        ? `workspace-link-${workspace.id}`
                                        : `workspace-link-${row.id}-${index}`
                                    }
                                    to={`/workspaces/${workspace.alias}`}
                                    style={{ textDecoration: 'none' }}
                                  >
                                    <Chip
                                      label={workspace.name}
                                      size="small"
                                      variant="outlined"
                                      clickable
                                      sx={{
                                        fontSize: '0.75rem',
                                        height: '20px',
                                      }}
                                    />
                                  </Link>
                                ),
                              )}
                              {row.workspaces.length > 3 && (
                                <Chip
                                  label={`+${row.workspaces.length - 3}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.75rem',
                                    height: '20px',
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Active Organization - Mobile */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            Active Organization:
                          </div>
                          {isVirtualUser ? (
                            <span className="text-sm text-gray-400">—</span>
                          ) : !row.currentOrganizationId ? (
                            <Chip
                              label="No access"
                              color="warning"
                              size="small"
                              variant="filled"
                            />
                          ) : (
                            <ChangeOrganizationSelect
                              disabled={rowUserId === userId || NonActive}
                              initialValue={row.currentOrganizationId}
                              organizations={row.organizations}
                              userId={rowUserId}
                            />
                          )}
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                          {rowUserId !== userId && (
                            <InviteUser
                              mode="workspace"
                              userEmail={row.email}
                              userWorkspaces={row.workspaces}
                              onUserInvited={refetchWithSearch}
                              buttonSize="medium"
                              allWorkspaces={allWorkspaces}
                              workspacesLoading={workspacesLoading}
                              isSuperAdmin={isSuperAdmin}
                              isAdminOrOwnerOrSuper={isAdminOrOwnerOrSuper}
                            />
                          )}
                          {isVirtualUser ? (
                            <RemoveAllUserInvitations
                              email={row.email}
                              onInvitationRemoved={refetch}
                            />
                          ) : (
                            <DeleteUserFromOrganization
                              disabled={
                                (rowUserId === userId || rowOwner) &&
                                !isSuperAdmin
                              }
                              userId={rowUserId}
                              organizationId={organizationId}
                              onUserDeleted={refetch}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {filteredRows.length > paginationLimit && (
          <div className="px-4 sm:px-6 lg:px-8 py-4 w-full overflow-hidden">
            <Pagination
              total={filteredRows.length}
              size={paginationLimit}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </>
  );
};
