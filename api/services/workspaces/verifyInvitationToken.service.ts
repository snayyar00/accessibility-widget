import { GetDetailWorkspaceInvitation, getDetailWorkspaceInvitation } from '../../repository/workspace_invitations.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'

export async function verifyInvitationToken(token: string): Promise<GetDetailWorkspaceInvitation> {
  const [workspaceInvitation] = await getDetailWorkspaceInvitation(token)

  if (!workspaceInvitation || workspaceInvitation.status === 'expired') {
    throw new ApolloError('Token not valid')
  }

  return workspaceInvitation
}
