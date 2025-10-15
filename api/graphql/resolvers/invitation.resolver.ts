import { combineResolvers } from 'graphql-resolvers'

import { OrganizationUserRole } from '../../constants/organization.constant'
import { WorkspaceUserRole } from '../../constants/workspace.constant'
import { inviteUser, InviteUserType } from '../../services/invitations/invitations.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

type InviteUserInput = {
  type: InviteUserType
  email: string
  role: string
  workspaceId?: string
}

const resolvers = {
  Mutation: {
    inviteUser: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { type, email, role, workspaceId }: InviteUserInput, { user, allowedFrontendUrl }) =>
      inviteUser(user, {
        type,
        invitee_email: email,
        role: role as WorkspaceUserRole | OrganizationUserRole,
        allowedFrontendUrl,
        workspace_id: workspaceId ? parseInt(workspaceId, 10) : undefined,
      }),
    ),
  },
}

export default resolvers
