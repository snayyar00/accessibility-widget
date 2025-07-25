export const ORGANIZATION_USER_ROLE_OWNER = 'owner'
export const ORGANIZATION_USER_ROLE_MEMBER = 'member'
export const ORGANIZATION_USER_ROLE_ADMIN = 'admin'

export const ORGANIZATION_USER_STATUS_ACTIVE = 'active'
export const ORGANIZATION_USER_STATUS_INVITED = 'invited'
export const ORGANIZATION_USER_STATUS_PENDING = 'pending'
export const ORGANIZATION_USER_STATUS_REMOVED = 'removed'

export const ORGANIZATION_MANAGEMENT_ROLES = [ORGANIZATION_USER_ROLE_OWNER, ORGANIZATION_USER_ROLE_ADMIN] as const

export type OrganizationUserRole = typeof ORGANIZATION_USER_ROLE_OWNER | typeof ORGANIZATION_USER_ROLE_ADMIN | typeof ORGANIZATION_USER_ROLE_MEMBER

export type OrganizationUserStatus = typeof ORGANIZATION_USER_STATUS_ACTIVE | typeof ORGANIZATION_USER_STATUS_INVITED | typeof ORGANIZATION_USER_STATUS_PENDING | typeof ORGANIZATION_USER_STATUS_REMOVED
