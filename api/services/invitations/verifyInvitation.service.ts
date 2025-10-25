import dayjs from 'dayjs'

import database from '../../config/database.config'
import { INVITATION_STATUS_EXPIRED, INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { WORKSPACE_USER_STATUS_INACTIVE, WORKSPACE_USER_STATUS_PENDING } from '../../constants/workspace.constant'
import { GetDetailOrganizationInvitation, getDetailOrganizationInvitations, GetDetailWorkspaceInvitation, getDetailWorkspaceInvitations, updateOrganizationInvitationByToken, updateWorkspaceInvitationByToken } from '../../repository/invitations.repository'
import { createWorkspaceUser, getWorkspaceUser, updateWorkspaceUser } from '../../repository/workspace_users.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'
import { UserLogined } from '../authentication/get-user-logined.service'

export type VerifyInvitationResponse = (GetDetailWorkspaceInvitation | GetDetailOrganizationInvitation) & {
  type: 'workspace' | 'organization'
}

/**
 * Verify invitation token (workspace or organization)
 */
export async function verifyInvitation(token: string, user: UserLogined): Promise<VerifyInvitationResponse> {
  const trx = await database.transaction()

  try {
    const [workspaceInvitation] = await getDetailWorkspaceInvitations({ token })
    const [organizationInvitation] = !workspaceInvitation ? await getDetailOrganizationInvitations({ token }) : [null]

    const invitation = workspaceInvitation || organizationInvitation
    const invitationType = workspaceInvitation ? 'workspace' : 'organization'

    if (!invitation || invitation.status !== INVITATION_STATUS_PENDING) {
      throw new ApolloError('Token not valid')
    }

    if (dayjs().isAfter(invitation.valid_until)) {
      if (invitationType === 'workspace') {
        await updateWorkspaceInvitationByToken(token, { status: INVITATION_STATUS_EXPIRED }, trx)

        if (invitation.status === INVITATION_STATUS_PENDING) {
          await updateWorkspaceUser({ invitation_token: token }, { status: WORKSPACE_USER_STATUS_INACTIVE }, trx)
        }
      } else {
        await updateOrganizationInvitationByToken(token, { status: INVITATION_STATUS_EXPIRED }, trx)
      }

      throw new ApolloError('Invitation token has expired')
    }

    if (invitation.email !== user.email) {
      throw new ApolloError('This invitation is not for your email address')
    }

    if (invitationType === 'workspace' && workspaceInvitation) {
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
    }

    await trx.commit()

    return {
      ...invitation,
      type: invitationType,
    }
  } catch (error) {
    await trx.rollback()
    throw error
  }
}
