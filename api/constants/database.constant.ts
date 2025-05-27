import { access } from "fs";

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
};

export const DEFAULT_LIMIT = 25;

export const TRIAL_PLAN_NAME = "free_test";
export const TRIAL_PLAN_INTERVAL = "MONTHLY"
