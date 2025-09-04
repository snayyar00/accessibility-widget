/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
  JSON: { input: any; output: any; }
  Upload: { input: any; output: any; }
};

export type AccessibilityContext = {
  __typename?: 'AccessibilityContext';
  has_cms?: Maybe<Scalars['Boolean']['output']>;
  has_ecommerce?: Maybe<Scalars['Boolean']['output']>;
  has_framework?: Maybe<Scalars['Boolean']['output']>;
  is_spa?: Maybe<Scalars['Boolean']['output']>;
  platform?: Maybe<Scalars['String']['output']>;
  platform_type?: Maybe<Scalars['String']['output']>;
};

export type AccessibilityJobResponse = {
  __typename?: 'AccessibilityJobResponse';
  jobId: Scalars['String']['output'];
};

export type AccessibilityJobResult = {
  __typename?: 'AccessibilityJobResult';
  reportData?: Maybe<Report>;
  savedReport?: Maybe<SaveReportResponse>;
};

export type AccessibilityJobStatusResponse = {
  __typename?: 'AccessibilityJobStatusResponse';
  error?: Maybe<Scalars['String']['output']>;
  result?: Maybe<AccessibilityJobResult>;
  status: Scalars['String']['output'];
};

export type AccessibilityReportMeta = {
  __typename?: 'AccessibilityReportMeta';
  allowed_sites_id?: Maybe<Scalars['Int']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  r2_key: Scalars['String']['output'];
  score?: Maybe<Scalars['JSON']['output']>;
  updated_at: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type AccessibilityReportTableRow = {
  __typename?: 'AccessibilityReportTableRow';
  created_at: Scalars['String']['output'];
  r2_key: Scalars['String']['output'];
  score?: Maybe<Scalars['JSON']['output']>;
  url: Scalars['String']['output'];
};

export type AllowedSite = {
  __typename?: 'AllowedSite';
  id: Scalars['ID']['output'];
  url: Scalars['String']['output'];
};

export enum BillingType {
  Monthly = 'MONTHLY',
  Yearly = 'YEARLY'
}

export type CategorizedTechnology = {
  __typename?: 'CategorizedTechnology';
  category: Scalars['String']['output'];
  technologies: Array<Scalars['String']['output']>;
};

export type ChangePasswordPayload = {
  __typename?: 'ChangePasswordPayload';
  token: Scalars['String']['output'];
};

export type ConfidenceDistribution = {
  __typename?: 'ConfidenceDistribution';
  critical_120_plus?: Maybe<Scalars['Int']['output']>;
  high_90_119?: Maybe<Scalars['Int']['output']>;
  low_less_than_60?: Maybe<Scalars['Int']['output']>;
  medium_60_89?: Maybe<Scalars['Int']['output']>;
};

export type DomainAnalysisResult = {
  __typename?: 'DomainAnalysisResult';
  error?: Maybe<Scalars['String']['output']>;
  insights?: Maybe<Scalars['JSON']['output']>;
  status: Scalars['String']['output'];
  timestamp: Scalars['Date']['output'];
  url: Scalars['String']['output'];
};

export type HumanFunctionality = {
  __typename?: 'HumanFunctionality';
  Errors?: Maybe<Array<Maybe<HtmlCsOutput>>>;
  FunctionalityName?: Maybe<Scalars['String']['output']>;
};

export type Impression = {
  __typename?: 'Impression';
  createdAt: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  profileCounts?: Maybe<Scalars['JSON']['output']>;
  site_id: Scalars['Int']['output'];
  visitor_id: Scalars['Int']['output'];
  widget_closed: Scalars['Boolean']['output'];
  widget_opened: Scalars['Boolean']['output'];
};

export type ImpressionList = {
  __typename?: 'ImpressionList';
  count: Scalars['Int']['output'];
  impressions: Array<Maybe<Impression>>;
};

export type ImpressionUpdateResponse = {
  __typename?: 'ImpressionUpdateResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Issue = {
  __typename?: 'Issue';
  context?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  description?: Maybe<Scalars['String']['output']>;
  functionality?: Maybe<Scalars['String']['output']>;
  impact?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  recommended_action?: Maybe<Scalars['String']['output']>;
  screenshotUrl?: Maybe<Scalars['String']['output']>;
  selectors?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export enum JoinWorkspaceType {
  Accept = 'accept',
  Decline = 'decline'
}

export type LicenseOwnerInfo = {
  __typename?: 'LicenseOwnerInfo';
  id: Scalars['ID']['output'];
  license_owner_email?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phone_number?: Maybe<Scalars['String']['output']>;
};

export type LoginPayload = {
  __typename?: 'LoginPayload';
  token: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  _?: Maybe<Scalars['Boolean']['output']>;
  addImpressionsURL?: Maybe<Array<Maybe<Scalars['Int']['output']>>>;
  addOrganization?: Maybe<Organization>;
  addSite: Scalars['String']['output'];
  changeCurrentOrganization: Scalars['Boolean']['output'];
  changeCurrentWorkspace: Scalars['Boolean']['output'];
  changeOrganizationUserRole?: Maybe<Scalars['Boolean']['output']>;
  changePassword: ChangePasswordPayload;
  changeURL?: Maybe<Scalars['String']['output']>;
  changeWorkspaceMemberRole: Scalars['Boolean']['output'];
  createWorkspace: Workspace;
  deleteAccessibilityReport: Scalars['Boolean']['output'];
  deleteAccount: Scalars['Boolean']['output'];
  deleteSite: Scalars['Int']['output'];
  deleteWorkspace: Scalars['Boolean']['output'];
  editOrganization?: Maybe<Organization>;
  forgotPassword: Scalars['Boolean']['output'];
  inviteWorkspaceMember: WorkspaceInvitation;
  joinWorkspace: Scalars['Boolean']['output'];
  login: LoginPayload;
  logout: Scalars['Boolean']['output'];
  register: RegisterPayload;
  registerInteraction: Scalars['Int']['output'];
  removeAllUserInvitations: Scalars['Boolean']['output'];
  removeOrganization?: Maybe<Scalars['Boolean']['output']>;
  removeUserFromOrganization?: Maybe<Scalars['Boolean']['output']>;
  removeWorkspaceInvitation: Scalars['Boolean']['output'];
  removeWorkspaceMember: Scalars['Boolean']['output'];
  reportProblem: Scalars['String']['output'];
  resendEmail: Scalars['Boolean']['output'];
  resetPassword: Scalars['Boolean']['output'];
  saveAccessibilityReport: SaveReportResponse;
  sendProofOfEffortToolkit: SendToolkitResponse;
  sendWidgetInstallationInstructions: WidgetInstallationResponse;
  toggleSiteMonitoring: Scalars['Boolean']['output'];
  translateStatement: TranslationResponse;
  updateImpressionProfileCounts: ImpressionUpdateResponse;
  updateLicenseOwnerInfo: Scalars['Boolean']['output'];
  updateNotificationSettings: Scalars['Boolean']['output'];
  updateProfile: Scalars['Boolean']['output'];
  updateSitesPlan: Scalars['Boolean']['output'];
  updateWorkspace: Workspace;
  verify: Scalars['Boolean']['output'];
};


export type MutationAddImpressionsUrlArgs = {
  ip: Scalars['String']['input'];
  url: Scalars['String']['input'];
};


export type MutationAddOrganizationArgs = {
  domain: Scalars['String']['input'];
  logo_url?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  settings?: InputMaybe<Scalars['JSON']['input']>;
};


export type MutationAddSiteArgs = {
  url: Scalars['String']['input'];
};


export type MutationChangeCurrentOrganizationArgs = {
  organizationId: Scalars['Int']['input'];
  userId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationChangeCurrentWorkspaceArgs = {
  userId?: InputMaybe<Scalars['Int']['input']>;
  workspaceId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationChangeOrganizationUserRoleArgs = {
  role: OrganizationUserRole;
  userId: Scalars['Int']['input'];
};


export type MutationChangePasswordArgs = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationChangeUrlArgs = {
  newURL: Scalars['String']['input'];
  siteId: Scalars['Int']['input'];
};


export type MutationChangeWorkspaceMemberRoleArgs = {
  id: Scalars['ID']['input'];
  role: WorkspaceUserRole;
};


export type MutationCreateWorkspaceArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteAccessibilityReportArgs = {
  r2_key: Scalars['String']['input'];
};


export type MutationDeleteSiteArgs = {
  url: Scalars['String']['input'];
};


export type MutationDeleteWorkspaceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEditOrganizationArgs = {
  domain?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  logo_url?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<Scalars['JSON']['input']>;
};


export type MutationForgotPasswordArgs = {
  email: Scalars['String']['input'];
};


export type MutationInviteWorkspaceMemberArgs = {
  email: Scalars['String']['input'];
  role: WorkspaceUserRole;
  workspaceId: Scalars['ID']['input'];
};


export type MutationJoinWorkspaceArgs = {
  token: Scalars['String']['input'];
  type: JoinWorkspaceType;
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationRegisterArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationRegisterInteractionArgs = {
  impressionId: Scalars['Int']['input'];
  interaction: Scalars['String']['input'];
};


export type MutationRemoveAllUserInvitationsArgs = {
  email: Scalars['String']['input'];
};


export type MutationRemoveOrganizationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveUserFromOrganizationArgs = {
  userId: Scalars['Int']['input'];
};


export type MutationRemoveWorkspaceInvitationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveWorkspaceMemberArgs = {
  id: Scalars['ID']['input'];
};


export type MutationReportProblemArgs = {
  description: Scalars['String']['input'];
  issue_type: Scalars['String']['input'];
  reporter_email: Scalars['String']['input'];
  site_url: Scalars['String']['input'];
};


export type MutationResendEmailArgs = {
  type: SendMailType;
};


export type MutationResetPasswordArgs = {
  confirmPassword: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationSaveAccessibilityReportArgs = {
  allowed_sites_id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  report: Scalars['JSON']['input'];
  score?: InputMaybe<Scalars['JSON']['input']>;
  url: Scalars['String']['input'];
};


export type MutationSendProofOfEffortToolkitArgs = {
  input: SendToolkitInput;
};


export type MutationSendWidgetInstallationInstructionsArgs = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
  language: Scalars['String']['input'];
  languageName: Scalars['String']['input'];
  position: Scalars['String']['input'];
};


export type MutationToggleSiteMonitoringArgs = {
  enabled: Scalars['Boolean']['input'];
  siteId: Scalars['Int']['input'];
};


export type MutationTranslateStatementArgs = {
  content: Scalars['String']['input'];
  context?: InputMaybe<Scalars['String']['input']>;
  languageCode: Scalars['String']['input'];
  targetLanguage: Scalars['String']['input'];
};


export type MutationUpdateImpressionProfileCountsArgs = {
  impressionId: Scalars['Int']['input'];
  profileCounts: Scalars['JSON']['input'];
};


export type MutationUpdateLicenseOwnerInfoArgs = {
  license_owner_email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateNotificationSettingsArgs = {
  issue_reported_flag?: InputMaybe<Scalars['Boolean']['input']>;
  monitoring_alert_flag?: InputMaybe<Scalars['Boolean']['input']>;
  monthly_report_flag?: InputMaybe<Scalars['Boolean']['input']>;
  new_domain_flag?: InputMaybe<Scalars['Boolean']['input']>;
  onboarding_emails_flag?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUpdateProfileArgs = {
  company?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateSitesPlanArgs = {
  billingType: BillingType;
  planName: Scalars['String']['input'];
  sitesPlanId: Scalars['Int']['input'];
};


export type MutationUpdateWorkspaceArgs = {
  allowedSiteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationVerifyArgs = {
  token: Scalars['String']['input'];
};

export type NotificationSettings = {
  __typename?: 'NotificationSettings';
  issue_reported_flag: Scalars['Boolean']['output'];
  monitoring_alert_flag: Scalars['Boolean']['output'];
  monthly_report_flag: Scalars['Boolean']['output'];
  new_domain_flag: Scalars['Boolean']['output'];
  onboarding_emails_flag: Scalars['Boolean']['output'];
};

export type Organization = {
  __typename?: 'Organization';
  created_at?: Maybe<Scalars['Date']['output']>;
  domain: Scalars['String']['output'];
  favicon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  logo_url?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  settings?: Maybe<Scalars['JSON']['output']>;
  updated_at?: Maybe<Scalars['Date']['output']>;
};

export type OrganizationUser = {
  __typename?: 'OrganizationUser';
  created_at?: Maybe<Scalars['Date']['output']>;
  currentOrganization?: Maybe<Organization>;
  currentWorkspace?: Maybe<Workspace>;
  current_workspace_id?: Maybe<Scalars['Int']['output']>;
  hasWorkspace: Scalars['Boolean']['output'];
  id?: Maybe<Scalars['ID']['output']>;
  invitationId?: Maybe<Scalars['Int']['output']>;
  organization_id: Scalars['Int']['output'];
  organizations: Array<Organization>;
  role?: Maybe<OrganizationUserRole>;
  status?: Maybe<OrganizationUserStatus>;
  updated_at?: Maybe<Scalars['Date']['output']>;
  user: User;
  user_id: Scalars['Int']['output'];
  workspaces: Array<Workspace>;
};

export enum OrganizationUserRole {
  Admin = 'admin',
  Member = 'member',
  Owner = 'owner'
}

export enum OrganizationUserStatus {
  Active = 'active',
  Invited = 'invited',
  Pending = 'pending',
  Removed = 'removed'
}

export type PreprocessingStats = {
  __typename?: 'PreprocessingStats';
  avg_confidence_score?: Maybe<Scalars['Int']['output']>;
  batches_created?: Maybe<Scalars['Int']['output']>;
  confidence_distribution?: Maybe<ConfidenceDistribution>;
  filtering_efficiency?: Maybe<Scalars['Int']['output']>;
  issues_filtered?: Maybe<Scalars['Int']['output']>;
  potential_template_savings?: Maybe<Scalars['Int']['output']>;
  processed_issues_count?: Maybe<Scalars['Int']['output']>;
  processing_time_ms?: Maybe<Scalars['Int']['output']>;
  raw_issues_count?: Maybe<Scalars['Int']['output']>;
  runner_breakdown?: Maybe<RunnerBreakdown>;
  template_issues_count?: Maybe<Scalars['Int']['output']>;
  template_patterns_detected?: Maybe<Scalars['Int']['output']>;
};

export type ProcessingMetadata = {
  __typename?: 'ProcessingMetadata';
  batch_id?: Maybe<Scalars['String']['output']>;
  gpt_success?: Maybe<Scalars['Boolean']['output']>;
  merged_from?: Maybe<Scalars['Int']['output']>;
  runner_agreement?: Maybe<Scalars['Boolean']['output']>;
  runners?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type ProcessingStats = {
  __typename?: 'ProcessingStats';
  failed_batches?: Maybe<Scalars['Int']['output']>;
  issues_filtered?: Maybe<Scalars['Int']['output']>;
  issues_merged?: Maybe<Scalars['Int']['output']>;
  preprocessing_applied?: Maybe<Scalars['Boolean']['output']>;
  successful_batches?: Maybe<Scalars['Int']['output']>;
  template_issues_detected?: Maybe<Scalars['Int']['output']>;
  total_batches?: Maybe<Scalars['Int']['output']>;
  total_issues?: Maybe<Scalars['Int']['output']>;
};

export type Query = {
  __typename?: 'Query';
  _?: Maybe<Scalars['Boolean']['output']>;
  analyzeDomain: DomainAnalysisResult;
  fetchAccessibilityReportFromR2: Array<AccessibilityReportTableRow>;
  fetchReportByR2Key?: Maybe<Report>;
  getAccessibilityReport?: Maybe<Report>;
  getAccessibilityReportByJobId: AccessibilityJobStatusResponse;
  getAllUserSites?: Maybe<Array<Maybe<Site>>>;
  getEngagementRates?: Maybe<Array<Maybe<EngagementRate>>>;
  getImpressionsByURLAndDate?: Maybe<ImpressionList>;
  getLicenseOwnerInfo: LicenseOwnerInfo;
  getOrganizationByDomain?: Maybe<Organization>;
  getOrganizationUsers: Array<OrganizationUser>;
  getOrganizationWorkspaces: Array<Workspace>;
  getPlanBySiteIdAndUserId?: Maybe<SitesPlanData>;
  getSiteVisitorsByURL?: Maybe<VisitorResponse>;
  getUserNotificationSettings: NotificationSettings;
  getUserOrganizations: Array<Organization>;
  getUserSites?: Maybe<Array<Maybe<Site>>>;
  getUserWorkspaces: Array<Workspace>;
  getWorkspaceByAlias?: Maybe<Workspace>;
  getWorkspaceInvitationsByAlias: Array<WorkspaceInvitationDetails>;
  getWorkspaceMembersByAlias: Array<WorkspaceUser>;
  isDomainAlreadyAdded: Scalars['Boolean']['output'];
  isEmailAlreadyRegistered: Scalars['Boolean']['output'];
  profileUser: User;
  startAccessibilityReportJob: AccessibilityJobResponse;
  validateToken: TokenValidationResponse;
  verifyWorkspaceInvitationToken: VerifyWorkspaceInvitationResponse;
};


export type QueryAnalyzeDomainArgs = {
  domain: Scalars['String']['input'];
};


export type QueryFetchAccessibilityReportFromR2Args = {
  created_at?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};


export type QueryFetchReportByR2KeyArgs = {
  r2_key: Scalars['String']['input'];
};


export type QueryGetAccessibilityReportArgs = {
  url: Scalars['String']['input'];
};


export type QueryGetAccessibilityReportByJobIdArgs = {
  jobId: Scalars['String']['input'];
};


export type QueryGetEngagementRatesArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};


export type QueryGetImpressionsByUrlAndDateArgs = {
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
  url: Scalars['String']['input'];
};


export type QueryGetPlanBySiteIdAndUserIdArgs = {
  siteId: Scalars['Int']['input'];
};


export type QueryGetSiteVisitorsByUrlArgs = {
  url: Scalars['String']['input'];
};


export type QueryGetWorkspaceByAliasArgs = {
  alias: Scalars['String']['input'];
};


export type QueryGetWorkspaceInvitationsByAliasArgs = {
  alias: Scalars['String']['input'];
};


export type QueryGetWorkspaceMembersByAliasArgs = {
  alias: Scalars['String']['input'];
};


export type QueryIsDomainAlreadyAddedArgs = {
  url: Scalars['String']['input'];
};


export type QueryIsEmailAlreadyRegisteredArgs = {
  email: Scalars['String']['input'];
};


export type QueryStartAccessibilityReportJobArgs = {
  url: Scalars['String']['input'];
};


export type QueryValidateTokenArgs = {
  url: Scalars['String']['input'];
};


export type QueryVerifyWorkspaceInvitationTokenArgs = {
  invitationToken: Scalars['String']['input'];
};

export type RegisterPayload = {
  __typename?: 'RegisterPayload';
  token: Scalars['String']['output'];
};

export type Report = {
  __typename?: 'Report';
  ByFunctions?: Maybe<Array<Maybe<HumanFunctionality>>>;
  axe?: Maybe<AxeResult>;
  functionalityNames?: Maybe<Array<Scalars['String']['output']>>;
  htmlcs?: Maybe<HtmlCsResult>;
  issues?: Maybe<Array<Issue>>;
  issuesByFunction?: Maybe<Scalars['JSON']['output']>;
  preprocessing_stats?: Maybe<PreprocessingStats>;
  processing_stats?: Maybe<ProcessingStats>;
  score?: Maybe<Scalars['Int']['output']>;
  scriptCheckResult?: Maybe<Scalars['String']['output']>;
  siteImg?: Maybe<Scalars['String']['output']>;
  techStack?: Maybe<TechStack>;
  template_analysis?: Maybe<TemplateAnalysis>;
  totalElements?: Maybe<Scalars['Int']['output']>;
  totalStats?: Maybe<Scalars['JSON']['output']>;
};

export type RunnerBreakdown = {
  __typename?: 'RunnerBreakdown';
  axe_only?: Maybe<Scalars['Int']['output']>;
  both_runners?: Maybe<Scalars['Int']['output']>;
  htmlcs_only?: Maybe<Scalars['Int']['output']>;
};

export type SaveReportResponse = {
  __typename?: 'SaveReportResponse';
  key: Scalars['String']['output'];
  report?: Maybe<AccessibilityReportMeta>;
  success: Scalars['Boolean']['output'];
};

export enum SendMailType {
  ForgotPassword = 'FORGOT_PASSWORD',
  VerifyEmail = 'VERIFY_EMAIL'
}

export type SendToolkitInput = {
  domain: Scalars['String']['input'];
  email: Scalars['String']['input'];
  reportDate?: InputMaybe<Scalars['String']['input']>;
  zipFileBase64: Scalars['String']['input'];
};

export type SendToolkitResponse = {
  __typename?: 'SendToolkitResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type SendWidgetInstallationInput = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
  language: Scalars['String']['input'];
  languageName: Scalars['String']['input'];
  position: Scalars['String']['input'];
};

export type Site = {
  __typename?: 'Site';
  createAt?: Maybe<Scalars['String']['output']>;
  expiredAt?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  is_currently_down?: Maybe<Scalars['Int']['output']>;
  last_monitor_check?: Maybe<Scalars['String']['output']>;
  monitor_consecutive_fails?: Maybe<Scalars['Int']['output']>;
  monitor_enabled?: Maybe<Scalars['Boolean']['output']>;
  monitor_priority?: Maybe<Scalars['Int']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  trial?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  user_id?: Maybe<Scalars['Int']['output']>;
};

export type SitesPlanData = {
  __typename?: 'SitesPlanData';
  amount: Scalars['Float']['output'];
  createdAt?: Maybe<Scalars['Date']['output']>;
  customerId: Scalars['String']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  expiredAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['Int']['output'];
  isActive: Scalars['Boolean']['output'];
  isTrial: Scalars['Boolean']['output'];
  priceId: Scalars['Int']['output'];
  priceType: Scalars['String']['output'];
  productId: Scalars['Int']['output'];
  productType: Scalars['String']['output'];
  siteId: Scalars['Int']['output'];
  siteName: Scalars['String']['output'];
  subcriptionId: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['Date']['output']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  _?: Maybe<Scalars['Boolean']['output']>;
};

export type TechStack = {
  __typename?: 'TechStack';
  accessibilityContext?: Maybe<AccessibilityContext>;
  analyzedAt: Scalars['String']['output'];
  analyzedUrl: Scalars['String']['output'];
  categorizedTechnologies: Array<CategorizedTechnology>;
  confidence?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  technologies: Array<Scalars['String']['output']>;
};

export type TemplateAnalysis = {
  __typename?: 'TemplateAnalysis';
  fix_priority_score?: Maybe<Scalars['Int']['output']>;
  patterns_detected?: Maybe<Array<Maybe<TemplatePattern>>>;
  potential_cost_savings?: Maybe<Scalars['Int']['output']>;
  total_template_issues?: Maybe<Scalars['Int']['output']>;
};

export type TemplateInfo = {
  __typename?: 'TemplateInfo';
  fix_scope?: Maybe<Scalars['String']['output']>;
  is_template_issue?: Maybe<Scalars['Boolean']['output']>;
  occurrence_count?: Maybe<Scalars['Int']['output']>;
};

export type TemplatePattern = {
  __typename?: 'TemplatePattern';
  affected_elements?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  confidence?: Maybe<Scalars['Int']['output']>;
  estimated_fix_effort?: Maybe<Scalars['String']['output']>;
  fix_priority_score?: Maybe<Scalars['Int']['output']>;
  fix_scope?: Maybe<Scalars['String']['output']>;
  issue_type?: Maybe<Scalars['String']['output']>;
  occurrence_count?: Maybe<Scalars['Int']['output']>;
  pattern_id?: Maybe<Scalars['String']['output']>;
  selector_pattern?: Maybe<Scalars['String']['output']>;
  template_recommendation?: Maybe<Scalars['String']['output']>;
};

export type TokenValidationResponse = {
  __typename?: 'TokenValidationResponse';
  organization?: Maybe<Organization>;
  savedState?: Maybe<Scalars['JSON']['output']>;
  validation: Scalars['String']['output'];
};

export type TranslationResponse = {
  __typename?: 'TranslationResponse';
  error?: Maybe<Scalars['String']['output']>;
  languageCode: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  translatedContent?: Maybe<Scalars['String']['output']>;
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  currentOrganization?: Maybe<Organization>;
  currentOrganizationUser?: Maybe<OrganizationUser>;
  current_organization_id?: Maybe<Scalars['Int']['output']>;
  email: Scalars['String']['output'];
  hasOrganization: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  invitationToken?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  position?: Maybe<Scalars['String']['output']>;
};

export type VerifyWorkspaceInvitationResponse = {
  __typename?: 'VerifyWorkspaceInvitationResponse';
  invited_by: Scalars['String']['output'];
  role: WorkspaceUserRole;
  status: WorkspaceInvitationStatus;
  valid_until: Scalars['String']['output'];
  workspace_name: Scalars['String']['output'];
};

export type Visitor = {
  __typename?: 'Visitor';
  city?: Maybe<Scalars['String']['output']>;
  continent?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  firstVisit?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  ipAddress?: Maybe<Scalars['String']['output']>;
  siteId?: Maybe<Scalars['Int']['output']>;
  zipcode?: Maybe<Scalars['String']['output']>;
};

export type WidgetInstallationResponse = {
  __typename?: 'WidgetInstallationResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Workspace = {
  __typename?: 'Workspace';
  alias: Scalars['String']['output'];
  domains: Array<AllowedSite>;
  id: Scalars['ID']['output'];
  members: Array<WorkspaceUser>;
  name: Scalars['String']['output'];
  organization_id: Scalars['ID']['output'];
};

export type WorkspaceInvitation = {
  __typename?: 'WorkspaceInvitation';
  status?: Maybe<WorkspaceUserStatus>;
  user_email?: Maybe<Scalars['String']['output']>;
  user_id?: Maybe<Scalars['ID']['output']>;
  user_name?: Maybe<Scalars['String']['output']>;
};

export type WorkspaceInvitationDetails = {
  __typename?: 'WorkspaceInvitationDetails';
  created_at?: Maybe<Scalars['Date']['output']>;
  email: Scalars['String']['output'];
  id?: Maybe<Scalars['ID']['output']>;
  invited_by: Scalars['String']['output'];
  organization_id?: Maybe<Scalars['ID']['output']>;
  role: WorkspaceUserRole;
  status: WorkspaceInvitationStatus;
  token?: Maybe<Scalars['String']['output']>;
  valid_until: Scalars['String']['output'];
  workspace_id?: Maybe<Scalars['ID']['output']>;
  workspace_name: Scalars['String']['output'];
};

export enum WorkspaceInvitationStatus {
  Accepted = 'accepted',
  Declined = 'declined',
  Expired = 'expired',
  Pending = 'pending'
}

export type WorkspaceUser = {
  __typename?: 'WorkspaceUser';
  created_at?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  invitationId?: Maybe<Scalars['Int']['output']>;
  role: Scalars['String']['output'];
  status: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  user?: Maybe<User>;
  user_id: Scalars['Int']['output'];
  workspace_id: Scalars['Int']['output'];
};

export enum WorkspaceUserRole {
  Admin = 'admin',
  Member = 'member',
  Owner = 'owner'
}

export enum WorkspaceUserStatus {
  Active = 'active',
  Decline = 'decline',
  Inactive = 'inactive',
  Pending = 'pending'
}

export type AxeOutput = {
  __typename?: 'axeOutput';
  confidence_score?: Maybe<Scalars['Int']['output']>;
  context?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  description?: Maybe<Scalars['String']['output']>;
  help?: Maybe<Scalars['String']['output']>;
  impact?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  processing_metadata?: Maybe<ProcessingMetadata>;
  screenshotUrl?: Maybe<Scalars['String']['output']>;
  selectors?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  template_info?: Maybe<TemplateInfo>;
  wcag_code?: Maybe<Scalars['String']['output']>;
};

export type AxeResult = {
  __typename?: 'axeResult';
  errors?: Maybe<Array<Maybe<AxeOutput>>>;
  notices?: Maybe<Array<Maybe<AxeOutput>>>;
  warnings?: Maybe<Array<Maybe<AxeOutput>>>;
};

export type EngagementRate = {
  __typename?: 'engagementRate';
  date?: Maybe<Scalars['String']['output']>;
  engagementRate?: Maybe<Scalars['Float']['output']>;
  totalEngagements?: Maybe<Scalars['Int']['output']>;
  totalImpressions?: Maybe<Scalars['Int']['output']>;
};

export type HtmlCsOutput = {
  __typename?: 'htmlCsOutput';
  code?: Maybe<Scalars['String']['output']>;
  confidence_score?: Maybe<Scalars['Int']['output']>;
  context?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  description?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  processing_metadata?: Maybe<ProcessingMetadata>;
  recommended_action?: Maybe<Scalars['String']['output']>;
  screenshotUrl?: Maybe<Scalars['String']['output']>;
  selectors?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  template_info?: Maybe<TemplateInfo>;
  wcag_code?: Maybe<Scalars['String']['output']>;
};

export type HtmlCsResult = {
  __typename?: 'htmlCsResult';
  errors?: Maybe<Array<Maybe<HtmlCsOutput>>>;
  notices?: Maybe<Array<Maybe<HtmlCsOutput>>>;
  warnings?: Maybe<Array<Maybe<HtmlCsOutput>>>;
};

export type VisitorResponse = {
  __typename?: 'visitorResponse';
  count?: Maybe<Scalars['Int']['output']>;
  visitors?: Maybe<Array<Maybe<Visitor>>>;
};

export type GetAccessibilityReportQueryVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type GetAccessibilityReportQuery = { __typename?: 'Query', getAccessibilityReport?: { __typename?: 'Report', score?: number | null, totalElements?: number | null, siteImg?: string | null, scriptCheckResult?: string | null, issuesByFunction?: any | null, functionalityNames?: Array<string> | null, totalStats?: any | null, axe?: { __typename?: 'axeResult', errors?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, notices?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, warnings?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null, htmlcs?: { __typename?: 'htmlCsResult', errors?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, notices?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, warnings?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null, ByFunctions?: Array<{ __typename?: 'HumanFunctionality', FunctionalityName?: string | null, Errors?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null> | null, techStack?: { __typename?: 'TechStack', technologies: Array<string>, confidence?: string | null, analyzedUrl: string, analyzedAt: string, source?: string | null, categorizedTechnologies: Array<{ __typename?: 'CategorizedTechnology', category: string, technologies: Array<string> }>, accessibilityContext?: { __typename?: 'AccessibilityContext', platform?: string | null, platform_type?: string | null, has_cms?: boolean | null, has_ecommerce?: boolean | null, has_framework?: boolean | null, is_spa?: boolean | null } | null } | null, issues?: Array<{ __typename?: 'Issue', functionality?: string | null, impact?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, screenshotUrl?: string | null }> | null } | null };

export type DeleteAccessibilityReportMutationVariables = Exact<{
  r2_key: Scalars['String']['input'];
}>;


export type DeleteAccessibilityReportMutation = { __typename?: 'Mutation', deleteAccessibilityReport: boolean };

export type FetchAccessibilityReportFromR2QueryVariables = Exact<{
  url: Scalars['String']['input'];
  created_at?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['String']['input']>;
}>;


export type FetchAccessibilityReportFromR2Query = { __typename?: 'Query', fetchAccessibilityReportFromR2: Array<{ __typename?: 'AccessibilityReportTableRow', url: string, r2_key: string, created_at: string, score?: any | null }> };

export type FetchReportByR2KeyQueryVariables = Exact<{
  r2_key: Scalars['String']['input'];
}>;


export type FetchReportByR2KeyQuery = { __typename?: 'Query', fetchReportByR2Key?: { __typename?: 'Report', score?: number | null, totalElements?: number | null, siteImg?: string | null, scriptCheckResult?: string | null, issuesByFunction?: any | null, functionalityNames?: Array<string> | null, totalStats?: any | null, axe?: { __typename?: 'axeResult', errors?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, notices?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, warnings?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null, htmlcs?: { __typename?: 'htmlCsResult', errors?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, notices?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, warnings?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null, ByFunctions?: Array<{ __typename?: 'HumanFunctionality', FunctionalityName?: string | null, Errors?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null> | null, techStack?: { __typename?: 'TechStack', technologies: Array<string>, confidence?: string | null, analyzedUrl: string, analyzedAt: string, source?: string | null, categorizedTechnologies: Array<{ __typename?: 'CategorizedTechnology', category: string, technologies: Array<string> }>, accessibilityContext?: { __typename?: 'AccessibilityContext', platform?: string | null, platform_type?: string | null, has_cms?: boolean | null, has_ecommerce?: boolean | null, has_framework?: boolean | null, is_spa?: boolean | null } | null } | null, issues?: Array<{ __typename?: 'Issue', functionality?: string | null, impact?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, screenshotUrl?: string | null }> | null } | null };

export type GetAccessibilityReportByJobIdQueryVariables = Exact<{
  jobId: Scalars['String']['input'];
}>;


export type GetAccessibilityReportByJobIdQuery = { __typename?: 'Query', getAccessibilityReportByJobId: { __typename?: 'AccessibilityJobStatusResponse', status: string, error?: string | null, result?: { __typename?: 'AccessibilityJobResult', reportData?: { __typename?: 'Report', score?: number | null, siteImg?: string | null, scriptCheckResult?: string | null, issuesByFunction?: any | null, functionalityNames?: Array<string> | null, totalStats?: any | null, techStack?: { __typename?: 'TechStack', technologies: Array<string>, confidence?: string | null, analyzedUrl: string, analyzedAt: string, source?: string | null, categorizedTechnologies: Array<{ __typename?: 'CategorizedTechnology', category: string, technologies: Array<string> }>, accessibilityContext?: { __typename?: 'AccessibilityContext', platform?: string | null, platform_type?: string | null, has_cms?: boolean | null, has_ecommerce?: boolean | null, has_framework?: boolean | null, is_spa?: boolean | null } | null } | null, axe?: { __typename?: 'axeResult', errors?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, notices?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, warnings?: Array<{ __typename?: 'axeOutput', message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, impact?: string | null, description?: string | null, help?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null, htmlcs?: { __typename?: 'htmlCsResult', errors?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, notices?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null, warnings?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null, ByFunctions?: Array<{ __typename?: 'HumanFunctionality', FunctionalityName?: string | null, Errors?: Array<{ __typename?: 'htmlCsOutput', code?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, wcag_code?: string | null, screenshotUrl?: string | null } | null> | null } | null> | null, issues?: Array<{ __typename?: 'Issue', functionality?: string | null, impact?: string | null, message?: string | null, context?: Array<string | null> | null, selectors?: Array<string | null> | null, description?: string | null, recommended_action?: string | null, screenshotUrl?: string | null }> | null } | null, savedReport?: { __typename?: 'SaveReportResponse', key: string, success: boolean, report?: { __typename?: 'AccessibilityReportMeta', id: number, url: string, allowed_sites_id?: number | null, r2_key: string, created_at: string, updated_at: string, score?: any | null } | null } | null } | null } };

export type SaveAccessibilityReportMutationVariables = Exact<{
  report: Scalars['JSON']['input'];
  url: Scalars['String']['input'];
  allowed_sites_id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  score?: InputMaybe<Scalars['JSON']['input']>;
}>;


export type SaveAccessibilityReportMutation = { __typename?: 'Mutation', saveAccessibilityReport: { __typename?: 'SaveReportResponse', success: boolean, key: string, report?: { __typename?: 'AccessibilityReportMeta', id: number, url: string, allowed_sites_id?: number | null, r2_key: string, score?: any | null, created_at: string, updated_at: string } | null } };

export type StartAccessibilityReportJobQueryVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type StartAccessibilityReportJobQuery = { __typename?: 'Query', startAccessibilityReportJob: { __typename?: 'AccessibilityJobResponse', jobId: string } };

export type IsDomainAlreadyAddedQueryVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type IsDomainAlreadyAddedQuery = { __typename?: 'Query', isDomainAlreadyAdded: boolean };

export type ChangePasswordMutationVariables = Exact<{
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ChangePasswordMutation = { __typename?: 'Mutation', changePassword: { __typename?: 'ChangePasswordPayload', token: string } };

export type ForgotPasswordMutationVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type ForgotPasswordMutation = { __typename?: 'Mutation', forgotPassword: boolean };

export type GetProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProfileQuery = { __typename?: 'Query', profileUser: { __typename?: 'User', id: string, email: string, name: string, isActive: boolean, company?: string | null, position?: string | null, avatarUrl?: string | null, invitationToken?: string | null, current_organization_id?: number | null, currentOrganization?: { __typename?: 'Organization', id: string, name: string, domain: string, logo_url?: string | null, settings?: any | null, created_at?: any | null, updated_at?: any | null } | null, currentOrganizationUser?: { __typename?: 'OrganizationUser', id?: string | null, user_id: number, organization_id: number, role?: OrganizationUserRole | null, status?: OrganizationUserStatus | null, created_at?: any | null, updated_at?: any | null, current_workspace_id?: number | null, currentWorkspace?: { __typename?: 'Workspace', id: string, name: string, alias: string } | null } | null } };

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'LoginPayload', token: string, url: string } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type RegisterMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type RegisterMutation = { __typename?: 'Mutation', register: { __typename?: 'RegisterPayload', token: string } };

export type ResendVerificationMutationVariables = Exact<{ [key: string]: never; }>;


export type ResendVerificationMutation = { __typename?: 'Mutation', resendEmail: boolean };

export type ResetPasswordMutationVariables = Exact<{
  token: Scalars['String']['input'];
  password: Scalars['String']['input'];
  confirmPassword: Scalars['String']['input'];
}>;


export type ResetPasswordMutation = { __typename?: 'Mutation', resetPassword: boolean };

export type VerifyTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type VerifyTokenMutation = { __typename?: 'Mutation', verify: boolean };

export type FetchDashboardQueryQueryVariables = Exact<{
  url: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
  endDate: Scalars['String']['input'];
}>;


export type FetchDashboardQueryQuery = { __typename?: 'Query', getSiteVisitorsByURL?: { __typename?: 'visitorResponse', count?: number | null } | null, getImpressionsByURLAndDate?: { __typename?: 'ImpressionList', impressions: Array<{ __typename?: 'Impression', widget_opened: boolean, widget_closed: boolean, createdAt: string, id: number, site_id: number, profileCounts?: any | null } | null> } | null, getEngagementRates?: Array<{ __typename?: 'engagementRate', totalEngagements?: number | null, totalImpressions?: number | null, engagementRate?: number | null, date?: string | null } | null> | null };

export type AnalyzeDomainQueryVariables = Exact<{
  domain: Scalars['String']['input'];
}>;


export type AnalyzeDomainQuery = { __typename?: 'Query', analyzeDomain: { __typename?: 'DomainAnalysisResult', url: string, status: string, insights?: any | null, error?: string | null, timestamp: any } };

export type ChangeOrganizationUserRoleMutationVariables = Exact<{
  userId: Scalars['Int']['input'];
  role: OrganizationUserRole;
}>;


export type ChangeOrganizationUserRoleMutation = { __typename?: 'Mutation', changeOrganizationUserRole?: boolean | null };

export type GetOrganizationByDomainQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrganizationByDomainQuery = { __typename?: 'Query', getOrganizationByDomain?: { __typename?: 'Organization', id: string, name: string, domain: string, favicon?: string | null, logo_url?: string | null, settings?: any | null, created_at?: any | null, updated_at?: any | null } | null };

export type GetOrganizationUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrganizationUsersQuery = { __typename?: 'Query', getOrganizationUsers: Array<{ __typename?: 'OrganizationUser', id?: string | null, user_id: number, organization_id: number, role?: OrganizationUserRole | null, status?: OrganizationUserStatus | null, updated_at?: any | null, invitationId?: number | null, user: { __typename?: 'User', id: string, name: string, email: string, current_organization_id?: number | null, isActive: boolean }, organizations: Array<{ __typename?: 'Organization', id: string, name: string }>, currentOrganization?: { __typename?: 'Organization', id: string, name: string } | null, workspaces: Array<{ __typename?: 'Workspace', name: string, alias: string }> }> };

export type GetUserOrganizationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserOrganizationsQuery = { __typename?: 'Query', getUserOrganizations: Array<{ __typename?: 'Organization', id: string, name: string, domain: string, logo_url?: string | null, settings?: any | null, created_at?: any | null, updated_at?: any | null }> };

export type RemoveUserFromOrganizationMutationVariables = Exact<{
  userId: Scalars['Int']['input'];
}>;


export type RemoveUserFromOrganizationMutation = { __typename?: 'Mutation', removeUserFromOrganization?: boolean | null };

export type SendProofOfEffortToolkitMutationVariables = Exact<{
  input: SendToolkitInput;
}>;


export type SendProofOfEffortToolkitMutation = { __typename?: 'Mutation', sendProofOfEffortToolkit: { __typename?: 'SendToolkitResponse', success: boolean, message: string } };

export type GetPlanBySiteIdAndUserIdQueryVariables = Exact<{
  siteId: Scalars['Int']['input'];
}>;


export type GetPlanBySiteIdAndUserIdQuery = { __typename?: 'Query', getPlanBySiteIdAndUserId?: { __typename?: 'SitesPlanData', id: number, siteId: number, productId: number, priceId: number, subcriptionId: string, customerId: string, isTrial: boolean, expiredAt?: any | null, isActive: boolean, createdAt?: any | null, updatedAt?: any | null, deletedAt?: any | null, siteName: string, productType: string, amount: number, priceType: string } | null };

export type UpdateSitesPlanMutationVariables = Exact<{
  sitesPlanId: Scalars['Int']['input'];
  planName: Scalars['String']['input'];
  billingType: BillingType;
}>;


export type UpdateSitesPlanMutation = { __typename?: 'Mutation', updateSitesPlan: boolean };

export type AddSiteMutationVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type AddSiteMutation = { __typename?: 'Mutation', addSite: string };

export type DeleteSiteMutationVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type DeleteSiteMutation = { __typename?: 'Mutation', deleteSite: number };

export type GetAllUserSitesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllUserSitesQuery = { __typename?: 'Query', getAllUserSites?: Array<{ __typename?: 'Site', id?: number | null, user_id?: number | null, url?: string | null, createAt?: string | null, updatedAt?: string | null, expiredAt?: string | null, trial?: number | null } | null> | null };

export type GetUserSitesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSitesQuery = { __typename?: 'Query', getUserSites?: Array<{ __typename?: 'Site', url?: string | null, id?: number | null, expiredAt?: string | null, trial?: number | null, monitor_enabled?: boolean | null, status?: string | null, monitor_priority?: number | null, last_monitor_check?: string | null, is_currently_down?: number | null, monitor_consecutive_fails?: number | null } | null> | null };

export type ToggleSiteMonitoringMutationVariables = Exact<{
  siteId: Scalars['Int']['input'];
  enabled: Scalars['Boolean']['input'];
}>;


export type ToggleSiteMonitoringMutation = { __typename?: 'Mutation', toggleSiteMonitoring: boolean };

export type UpdateSiteMutationVariables = Exact<{
  url: Scalars['String']['input'];
  siteId: Scalars['Int']['input'];
}>;


export type UpdateSiteMutation = { __typename?: 'Mutation', changeURL?: string | null };

export type TranslateStatementMutationVariables = Exact<{
  content: Scalars['String']['input'];
  targetLanguage: Scalars['String']['input'];
  languageCode: Scalars['String']['input'];
  context?: InputMaybe<Scalars['String']['input']>;
}>;


export type TranslateStatementMutation = { __typename?: 'Mutation', translateStatement: { __typename?: 'TranslationResponse', success: boolean, translatedContent?: string | null, error?: string | null, languageCode: string } };

export type ChangeCurrentOrganizationMutationVariables = Exact<{
  organizationId: Scalars['Int']['input'];
  userId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ChangeCurrentOrganizationMutation = { __typename?: 'Mutation', changeCurrentOrganization: boolean };

export type ChangeCurrentWorkspaceMutationVariables = Exact<{
  workspaceId?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ChangeCurrentWorkspaceMutation = { __typename?: 'Mutation', changeCurrentWorkspace: boolean };

export type IsEmailAlreadyRegisteredQueryVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type IsEmailAlreadyRegisteredQuery = { __typename?: 'Query', isEmailAlreadyRegistered: boolean };

export type DeleteAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount: boolean };

export type GetLicenseOwnerInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLicenseOwnerInfoQuery = { __typename?: 'Query', getLicenseOwnerInfo: { __typename?: 'LicenseOwnerInfo', id: string, name: string, license_owner_email?: string | null, phone_number?: string | null } };

export type UpdateLicenseOwnerInfoMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
  license_owner_email?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateLicenseOwnerInfoMutation = { __typename?: 'Mutation', updateLicenseOwnerInfo: boolean };

export type UpdateProfileMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateProfileMutation = { __typename?: 'Mutation', updateProfile: boolean };

export type ChangeWorkspaceMemberRoleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  role: WorkspaceUserRole;
}>;


export type ChangeWorkspaceMemberRoleMutation = { __typename?: 'Mutation', changeWorkspaceMemberRole: boolean };

export type CreateWorkspaceMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type CreateWorkspaceMutation = { __typename?: 'Mutation', createWorkspace: { __typename?: 'Workspace', id: string, name: string, alias: string, organization_id: string } };

export type DeleteWorkspaceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteWorkspaceMutation = { __typename?: 'Mutation', deleteWorkspace: boolean };

export type GetOrganizationWorkspacesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrganizationWorkspacesQuery = { __typename?: 'Query', getOrganizationWorkspaces: Array<{ __typename?: 'Workspace', id: string, name: string, alias: string, domains: Array<{ __typename?: 'AllowedSite', id: string, url: string }>, members: Array<{ __typename?: 'WorkspaceUser', id: string, user_id: number, workspace_id: number, role: string, status: string, created_at?: any | null, updated_at?: any | null, user?: { __typename?: 'User', id: string, name: string, email: string, avatarUrl?: string | null } | null }> }> };

export type GetUserWorkspacesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserWorkspacesQuery = { __typename?: 'Query', getUserWorkspaces: Array<{ __typename?: 'Workspace', id: string, name: string, alias: string, organization_id: string }> };

export type GetWorkspaceByAliasQueryVariables = Exact<{
  alias: Scalars['String']['input'];
}>;


export type GetWorkspaceByAliasQuery = { __typename?: 'Query', getWorkspaceByAlias?: { __typename?: 'Workspace', id: string, name: string, alias: string, organization_id: string } | null };

export type GetWorkspaceInvitationsByAliasQueryVariables = Exact<{
  alias: Scalars['String']['input'];
}>;


export type GetWorkspaceInvitationsByAliasQuery = { __typename?: 'Query', getWorkspaceInvitationsByAlias: Array<{ __typename?: 'WorkspaceInvitationDetails', id?: string | null, invited_by: string, email: string, status: WorkspaceInvitationStatus, workspace_id?: string | null, created_at?: any | null }> };

export type GetWorkspaceMembersByAliasQueryVariables = Exact<{
  alias: Scalars['String']['input'];
}>;


export type GetWorkspaceMembersByAliasQuery = { __typename?: 'Query', getWorkspaceMembersByAlias: Array<{ __typename?: 'WorkspaceUser', id: string, user_id: number, workspace_id: number, role: string, status: string, created_at?: any | null, updated_at?: any | null, invitationId?: number | null, user?: { __typename?: 'User', id: string, name: string, email: string, avatarUrl?: string | null } | null }> };

export type InviteWorkspaceMemberMutationVariables = Exact<{
  email: Scalars['String']['input'];
  workspaceId: Scalars['ID']['input'];
  role: WorkspaceUserRole;
}>;


export type InviteWorkspaceMemberMutation = { __typename?: 'Mutation', inviteWorkspaceMember: { __typename?: 'WorkspaceInvitation', user_id?: string | null, user_name?: string | null, user_email?: string | null, status?: WorkspaceUserStatus | null } };

export type InviteMemberMutationVariables = Exact<{
  type: JoinWorkspaceType;
  token: Scalars['String']['input'];
}>;


export type InviteMemberMutation = { __typename?: 'Mutation', joinWorkspace: boolean };

export type RemoveAllUserInvitationsMutationVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type RemoveAllUserInvitationsMutation = { __typename?: 'Mutation', removeAllUserInvitations: boolean };

export type RemoveWorkspaceInvitationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveWorkspaceInvitationMutation = { __typename?: 'Mutation', removeWorkspaceInvitation: boolean };

export type RemoveWorkspaceMemberMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveWorkspaceMemberMutation = { __typename?: 'Mutation', removeWorkspaceMember: boolean };

export type UpdateWorkspaceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  allowedSiteIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type UpdateWorkspaceMutation = { __typename?: 'Mutation', updateWorkspace: { __typename?: 'Workspace', id: string, name: string, alias: string, organization_id: string, domains: Array<{ __typename?: 'AllowedSite', id: string, url: string }> } };

export type VerifyInvitationTokenQueryVariables = Exact<{
  invitationToken: Scalars['String']['input'];
}>;


export type VerifyInvitationTokenQuery = { __typename?: 'Query', verifyWorkspaceInvitationToken: { __typename?: 'VerifyWorkspaceInvitationResponse', workspace_name: string, invited_by: string } };


export const GetAccessibilityReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getAccessibilityReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAccessibilityReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"axe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"warnings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"htmlcs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"warnings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"totalElements"}},{"kind":"Field","name":{"kind":"Name","value":"siteImg"}},{"kind":"Field","name":{"kind":"Name","value":"ByFunctions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"FunctionalityName"}},{"kind":"Field","name":{"kind":"Name","value":"Errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"scriptCheckResult"}},{"kind":"Field","name":{"kind":"Name","value":"techStack"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"technologies"}},{"kind":"Field","name":{"kind":"Name","value":"categorizedTechnologies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"technologies"}}]}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"platform_type"}},{"kind":"Field","name":{"kind":"Name","value":"has_cms"}},{"kind":"Field","name":{"kind":"Name","value":"has_ecommerce"}},{"kind":"Field","name":{"kind":"Name","value":"has_framework"}},{"kind":"Field","name":{"kind":"Name","value":"is_spa"}}]}},{"kind":"Field","name":{"kind":"Name","value":"analyzedUrl"}},{"kind":"Field","name":{"kind":"Name","value":"analyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"source"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"functionality"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issuesByFunction"}},{"kind":"Field","name":{"kind":"Name","value":"functionalityNames"}},{"kind":"Field","name":{"kind":"Name","value":"totalStats"}}]}}]}}]} as unknown as DocumentNode<GetAccessibilityReportQuery, GetAccessibilityReportQueryVariables>;
export const DeleteAccessibilityReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteAccessibilityReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"r2_key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccessibilityReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"r2_key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"r2_key"}}}]}]}}]} as unknown as DocumentNode<DeleteAccessibilityReportMutation, DeleteAccessibilityReportMutationVariables>;
export const FetchAccessibilityReportFromR2Document = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"fetchAccessibilityReportFromR2"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"created_at"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"updated_at"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchAccessibilityReportFromR2"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}},{"kind":"Argument","name":{"kind":"Name","value":"created_at"},"value":{"kind":"Variable","name":{"kind":"Name","value":"created_at"}}},{"kind":"Argument","name":{"kind":"Name","value":"updated_at"},"value":{"kind":"Variable","name":{"kind":"Name","value":"updated_at"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"r2_key"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}}]}}]} as unknown as DocumentNode<FetchAccessibilityReportFromR2Query, FetchAccessibilityReportFromR2QueryVariables>;
export const FetchReportByR2KeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"fetchReportByR2Key"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"r2_key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchReportByR2Key"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"r2_key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"r2_key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"axe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"warnings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"htmlcs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"warnings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"totalElements"}},{"kind":"Field","name":{"kind":"Name","value":"siteImg"}},{"kind":"Field","name":{"kind":"Name","value":"ByFunctions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"FunctionalityName"}},{"kind":"Field","name":{"kind":"Name","value":"Errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"scriptCheckResult"}},{"kind":"Field","name":{"kind":"Name","value":"techStack"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"technologies"}},{"kind":"Field","name":{"kind":"Name","value":"categorizedTechnologies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"technologies"}}]}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"platform_type"}},{"kind":"Field","name":{"kind":"Name","value":"has_cms"}},{"kind":"Field","name":{"kind":"Name","value":"has_ecommerce"}},{"kind":"Field","name":{"kind":"Name","value":"has_framework"}},{"kind":"Field","name":{"kind":"Name","value":"is_spa"}}]}},{"kind":"Field","name":{"kind":"Name","value":"analyzedUrl"}},{"kind":"Field","name":{"kind":"Name","value":"analyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"source"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"functionality"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issuesByFunction"}},{"kind":"Field","name":{"kind":"Name","value":"functionalityNames"}},{"kind":"Field","name":{"kind":"Name","value":"totalStats"}}]}}]}}]} as unknown as DocumentNode<FetchReportByR2KeyQuery, FetchReportByR2KeyQueryVariables>;
export const GetAccessibilityReportByJobIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getAccessibilityReportByJobId"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jobId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAccessibilityReportByJobId"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"jobId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jobId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"siteImg"}},{"kind":"Field","name":{"kind":"Name","value":"techStack"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"technologies"}},{"kind":"Field","name":{"kind":"Name","value":"categorizedTechnologies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"technologies"}}]}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"platform_type"}},{"kind":"Field","name":{"kind":"Name","value":"has_cms"}},{"kind":"Field","name":{"kind":"Name","value":"has_ecommerce"}},{"kind":"Field","name":{"kind":"Name","value":"has_framework"}},{"kind":"Field","name":{"kind":"Name","value":"is_spa"}}]}},{"kind":"Field","name":{"kind":"Name","value":"analyzedUrl"}},{"kind":"Field","name":{"kind":"Name","value":"analyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"source"}}]}},{"kind":"Field","name":{"kind":"Name","value":"axe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"warnings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"help"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"htmlcs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"warnings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"ByFunctions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"FunctionalityName"}},{"kind":"Field","name":{"kind":"Name","value":"Errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"wcag_code"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"scriptCheckResult"}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"functionality"}},{"kind":"Field","name":{"kind":"Name","value":"impact"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"selectors"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"recommended_action"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issuesByFunction"}},{"kind":"Field","name":{"kind":"Name","value":"functionalityNames"}},{"kind":"Field","name":{"kind":"Name","value":"totalStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"savedReport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"report"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"allowed_sites_id"}},{"kind":"Field","name":{"kind":"Name","value":"r2_key"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<GetAccessibilityReportByJobIdQuery, GetAccessibilityReportByJobIdQueryVariables>;
export const SaveAccessibilityReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveAccessibilityReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"report"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"allowed_sites_id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"score"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveAccessibilityReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"report"},"value":{"kind":"Variable","name":{"kind":"Name","value":"report"}}},{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}},{"kind":"Argument","name":{"kind":"Name","value":"allowed_sites_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"allowed_sites_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}},{"kind":"Argument","name":{"kind":"Name","value":"score"},"value":{"kind":"Variable","name":{"kind":"Name","value":"score"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"report"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"allowed_sites_id"}},{"kind":"Field","name":{"kind":"Name","value":"r2_key"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]}}]}}]} as unknown as DocumentNode<SaveAccessibilityReportMutation, SaveAccessibilityReportMutationVariables>;
export const StartAccessibilityReportJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"startAccessibilityReportJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startAccessibilityReportJob"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobId"}}]}}]}}]} as unknown as DocumentNode<StartAccessibilityReportJobQuery, StartAccessibilityReportJobQueryVariables>;
export const IsDomainAlreadyAddedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IsDomainAlreadyAdded"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isDomainAlreadyAdded"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}]}]}}]} as unknown as DocumentNode<IsDomainAlreadyAddedQuery, IsDomainAlreadyAddedQueryVariables>;
export const ChangePasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"currentPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]}}]} as unknown as DocumentNode<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const ForgotPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ForgotPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forgotPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}]}]}}]} as unknown as DocumentNode<ForgotPasswordMutation, ForgotPasswordMutationVariables>;
export const GetProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profileUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"invitationToken"}},{"kind":"Field","name":{"kind":"Name","value":"current_organization_id"}},{"kind":"Field","name":{"kind":"Name","value":"currentOrganization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"settings"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}},{"kind":"Field","name":{"kind":"Name","value":"currentOrganizationUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"organization_id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"current_workspace_id"}},{"kind":"Field","name":{"kind":"Name","value":"currentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetProfileQuery, GetProfileQueryVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"}}]}}]} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]}}]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const ResendVerificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResendVerification"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resendEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"EnumValue","value":"VERIFY_EMAIL"}}]}]}}]} as unknown as DocumentNode<ResendVerificationMutation, ResendVerificationMutationVariables>;
export const ResetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"confirmPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"confirmPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"confirmPassword"}}}]}]}}]} as unknown as DocumentNode<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const VerifyTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verify"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}]}}]} as unknown as DocumentNode<VerifyTokenMutation, VerifyTokenMutationVariables>;
export const FetchDashboardQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"fetchDashboardQuery"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getSiteVisitorsByURL"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"getImpressionsByURLAndDate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"impressions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"widget_opened"}},{"kind":"Field","name":{"kind":"Name","value":"widget_closed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"site_id"}},{"kind":"Field","name":{"kind":"Name","value":"profileCounts"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"getEngagementRates"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalEngagements"}},{"kind":"Field","name":{"kind":"Name","value":"totalImpressions"}},{"kind":"Field","name":{"kind":"Name","value":"engagementRate"}},{"kind":"Field","name":{"kind":"Name","value":"date"}}]}}]}}]} as unknown as DocumentNode<FetchDashboardQueryQuery, FetchDashboardQueryQueryVariables>;
export const AnalyzeDomainDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AnalyzeDomain"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"domain"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyzeDomain"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"domain"},"value":{"kind":"Variable","name":{"kind":"Name","value":"domain"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"insights"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}}]}}]} as unknown as DocumentNode<AnalyzeDomainQuery, AnalyzeDomainQueryVariables>;
export const ChangeOrganizationUserRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeOrganizationUserRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrganizationUserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeOrganizationUserRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}]}]}}]} as unknown as DocumentNode<ChangeOrganizationUserRoleMutation, ChangeOrganizationUserRoleMutationVariables>;
export const GetOrganizationByDomainDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrganizationByDomain"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getOrganizationByDomain"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"favicon"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"settings"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]}}]} as unknown as DocumentNode<GetOrganizationByDomainQuery, GetOrganizationByDomainQueryVariables>;
export const GetOrganizationUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrganizationUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getOrganizationUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"organization_id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"invitationId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"current_organization_id"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"currentOrganization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workspaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}}]}}]}}]}}]} as unknown as DocumentNode<GetOrganizationUsersQuery, GetOrganizationUsersQueryVariables>;
export const GetUserOrganizationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getUserOrganizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserOrganizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"settings"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]}}]} as unknown as DocumentNode<GetUserOrganizationsQuery, GetUserOrganizationsQueryVariables>;
export const RemoveUserFromOrganizationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveUserFromOrganization"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeUserFromOrganization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}]}]}}]} as unknown as DocumentNode<RemoveUserFromOrganizationMutation, RemoveUserFromOrganizationMutationVariables>;
export const SendProofOfEffortToolkitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendProofOfEffortToolkit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SendToolkitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendProofOfEffortToolkit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SendProofOfEffortToolkitMutation, SendProofOfEffortToolkitMutationVariables>;
export const GetPlanBySiteIdAndUserIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPlanBySiteIdAndUserId"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPlanBySiteIdAndUserId"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"subcriptionId"}},{"kind":"Field","name":{"kind":"Name","value":"customerId"}},{"kind":"Field","name":{"kind":"Name","value":"isTrial"}},{"kind":"Field","name":{"kind":"Name","value":"expiredAt"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}},{"kind":"Field","name":{"kind":"Name","value":"siteName"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"priceType"}}]}}]}}]} as unknown as DocumentNode<GetPlanBySiteIdAndUserIdQuery, GetPlanBySiteIdAndUserIdQueryVariables>;
export const UpdateSitesPlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSitesPlan"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sitesPlanId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"planName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"billingType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BillingType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSitesPlan"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sitesPlanId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sitesPlanId"}}},{"kind":"Argument","name":{"kind":"Name","value":"planName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"planName"}}},{"kind":"Argument","name":{"kind":"Name","value":"billingType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"billingType"}}}]}]}}]} as unknown as DocumentNode<UpdateSitesPlanMutation, UpdateSitesPlanMutationVariables>;
export const AddSiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"addSite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addSite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}]}]}}]} as unknown as DocumentNode<AddSiteMutation, AddSiteMutationVariables>;
export const DeleteSiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteSite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}]}]}}]} as unknown as DocumentNode<DeleteSiteMutation, DeleteSiteMutationVariables>;
export const GetAllUserSitesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllUserSites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAllUserSites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiredAt"}},{"kind":"Field","name":{"kind":"Name","value":"trial"}}]}}]}}]} as unknown as DocumentNode<GetAllUserSitesQuery, GetAllUserSitesQueryVariables>;
export const GetUserSitesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserSites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"expiredAt"}},{"kind":"Field","name":{"kind":"Name","value":"trial"}},{"kind":"Field","name":{"kind":"Name","value":"monitor_enabled"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"monitor_priority"}},{"kind":"Field","name":{"kind":"Name","value":"last_monitor_check"}},{"kind":"Field","name":{"kind":"Name","value":"is_currently_down"}},{"kind":"Field","name":{"kind":"Name","value":"monitor_consecutive_fails"}}]}}]}}]} as unknown as DocumentNode<GetUserSitesQuery, GetUserSitesQueryVariables>;
export const ToggleSiteMonitoringDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ToggleSiteMonitoring"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"enabled"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"toggleSiteMonitoring"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"enabled"},"value":{"kind":"Variable","name":{"kind":"Name","value":"enabled"}}}]}]}}]} as unknown as DocumentNode<ToggleSiteMonitoringMutation, ToggleSiteMonitoringMutationVariables>;
export const UpdateSiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"updateSite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeURL"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"newURL"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}},{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}]}]}}]} as unknown as DocumentNode<UpdateSiteMutation, UpdateSiteMutationVariables>;
export const TranslateStatementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TranslateStatement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetLanguage"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"languageCode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"context"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"translateStatement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}},{"kind":"Argument","name":{"kind":"Name","value":"targetLanguage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetLanguage"}}},{"kind":"Argument","name":{"kind":"Name","value":"languageCode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"languageCode"}}},{"kind":"Argument","name":{"kind":"Name","value":"context"},"value":{"kind":"Variable","name":{"kind":"Name","value":"context"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"translatedContent"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"languageCode"}}]}}]}}]} as unknown as DocumentNode<TranslateStatementMutation, TranslateStatementMutationVariables>;
export const ChangeCurrentOrganizationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeCurrentOrganization"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"organizationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeCurrentOrganization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"organizationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"organizationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}]}]}}]} as unknown as DocumentNode<ChangeCurrentOrganizationMutation, ChangeCurrentOrganizationMutationVariables>;
export const ChangeCurrentWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeCurrentWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeCurrentWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}]}]}}]} as unknown as DocumentNode<ChangeCurrentWorkspaceMutation, ChangeCurrentWorkspaceMutationVariables>;
export const IsEmailAlreadyRegisteredDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IsEmailAlreadyRegistered"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isEmailAlreadyRegistered"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}]}]}}]} as unknown as DocumentNode<IsEmailAlreadyRegisteredQuery, IsEmailAlreadyRegisteredQueryVariables>;
export const DeleteAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccount"}}]}}]} as unknown as DocumentNode<DeleteAccountMutation, DeleteAccountMutationVariables>;
export const GetLicenseOwnerInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLicenseOwnerInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLicenseOwnerInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"license_owner_email"}},{"kind":"Field","name":{"kind":"Name","value":"phone_number"}}]}}]}}]} as unknown as DocumentNode<GetLicenseOwnerInfoQuery, GetLicenseOwnerInfoQueryVariables>;
export const UpdateLicenseOwnerInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLicenseOwnerInfo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"license_owner_email"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"phone_number"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLicenseOwnerInfo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"license_owner_email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"license_owner_email"}}},{"kind":"Argument","name":{"kind":"Name","value":"phone_number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"phone_number"}}}]}]}}]} as unknown as DocumentNode<UpdateLicenseOwnerInfoMutation, UpdateLicenseOwnerInfoMutationVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"position"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"company"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company"}}},{"kind":"Argument","name":{"kind":"Name","value":"position"},"value":{"kind":"Variable","name":{"kind":"Name","value":"position"}}}]}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const ChangeWorkspaceMemberRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeWorkspaceMemberRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkspaceUserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeWorkspaceMemberRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}]}]}}]} as unknown as DocumentNode<ChangeWorkspaceMemberRoleMutation, ChangeWorkspaceMemberRoleMutationVariables>;
export const CreateWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"organization_id"}}]}}]}}]} as unknown as DocumentNode<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export const DeleteWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteWorkspaceMutation, DeleteWorkspaceMutationVariables>;
export const GetOrganizationWorkspacesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrganizationWorkspaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getOrganizationWorkspaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"domains"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"workspace_id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrganizationWorkspacesQuery, GetOrganizationWorkspacesQueryVariables>;
export const GetUserWorkspacesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getUserWorkspaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserWorkspaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"organization_id"}}]}}]}}]} as unknown as DocumentNode<GetUserWorkspacesQuery, GetUserWorkspacesQueryVariables>;
export const GetWorkspaceByAliasDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkspaceByAlias"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"alias"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getWorkspaceByAlias"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"alias"},"value":{"kind":"Variable","name":{"kind":"Name","value":"alias"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"organization_id"}}]}}]}}]} as unknown as DocumentNode<GetWorkspaceByAliasQuery, GetWorkspaceByAliasQueryVariables>;
export const GetWorkspaceInvitationsByAliasDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkspaceInvitationsByAlias"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"alias"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getWorkspaceInvitationsByAlias"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"alias"},"value":{"kind":"Variable","name":{"kind":"Name","value":"alias"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"invited_by"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"workspace_id"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]}}]} as unknown as DocumentNode<GetWorkspaceInvitationsByAliasQuery, GetWorkspaceInvitationsByAliasQueryVariables>;
export const GetWorkspaceMembersByAliasDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkspaceMembersByAlias"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"alias"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getWorkspaceMembersByAlias"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"alias"},"value":{"kind":"Variable","name":{"kind":"Name","value":"alias"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"workspace_id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"invitationId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorkspaceMembersByAliasQuery, GetWorkspaceMembersByAliasQueryVariables>;
export const InviteWorkspaceMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InviteWorkspaceMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkspaceUserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inviteWorkspaceMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"user_name"}},{"kind":"Field","name":{"kind":"Name","value":"user_email"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<InviteWorkspaceMemberMutation, InviteWorkspaceMemberMutationVariables>;
export const InviteMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InviteMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JoinWorkspaceType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"joinWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}]}}]} as unknown as DocumentNode<InviteMemberMutation, InviteMemberMutationVariables>;
export const RemoveAllUserInvitationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveAllUserInvitations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeAllUserInvitations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}]}]}}]} as unknown as DocumentNode<RemoveAllUserInvitationsMutation, RemoveAllUserInvitationsMutationVariables>;
export const RemoveWorkspaceInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveWorkspaceInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeWorkspaceInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<RemoveWorkspaceInvitationMutation, RemoveWorkspaceInvitationMutationVariables>;
export const RemoveWorkspaceMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveWorkspaceMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeWorkspaceMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<RemoveWorkspaceMemberMutation, RemoveWorkspaceMemberMutationVariables>;
export const UpdateWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"allowedSiteIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"allowedSiteIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"allowedSiteIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"alias"}},{"kind":"Field","name":{"kind":"Name","value":"organization_id"}},{"kind":"Field","name":{"kind":"Name","value":"domains"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateWorkspaceMutation, UpdateWorkspaceMutationVariables>;
export const VerifyInvitationTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VerifyInvitationToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"invitationToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyWorkspaceInvitationToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"invitationToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"invitationToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workspace_name"}},{"kind":"Field","name":{"kind":"Name","value":"invited_by"}}]}}]}}]} as unknown as DocumentNode<VerifyInvitationTokenQuery, VerifyInvitationTokenQueryVariables>;