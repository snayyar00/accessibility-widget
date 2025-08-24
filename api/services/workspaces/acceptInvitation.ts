import { WORKSPACE_INVITATION_STATUS_ACCEPTED, WORKSPACE_INVITATION_STATUS_DECLINED, WORKSPACE_USER_STATUS_ACTIVE, WORKSPACE_USER_STATUS_DECLINE } from '../../constants/workspace.constant'
import { updateWorkspaceInvitationByToken } from '../../repository/workspace_invitations.repository'
import { updateWorkspaceUser } from '../../repository/workspace_users.repository'

export async function acceptInvitation(token: string, type: 'accept' | 'decline'): Promise<boolean> {
  const userStatus = type === 'accept' ? WORKSPACE_USER_STATUS_ACTIVE : WORKSPACE_USER_STATUS_DECLINE
  const invitationStatus = type === 'accept' ? WORKSPACE_INVITATION_STATUS_ACCEPTED : WORKSPACE_INVITATION_STATUS_DECLINED

  await updateWorkspaceInvitationByToken(token, { status: invitationStatus })
  await updateWorkspaceUser({ invitation_token: token }, { status: userStatus })

  return true
}
