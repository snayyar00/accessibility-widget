import { combineResolvers } from 'graphql-resolvers'

// import { GetDetailWorkspaceInvitation } from '../../repository/workspace_invitations.repository'
// import { acceptInvitation } from '../../services/workspaces/acceptInvitation'
// import { verifyInvitationToken } from '../../services/workspaces/verifyInvitationToken.service'
// import { createWorkspace, findWorkspaceByAlias, getAllWorkspaces, inviteWorkspaceMember } from '../../services/workspaces/workspaces.service'
import { createWorkspace, deleteWorkspace, getAllWorkspaces, updateWorkspace } from '../../services/workspaces/workspaces.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

// type Token = {
//   invitationToken: string
// }

type WorkspaceInput = {
  id?: number
  name: string
}

const resolvers = {
  Query: {
    getUserWorkspaces: combineResolvers(allowedOrganization, isAuthenticated, (_, __, { user }) => getAllWorkspaces(user)),
    // getWorkspaceDetail: combineResolvers(isAuthenticated, (_, { alias }) => findWorkspaceByAlias(alias)),
    // verifyWorkspaceInvitationToken: (_: unknown, { invitationToken }: Token): Promise<GetDetailWorkspaceInvitation> => verifyInvitationToken(invitationToken),
  },
  Mutation: {
    createWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_, { name }: WorkspaceInput, { user }) => createWorkspace(user, name)),
    // inviteWorkspaceMember: combineResolvers(isAuthenticated, (_, { email, alias, role }, { user }) => inviteWorkspaceMember(user, alias, email, role)),
    // joinWorkspace: combineResolvers(isAuthenticated, (_, { token, type }) => acceptInvitation(token, type)),
    deleteWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_, { id }: WorkspaceInput, { user }) => deleteWorkspace(user, id)),
    updateWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_, data: WorkspaceInput, { user }) => updateWorkspace(user, data.id, data)),
  },
}

export default resolvers
