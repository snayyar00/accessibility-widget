import userResolves from './resolvers/user.resolver';
import userPlanResolves from './resolvers/user-plan.resolver';
import allowedSitesResolves from './resolvers/allowedSites.resolver';
import uniqueVisitorResolves from './resolvers/uniqueVisitor.resolver';
import impressionResolves from './resolvers/impressions.resolver';
import accessibilityResolves from './resolvers/accessibilityReport.resolver';
import sitePlanResolves from './resolvers/site-plan.resolver';
import problemReportResolves from './resolvers/reportProblem.resolver';
import translationResolves from './resolvers/translation.resolver';
import uniqueTokenResolver from './resolvers/uniqueToken.resolver';

export default [userResolves, userPlanResolves, allowedSitesResolves, uniqueVisitorResolves, impressionResolves, accessibilityResolves, sitePlanResolves, problemReportResolves, translationResolves, uniqueTokenResolver];
