import { AccessibilitySchema } from './schemas/accessibilityReport.schema'
import { AllowedSitesSchema } from './schemas/allowedSites.schema'
import { ImpressionsSchema } from './schemas/impressions.schema'
import { OrganizationSchema } from './schemas/organization.schema'
import { reportProblemSchema } from './schemas/reportProblem.schema'
import { SitesPlanSchema } from './schemas/sitesPlan.schema'
import { TranslationSchema } from './schemas/translation.schema'
import { UniqueTokenSchema } from './schemas/uniqueToken.schema'
import { UniqueVisitorSchema } from './schemas/uniqueVisitor.schema'
import { UserSchema } from './schemas/user.schema'
import proofOfEffortSchema from './schemas/proofOfEffort.schema'

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
export default [rootSchema, UserSchema, ImpressionsSchema, AllowedSitesSchema, UniqueVisitorSchema, AccessibilitySchema, UniqueTokenSchema, SitesPlanSchema, reportProblemSchema, OrganizationSchema, TranslationSchema, proofOfEffortSchema]
