import database from '../../config/database.config'
import { WORKSPACE_INVITATION_STATUS_ACCEPTED, WORKSPACE_INVITATION_STATUS_DECLINED, WORKSPACE_USER_STATUS_ACTIVE, WORKSPACE_USER_STATUS_DECLINE } from '../../constants/workspace.constant'
import { updateOrganizationUserByOrganizationAndUserId } from '../../repository/organization_user.repository'
import { UserProfile } from '../../repository/user.repository'
import { getDetailWorkspaceInvitation, updateWorkspaceInvitationByToken } from '../../repository/workspace_invitations.repository'
import { updateWorkspaceUser } from '../../repository/workspace_users.repository'

export async function acceptInvitation(token: string, type: 'accept' | 'decline', user: UserProfile): Promise<boolean> {
  const userStatus = type === 'accept' ? WORKSPACE_USER_STATUS_ACTIVE : WORKSPACE_USER_STATUS_DECLINE
  const invitationStatus = type === 'accept' ? WORKSPACE_INVITATION_STATUS_ACCEPTED : WORKSPACE_INVITATION_STATUS_DECLINED

  const trx = await database.transaction()

  try {
    await updateWorkspaceInvitationByToken(token, { status: invitationStatus }, trx)
    await updateWorkspaceUser({ invitation_token: token }, { status: userStatus }, trx)

    if (type === 'accept') {
      const [workspaceInvitation] = await getDetailWorkspaceInvitation(token)

      await updateOrganizationUserByOrganizationAndUserId(workspaceInvitation.organization_id, user.id, { current_workspace_id: workspaceInvitation.workspace_id }, trx)
    }

    await trx.commit()

    return true
  } catch (error) {
    await trx.rollback()
    throw error
  }
}
