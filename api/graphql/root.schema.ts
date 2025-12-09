import { AccessibilitySchema } from './schemas/accessibilityReport.schema'
import { aiReadinessSchema } from './schemas/aiReadiness.schema'
import { AllowedSitesSchema } from './schemas/allowedSites.schema'
import bulkEmailSchema from './schemas/bulkEmail.schema'
import { DomainAnalysisSchema } from './schemas/domainAnalysis.schema'
import { ImpressionsSchema } from './schemas/impressions.schema'
import { InvitationSchema } from './schemas/invitation.schema'
import { OrganizationSchema } from './schemas/organization.schema'
import proofOfEffortSchema from './schemas/proofOfEffort.schema'
import { reportProblemSchema } from './schemas/reportProblem.schema'
import { SitesPlanSchema } from './schemas/sitesPlan.schema'
import { TranslationSchema } from './schemas/translation.schema'
import { UniqueTokenSchema } from './schemas/uniqueToken.schema'
import { UniqueVisitorSchema } from './schemas/uniqueVisitor.schema'
import { UserSchema } from './schemas/user.schema'
import { widgetTypeDefs } from './schemas/widget.schema'
import { WorkspaceSchema } from './schemas/workspace.schema'
import serviceRequestSchema from './schemas/serviceRequest.schema'

const rootSchema = `
  scalar Date
  scalar JSON
  scalar Upload

  type Query {
    _: Boolean
  }

  type Mutation {
    _: Boolean
  }

  type Subscription {
    _: Boolean
  }
`

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  rootSchema,
  UserSchema,
  ImpressionsSchema,
  AllowedSitesSchema,
  UniqueVisitorSchema,
  AccessibilitySchema,
  UniqueTokenSchema,
  SitesPlanSchema,
  reportProblemSchema,
  OrganizationSchema,
  TranslationSchema,
  proofOfEffortSchema,
  widgetTypeDefs,
  DomainAnalysisSchema,
  WorkspaceSchema,
  InvitationSchema,
  aiReadinessSchema,
  serviceRequestSchema,
  bulkEmailSchema,
]
