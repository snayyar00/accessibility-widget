import accessibilityResolves from './resolvers/accessibilityReport.resolver'
import allowedSitesResolves from './resolvers/allowedSites.resolver'
import impressionResolves from './resolvers/impressions.resolver'
import organizationResolver from './resolvers/organization.resolver'
import problemReportResolves from './resolvers/reportProblem.resolver'
import proofOfEffortResolves from './resolvers/proofOfEffort.resolver'
import sitePlanResolves from './resolvers/site-plan.resolver'
import translationResolves from './resolvers/translation.resolver'
import uniqueTokenResolver from './resolvers/uniqueToken.resolver'
import uniqueVisitorResolves from './resolvers/uniqueVisitor.resolver'
import userResolves from './resolvers/user.resolver'

// eslint-disable-next-line import/no-anonymous-default-export
export default [userResolves, allowedSitesResolves, uniqueVisitorResolves, impressionResolves, accessibilityResolves, sitePlanResolves, problemReportResolves, organizationResolver, translationResolves, uniqueTokenResolver, proofOfEffortResolves]
