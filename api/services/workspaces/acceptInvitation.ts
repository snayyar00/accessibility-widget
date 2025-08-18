import { updateWorkspaceInvitationByToken } from '../../repository/workspace_invitations.repository'
import { updateWorkspaceUser } from '../../repository/workspace_users.repository'

export async function acceptInvitation(token: string, type: 'accept' | 'decline'): Promise<boolean> {
  const status = type === 'accept' ? 'active' : 'decline'

  await updateWorkspaceInvitationByToken(token, { status: 'expired' })
  await updateWorkspaceUser({ invitation_token: token }, { status })

  return true
}
