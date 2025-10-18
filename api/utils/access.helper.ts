import { ORGANIZATION_MANAGEMENT_ROLES, ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_ROLE_OWNER, OrganizationUserRole } from '../constants/organization.constant'
import { WORKSPACE_MANAGEMENT_ROLES, WorkspaceUserRole } from '../constants/workspace.constant'

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
