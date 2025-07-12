import { gql } from 'apollo-server-express';

import { UserSchema } from './schemas/user.schema';
import { UserPlanSchema } from './schemas/user-plan.schema';
import { ImpressionsSchema } from './schemas/impressions.schema';
import { AllowedSitesSchema } from './schemas/allowedSites.schema';
import { UniqueVisitorSchema } from './schemas/uniqueVisitor.schema';
import { AccessibilitySchema } from './schemas/accessibilityReport.schema';
import { UniqueTokenSchema } from './schemas/uniqueToken.schema';
import { SitesPlanSchema } from './schemas/sitesPlan.schema';
import { reportProblemSchema } from './schemas/reportProblem.schema';
import { TranslationSchema } from './schemas/translation.schema';

const rootSchema = gql`
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
`;

export default [rootSchema, UserSchema, UserPlanSchema, ImpressionsSchema, AllowedSitesSchema, UniqueVisitorSchema, AccessibilitySchema, UniqueTokenSchema, SitesPlanSchema, reportProblemSchema, TranslationSchema];
