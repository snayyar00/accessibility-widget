import { OrganizationUser } from "@/features/auth/user";

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
