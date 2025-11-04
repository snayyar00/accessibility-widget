import { combineResolvers } from 'graphql-resolvers'

import { OrganizationUserRole } from '../../constants/organization.constant'
import { WorkspaceUserRole } from '../../constants/workspace.constant'
import { acceptInvitation } from '../../services/invitations/acceptInvitation'
import { inviteUser, InviteUserType } from '../../services/invitations/invitations.service'
import { verifyInvitation, VerifyInvitationResponse } from '../../services/invitations/verifyInvitation.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

type InviteUserInput = {
  type: InviteUserType
  email: string
  role: string
  workspaceId?: string
}

type Token = {
  invitationToken: string
}

type JoinInvitationInput = {
  token: string
  type?: 'accept' | 'decline'
}

const resolvers = {
  Query: {
    verifyInvitationToken: combineResolvers(allowedOrganization, (_: unknown, { invitationToken }: Token, { user }): Promise<VerifyInvitationResponse> => verifyInvitation(invitationToken, user)),
  },

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

    joinInvitation: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { token, type }: JoinInvitationInput, { user }) => acceptInvitation(token, type, user)),
  },
}

export default resolvers
