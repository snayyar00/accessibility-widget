import { OrganizationUser, WorkspaceUser } from '@/generated/graphql';

// ============================================
// Organization Role Helpers
// ============================================

export function isOwner(orgUser?: OrganizationUser | null): boolean {
  return orgUser?.role === 'owner';
}

export function isAdmin(orgUser?: OrganizationUser | null): boolean {
  return orgUser?.role === 'admin';
}

export function isMember(orgUser?: OrganizationUser | null): boolean {
  return orgUser?.role === 'member';
}

export function isAdminOrOwner(orgUser?: OrganizationUser | null): boolean {
  return orgUser?.role === 'owner' || orgUser?.role === 'admin';
}

// ============================================
// Workspace Role Helpers
// ============================================

/**
 * Checks if user is workspace owner
 */
export function isWorkspaceOwner(workspaceRole?: string | null): boolean {
  return workspaceRole === 'owner';
}

/**
 * Checks if user is workspace admin
 */
export function isWorkspaceAdmin(workspaceRole?: string | null): boolean {
  return workspaceRole === 'admin';
}

/**
 * Checks if user is workspace member
 */
export function isWorkspaceMember(workspaceRole?: string | null): boolean {
  return workspaceRole === 'member';
}

/**
 * Checks if user can manage workspace (owner or admin role)
 */
export function isWorkspaceAdminOrOwner(
  workspaceRole?: string | null,
): boolean {
  return workspaceRole === 'owner' || workspaceRole === 'admin';
}

// ============================================
// Combined Permission Helpers
// ============================================

/**
 * Checks if user has permission to edit/delete workspace
 * User can edit/delete if:
 * - is super admin OR organization owner/admin (isAdminOrOwnerOrSuper) OR
 * - is workspace owner/admin
 */
export function canManageWorkspace(
  isAdminOrOwnerOrSuper: boolean,
  workspaceMembers: WorkspaceUser[] | null | undefined,
  currentUserId?: number,
): boolean {
  if (isAdminOrOwnerOrSuper) {
    return true;
  }

  if (workspaceMembers && currentUserId) {
    const userWorkspaceMember = workspaceMembers.find(
      (member) => member.user_id === currentUserId,
    );
    return isWorkspaceAdminOrOwner(userWorkspaceMember?.role);
  }

  return false;
}

/**
 * Checks if user can delete workspace member or invitation
 * User can delete if:
 * - is super admin OR organization owner/admin (isAdminOrOwnerOrSuper) OR
 * - is workspace owner/admin OR
 * - is the creator of the invitation/member (invited_by matches currentUserId) AND target is a member (not admin/owner)
 */
export function canDeleteWorkspaceMember(
  isAdminOrOwnerOrSuper: boolean,
  userWorkspaceRole: string | null | undefined,
  invitedBy: number | string | null | undefined,
  currentUserId?: number,
  targetMemberRole?: string | null | undefined,
): boolean {
  // Org-level permissions
  if (isAdminOrOwnerOrSuper) {
    return true;
  }

  // Workspace-level permissions (owner or admin)
  if (isWorkspaceAdminOrOwner(userWorkspaceRole)) {
    return true;
  }

  // Creator permissions - but only for members (not admin/owner)
  if (
    invitedBy &&
    currentUserId &&
    Number(invitedBy) === Number(currentUserId)
  ) {
    // If target role is provided, check it's a member (not admin/owner)
    if (targetMemberRole && isWorkspaceAdminOrOwner(targetMemberRole)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Checks if user can change workspace member roles
 * User can change roles if:
 * - is super admin OR organization owner/admin (isAdminOrOwnerOrSuper) OR
 * - is workspace owner/admin
 * Workspace members cannot change roles (they can only invite with member role)
 */
export function canChangeWorkspaceMemberRole(
  isAdminOrOwnerOrSuper: boolean,
  userWorkspaceRole: string | null | undefined,
): boolean {
  // Org-level permissions
  if (isAdminOrOwnerOrSuper) {
    return true;
  }

  // Workspace-level permissions (owner or admin only)
  if (isWorkspaceAdminOrOwner(userWorkspaceRole)) {
    return true;
  }

  // Workspace members cannot change roles
  return false;
}
