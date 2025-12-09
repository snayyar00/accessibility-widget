import accessibilityResolves from './resolvers/accessibilityReport.resolver'
import { aiReadinessResolvers } from './resolvers/aiReadiness.resolver'
import allowedSitesResolves from './resolvers/allowedSites.resolver'
import bulkEmailResolvers from './resolvers/bulkEmail.resolver'
import domainAnalysisResolves from './resolvers/domainAnalysis.resolver'
import impressionResolves from './resolvers/impressions.resolver'
import invitationResolvers from './resolvers/invitation.resolver'
import organizationResolver from './resolvers/organization.resolver'
import proofOfEffortResolves from './resolvers/proofOfEffort.resolver'
import problemReportResolves from './resolvers/reportProblem.resolver'
import sitePlanResolves from './resolvers/site-plan.resolver'
import translationResolves from './resolvers/translation.resolver'
import uniqueTokenResolver from './resolvers/uniqueToken.resolver'
import uniqueVisitorResolves from './resolvers/uniqueVisitor.resolver'
import userResolves from './resolvers/user.resolver'
import widgetResolvers from './resolvers/widget.resolver'
import workspaceResolvers from './resolvers/workspace.resolver'
import serviceRequestResolvers from './resolvers/serviceRequest.resolver'
import { getGraphQLUploadType } from './upload'

export function createResolvers() {
  return [
    {
      Upload: getGraphQLUploadType(),
    },
    userResolves,
    allowedSitesResolves,
    uniqueVisitorResolves,
    impressionResolves,
    accessibilityResolves,
    sitePlanResolves,
    problemReportResolves,
    organizationResolver,
    translationResolves,
    uniqueTokenResolver,
    proofOfEffortResolves,
    widgetResolvers,
    domainAnalysisResolves,
    workspaceResolvers,
    invitationResolvers,
    aiReadinessResolvers,
    serviceRequestResolvers,
    bulkEmailResolvers,
  ]
}

// For backward compatibility - will be called after initialization
export default createResolvers
