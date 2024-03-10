import userResolves from './resolvers/user.resolver';
import userPlanResolves from './resolvers/user-plan.resolver';
import teamResolves from './resolvers/team.resolver';
import documentResolves from './resolvers/document.resolver';
import allowedSitesResolves from './resolvers/allowedSites.resolver';
import uniqueVisitorResolves from './resolvers/uniqueVisitor.resolver';
import impressionResolves from './resolvers/impressions.resolver';
import accessibilityResolves from './resolvers/accessibilityReport.resolver';
import uniqueTokenResolves from './resolvers/uniqueToken.resolver';
import sitePlanResolver from './resolvers/site-plan.resolver';

export default [userResolves, userPlanResolves, teamResolves, documentResolves, allowedSitesResolves, uniqueVisitorResolves,impressionResolves, uniqueTokenResolves, sitePlanResolver ];
