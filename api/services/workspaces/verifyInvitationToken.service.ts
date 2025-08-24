import { WORKSPACE_INVITATION_STATUS_PENDING } from '../../constants/workspace.constant'
import { GetDetailWorkspaceInvitation, getDetailWorkspaceInvitation } from '../../repository/workspace_invitations.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'

export async function verifyInvitationToken(token: string): Promise<GetDetailWorkspaceInvitation> {
  const [workspaceInvitation] = await getDetailWorkspaceInvitation(token)

  if (!workspaceInvitation || workspaceInvitation.status !== WORKSPACE_INVITATION_STATUS_PENDING) {
    throw new ApolloError('Token not valid')
  }

  return workspaceInvitation
}
