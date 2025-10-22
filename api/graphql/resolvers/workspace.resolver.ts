import { combineResolvers } from 'graphql-resolvers'

import { WorkspaceUserRole } from '../../constants/workspace.constant'
import { GraphQLContext } from '../../graphql/types'
import { findUser, UserProfile } from '../../repository/user.repository'
import { WorkspaceWithDomains } from '../../repository/workspace_allowed_sites.repository'
import { addWorkspaceDomains, getWorkspaceDomainsService, removeWorkspaceDomains } from '../../services/workspaces/workspaceDomains.service'
import { getWorkspaceInvitationsByAlias, removeAllUserInvitations, removeWorkspaceInvitation } from '../../services/workspaces/workspaceInvitations.service'
import { changeWorkspaceMemberRole, getWorkspaceMembers, getWorkspaceMembersByAlias, removeWorkspaceMember } from '../../services/workspaces/workspaceMembers.service'
import { createWorkspace, deleteWorkspace, getAllWorkspaces, getWorkspaceByAlias, updateWorkspace } from '../../services/workspaces/workspaces.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

type WorkspaceInput = {
  id?: number
  name?: string
}

type WorkspaceDomainsInput = {
  workspaceId: string
  siteIds: string[]
}

type ChangeWorkspaceMemberRoleInput = {
  id: string
  role: WorkspaceUserRole
}

type RemoveWorkspaceMemberInput = {
  id: string
}

type RemoveWorkspaceInvitationInput = {
  id: string
}

type RemoveAllUserInvitationsInput = {
  email: string
}

const resolvers = {
  Query: {
    getUserWorkspaces: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, __: unknown, { user }) => getAllWorkspaces(user)),
    getWorkspaceByAlias: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { alias }: { alias: string }, { user }) => getWorkspaceByAlias(alias, user)),
    getWorkspaceMembersByAlias: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { alias }: { alias: string }, { user }) => getWorkspaceMembersByAlias(alias, user)),
    getWorkspaceInvitationsByAlias: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { alias }: { alias: string }, { user }) => getWorkspaceInvitationsByAlias(alias, user)),
  },

  Mutation: {
    createWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { name }: { name: string }, { user }) => createWorkspace(user, name)),
    changeWorkspaceMemberRole: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { id, role }: ChangeWorkspaceMemberRoleInput, { user }) => changeWorkspaceMemberRole(user, parseInt(id, 10), role)),
    removeWorkspaceMember: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { id }: RemoveWorkspaceMemberInput, { user }) => removeWorkspaceMember(user, parseInt(id, 10))),
    removeWorkspaceInvitation: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { id }: RemoveWorkspaceInvitationInput, { user }) => removeWorkspaceInvitation(user, parseInt(id, 10))),
    removeAllUserInvitations: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { email }: RemoveAllUserInvitationsInput, { user }) => removeAllUserInvitations(user, email)),
    deleteWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { id }: { id: number }, { user }) => deleteWorkspace(user, id)),
    updateWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, data: WorkspaceInput, { user }) => updateWorkspace(user, data.id, data)),
    addWorkspaceDomains: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { workspaceId, siteIds }: WorkspaceDomainsInput, { user }) =>
      addWorkspaceDomains(
        user,
        parseInt(workspaceId, 10),
        siteIds.map((id) => parseInt(id, 10)),
      ),
    ),
    removeWorkspaceDomains: combineResolvers(allowedOrganization, isAuthenticated, (_: unknown, { workspaceId, siteIds }: WorkspaceDomainsInput, { user }) =>
      removeWorkspaceDomains(
        user,
        parseInt(workspaceId, 10),
        siteIds.map((id) => parseInt(id, 10)),
      ),
    ),
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
          added_by_user_id: domain.added_by_user_id,
          added_by_user_email: domain.added_by_user_email,
          site_owner_user_id: domain.site_owner_user_id,
          site_owner_user_email: domain.site_owner_user_email,
        }))
      } catch {
        return []
      }
    },
  },

  WorkspaceUser: {
    user: async (parent: { user_id?: number; user?: UserProfile }) => {
      if (parent.user) {
        return parent.user
      }

      if (!parent.user_id) return null

      return await findUser({ id: parent.user_id })
    },
  },
}

export default resolvers
