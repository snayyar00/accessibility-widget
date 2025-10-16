import database from '../../config/database.config'
import { INVITATION_STATUS_ACCEPTED, INVITATION_STATUS_DECLINED } from '../../constants/invitation.constant'
import { ORGANIZATION_USER_STATUS_ACTIVE } from '../../constants/organization.constant'
import { WORKSPACE_USER_STATUS_ACTIVE, WORKSPACE_USER_STATUS_DECLINE } from '../../constants/workspace.constant'
import { getDetailOrganizationInvitations, getDetailWorkspaceInvitations, updateOrganizationInvitationByToken, updateWorkspaceInvitationByToken } from '../../repository/invitations.repository'
import { updateOrganizationUserByOrganizationAndUserId } from '../../repository/organization_user.repository'
import { UserProfile } from '../../repository/user.repository'
import { updateWorkspaceUser } from '../../repository/workspace_users.repository'

export async function acceptInvitation(token: string, type: 'accept' | 'decline' | undefined, user: UserProfile): Promise<boolean> {
  const trx = await database.transaction()

  try {
    const [workspaceInvitation] = await getDetailWorkspaceInvitations({ token })
    const [organizationInvitation] = !workspaceInvitation ? await getDetailOrganizationInvitations({ token }) : [null]

    const invitation = workspaceInvitation || organizationInvitation
    const invitationType = workspaceInvitation ? 'workspace' : 'organization'

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    if (invitationType === 'workspace') {
      // For workspace invitations, type is required
      if (!type) {
        throw new Error('Type is required for workspace invitations')
      }

      const invitationStatus = type === 'accept' ? INVITATION_STATUS_ACCEPTED : INVITATION_STATUS_DECLINED
      const userStatus = type === 'accept' ? WORKSPACE_USER_STATUS_ACTIVE : WORKSPACE_USER_STATUS_DECLINE

      // Always activate organization_user for workspace invitations (regardless of accept/decline)
      await updateOrganizationUserByOrganizationAndUserId(workspaceInvitation.organization_id!, user.id, { status: ORGANIZATION_USER_STATUS_ACTIVE }, trx)

      await updateWorkspaceInvitationByToken(token, { status: invitationStatus }, trx)
      await updateWorkspaceUser({ invitation_token: token }, { status: userStatus }, trx)
    } else {
      await updateOrganizationInvitationByToken(token, { status: INVITATION_STATUS_ACCEPTED }, trx)
      await updateOrganizationUserByOrganizationAndUserId(organizationInvitation.organization_id, user.id, { status: ORGANIZATION_USER_STATUS_ACTIVE }, trx)
    }

    await trx.commit()

    return true
  } catch (error) {
    await trx.rollback()
    throw error
  }
}
