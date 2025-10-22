import { ORGANIZATION_MANAGEMENT_ROLES, ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_ROLE_OWNER, OrganizationUserRole } from '../constants/organization.constant'
import { WORKSPACE_ALL_ROLES, WORKSPACE_MANAGEMENT_ROLES, WORKSPACE_USER_ROLE_MEMBER, WorkspaceUserRole } from '../constants/workspace.constant'

/**
 * Checks if user has one of the allowed roles in the organization
 * @param userRole - user's role in the organization
 * @param allowedRoles - array of allowed roles
 * @returns true if user's role is in the list of allowed roles
 */
export function hasOrganizationRole(userRole: OrganizationUserRole, allowedRoles: readonly OrganizationUserRole[]): boolean {
  return !!userRole && allowedRoles.includes(userRole)
}

/**
 * Checks if user is an organization administrator (owner or admin)
 * @param userRole - user's role in the organization
 * @returns true if user has administrative privileges
 */
export function isOrganizationAdminOrOwner(userRole: OrganizationUserRole): boolean {
  return hasOrganizationRole(userRole, ORGANIZATION_MANAGEMENT_ROLES)
}

/**
 * Checks if user is the organization owner
 * @param userRole - user's role in the organization
 * @returns true if user is the owner
 */
export function isOrganizationOwner(userRole: OrganizationUserRole): boolean {
  return userRole === ORGANIZATION_USER_ROLE_OWNER
}

/**
 * Checks if user is an organization member
 * @param userRole - user's role in the organization
 * @returns true if user is a member
 */
export function isOrganizationMember(userRole: OrganizationUserRole): boolean {
  return userRole === ORGANIZATION_USER_ROLE_MEMBER
}

/**
 * Checks if user can manage the organization (owner or admin)
 * @param userRole - user's role in the organization
 * @returns true if user can manage the organization
 */
export function canManageOrganization(userRole: OrganizationUserRole): boolean {
  return isOrganizationAdminOrOwner(userRole)
}

/**
 * Checks if user can manage a workspace (owner or admin)
 * @param userRole - user's role in the workspace
 * @returns true if user can manage the workspace
 */
export function canManageWorkspace(userRole: WorkspaceUserRole): boolean {
  return !!userRole && (WORKSPACE_MANAGEMENT_ROLES as readonly WorkspaceUserRole[]).includes(userRole)
}

/**
 * Checks if user is a workspace member (not admin or owner)
 * @param userRole - user's role in the workspace
 * @returns true if user is a member
 */
export function isWorkspaceMember(userRole: WorkspaceUserRole): boolean {
  return userRole === WORKSPACE_USER_ROLE_MEMBER
}

/**
 * Validates if user can invite someone to workspace with a specific role
 * Rules:
 * 1. Super admin or org admin/owner can invite anyone with any role (except multiple owners)
 * 2. Workspace admin/owner can invite anyone with any role to their workspace (except multiple owners)
 * 3. Workspace member can only invite with member role
 *
 * @param isSuperAdmin - is user a super admin
 * @param orgRole - user's role in the organization
 * @param workspaceRole - user's role in the workspace
 * @param inviteeRole - role being assigned to invitee
 * @returns { canInvite: boolean, allowedRoles: WorkspaceUserRole[] }
 */
export function validateWorkspaceInvitePermissions(isSuperAdmin: boolean, orgRole: OrganizationUserRole | null | undefined, workspaceRole: WorkspaceUserRole | null | undefined, inviteeRole: WorkspaceUserRole): { canInvite: boolean; allowedRoles: readonly WorkspaceUserRole[] } {
  const MEMBER_ONLY: readonly WorkspaceUserRole[] = [WORKSPACE_USER_ROLE_MEMBER]

  // Super admin or org admin/owner can invite with any role
  if (isSuperAdmin || (orgRole && canManageOrganization(orgRole))) {
    return {
      canInvite: true,
      allowedRoles: WORKSPACE_ALL_ROLES,
    }
  }

  // Workspace admin/owner can invite with any role
  if (workspaceRole && canManageWorkspace(workspaceRole)) {
    return {
      canInvite: true,
      allowedRoles: WORKSPACE_ALL_ROLES,
    }
  }

  // Workspace member can only invite with member role
  if (workspaceRole && isWorkspaceMember(workspaceRole)) {
    const canInvite = inviteeRole === WORKSPACE_USER_ROLE_MEMBER
    return {
      canInvite,
      allowedRoles: MEMBER_ONLY,
    }
  }

  // No permissions
  return {
    canInvite: false,
    allowedRoles: [],
  }
}
