import { combineResolvers } from 'graphql-resolvers'

// import { GetDetailWorkspaceInvitation } from '../../repository/workspace_invitations.repository'
// import { acceptInvitation } from '../../services/workspaces/acceptInvitation'
// import { verifyInvitationToken } from '../../services/workspaces/verifyInvitationToken.service'
// import { createWorkspace, findWorkspaceByAlias, getAllWorkspaces, inviteWorkspaceMember } from '../../services/workspaces/workspaces.service'
import { createWorkspace, deleteWorkspace, updateWorkspace } from '../../services/workspaces/workspaces.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

// type Token = {
//   invitationToken: string
// }

type CreateWorkspaceInput = {
  name: string
}

const resolvers = {
  Query: {
    // workspaces: combineResolvers(isAuthenticated, (_, arg, { user }) => getAllWorkspaces(user)),
    // getWorkspaceDetail: combineResolvers(isAuthenticated, (_, { alias }) => findWorkspaceByAlias(alias)),
    // verifyWorkspaceInvitationToken: (_: unknown, { invitationToken }: Token): Promise<GetDetailWorkspaceInvitation> => verifyInvitationToken(invitationToken),
  },
  Mutation: {
    createWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_, { name }: CreateWorkspaceInput, { user }) => createWorkspace(user, name)),
    // inviteWorkspaceMember: combineResolvers(isAuthenticated, (_, { email, alias, role }, { user }) => inviteWorkspaceMember(user, alias, email, role)),
    // joinWorkspace: combineResolvers(isAuthenticated, (_, { token, type }) => acceptInvitation(token, type)),
    deleteWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_, { id }, { user }) => deleteWorkspace(user, id)),
    updateWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_, { id, name }, { user }) => updateWorkspace(user, id, { name })),
  },
}

export default resolvers
