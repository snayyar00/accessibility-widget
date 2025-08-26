import { combineResolvers } from 'graphql-resolvers'

import { WorkspaceUserRole } from '../../constants/workspace.constant'
import { GraphQLContext } from '../../graphql/types'
import { findUser } from '../../repository/user.repository'
import { WorkspaceWithDomains } from '../../repository/workspace_allowed_sites.repository'
import { GetDetailWorkspaceInvitation } from '../../repository/workspace_invitations.repository'
import { acceptInvitation } from '../../services/workspaces/acceptInvitation'
import { verifyInvitationToken } from '../../services/workspaces/verifyInvitationToken.service'
import { getWorkspaceDomainsService } from '../../services/workspaces/workspaceDomains.service'
import { createWorkspace, deleteWorkspace, getAllWorkspaces, getWorkspaceMembers, inviteWorkspaceMember, updateWorkspace } from '../../services/workspaces/workspaces.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

type Token = {
  invitationToken: string
}

type WorkspaceInput = {
  id?: number
  name?: string
  allowedSiteIds?: number[]
}

type InviteWorkspaceMemberInput = {
  email: string
  alias: string
  role: WorkspaceUserRole
}

type JoinWorkspaceInput = {
  token: string
  type: 'accept' | 'decline'
}

const resolvers = {
  Query: {
    getUserWorkspaces: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, __: unknown, { user }) => getAllWorkspaces(user)),
    verifyWorkspaceInvitationToken: combineResolvers(allowedOrganization, (_: unknown, { invitationToken }: Token, { user }): Promise<GetDetailWorkspaceInvitation> => verifyInvitationToken(invitationToken, user)),
  },

  Mutation: {
    createWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { name }: { name: string }, { user }) => createWorkspace(user, name)),
    inviteWorkspaceMember: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { email, alias, role }: InviteWorkspaceMemberInput, { user, allowedFrontendUrl }) => inviteWorkspaceMember(user, alias, email, role, allowedFrontendUrl)),
    joinWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { token, type }: JoinWorkspaceInput, { user }) => acceptInvitation(token, type, user)),
    deleteWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { id }: { id: number }, { user }) => deleteWorkspace(user, id)),
    updateWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, data: WorkspaceInput, { user }) => updateWorkspace(user, data.id, data)),
  },

  Workspace: {
    members: async (parent: { id?: number }, _args: unknown, { user }: GraphQLContext) => {
      if (!parent.id) return []
      if (!user) return []

      try {
        return await getWorkspaceMembers(parent.id, user)
      } catch {
        return []
      }
    },
    domains: async (parent: { id?: number }, _args: unknown, { user }: GraphQLContext) => {
      if (!parent.id) return []
      if (!user) return []

      try {
        const workspaceDomains = await getWorkspaceDomainsService(parent.id, user)

        return workspaceDomains.map((domain: WorkspaceWithDomains) => ({
          id: domain.allowed_site_id,
          url: domain.allowed_site_url,
        }))
      } catch {
        return []
      }
    },
  },

  WorkspaceUser: {
    user: async (parent: { user_id?: number }) => {
      if (!parent.user_id) return null
      return await findUser({ id: parent.user_id })
    },
  },
}

export default resolvers
