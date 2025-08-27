import dayjs from 'dayjs'

import database from '../../config/database.config'
import { ORGANIZATION_USER_STATUS_ACTIVE } from '../../constants/organization.constant'
import { WORKSPACE_INVITATION_STATUS_EXPIRED, WORKSPACE_INVITATION_STATUS_PENDING, WORKSPACE_USER_STATUS_INACTIVE, WORKSPACE_USER_STATUS_PENDING } from '../../constants/workspace.constant'
import { updateOrganizationUserByOrganizationAndUserId } from '../../repository/organization_user.repository'
import { UserProfile } from '../../repository/user.repository'
import { GetDetailWorkspaceInvitation, getDetailWorkspaceInvitations, updateWorkspaceInvitationByToken } from '../../repository/workspace_invitations.repository'
import { createWorkspaceUser, getWorkspaceUser, updateWorkspaceUser } from '../../repository/workspace_users.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'

export async function verifyInvitationToken(token: string, user: UserProfile): Promise<GetDetailWorkspaceInvitation> {
  const trx = await database.transaction()
  try {
    const [workspaceInvitation] = await getDetailWorkspaceInvitations({ token })

    if (!workspaceInvitation || workspaceInvitation.status !== WORKSPACE_INVITATION_STATUS_PENDING) {
      throw new ApolloError('Token not valid')
    }

    if (dayjs().isAfter(workspaceInvitation.valid_until)) {
      await updateWorkspaceInvitationByToken(token, { status: WORKSPACE_INVITATION_STATUS_EXPIRED }, trx)
      await updateWorkspaceUser({ invitation_token: token }, { status: WORKSPACE_USER_STATUS_INACTIVE }, trx)

      throw new ApolloError('Invitation token has expired')
    }

    await updateOrganizationUserByOrganizationAndUserId(workspaceInvitation.organization_id, user.id, { status: ORGANIZATION_USER_STATUS_ACTIVE }, trx)

    const existingWorkspaceUser = await getWorkspaceUser({
      user_id: user.id,
      workspace_id: workspaceInvitation.workspace_id,
    })

    if (!existingWorkspaceUser) {
      await createWorkspaceUser(
        {
          user_id: user.id,
          workspace_id: workspaceInvitation.workspace_id,
          role: workspaceInvitation.role,
          status: WORKSPACE_USER_STATUS_PENDING,
          invitation_token: workspaceInvitation.token,
        },
        trx,
      )
    }

    await trx.commit()

    return workspaceInvitation
  } catch (error) {
    await trx.rollback()
    throw error
  }
}
