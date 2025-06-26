export const TABLES = {
  users: 'users',
  userTokens: 'user_tokens',
  userPlans: 'user_plans',
  userPermissions: 'user_permissions',
  products: 'products',
  prices: 'prices',
  teams: 'teams',
  teamInvitations: 'team_invitations',
  teamMembers: 'team_members',
  documents: 'documents',
  allowed_sites: 'allowed_sites',
  visitors: 'unique_visitors',
  impressions: 'impressions',
  accessibilityDescription: 'accessibility_description',
  affectedDisability: 'affected_disability',
  sitesPlans: 'sites_plans',
  sitePermissions: 'sites_permissions',
  problemReports:'problem_reports',
  widgetSettings:'widget_settings',
  newsletterSubscribers:'newsletter_subscribers',
  userPlanTokens:'user_plan_tokens',
  accessibilityReports: 'accessibility_reports',
  organizations: 'organizations',
  organization_users: 'organization_users',
};

export const DEFAULT_LIMIT = 25;

export const TRIAL_PLAN_NAME = "free_test";
export const TRIAL_PLAN_INTERVAL = "MONTHLY";

export const ORGANIZATION_USER_ROLE_OWNER = 'owner';
export const ORGANIZATION_USER_ROLE_MEMBER = 'member';
export const ORGANIZATION_USER_ROLE_ADMIN = 'admin';

export const ORGANIZATION_USER_STATUS_ACTIVE = 'active';
export const ORGANIZATION_USER_STATUS_INVITED = 'invited';
export const ORGANIZATION_USER_STATUS_PENDING = 'pending';
export const ORGANIZATION_USER_STATUS_REMOVED = 'removed';

export type OrganizationUserRole =
  | typeof ORGANIZATION_USER_ROLE_OWNER
  | typeof ORGANIZATION_USER_ROLE_ADMIN
  | typeof ORGANIZATION_USER_ROLE_MEMBER;

export type OrganizationUserStatus =
  | typeof ORGANIZATION_USER_STATUS_ACTIVE
  | typeof ORGANIZATION_USER_STATUS_INVITED
  | typeof ORGANIZATION_USER_STATUS_PENDING
  | typeof ORGANIZATION_USER_STATUS_REMOVED;
