import database from '../../config/database.config'
import { ORGANIZATION_USER_STATUS_ACTIVE } from '../../constants/organization.constant'
import { WORKSPACE_INVITATION_STATUS_PENDING, WORKSPACE_USER_STATUS_PENDING } from '../../constants/workspace.constant'
import { updateOrganizationUserByOrganizationAndUserId } from '../../repository/organization_user.repository'
import { UserProfile } from '../../repository/user.repository'
import { GetDetailWorkspaceInvitation, getDetailWorkspaceInvitation } from '../../repository/workspace_invitations.repository'
import { createWorkspaceUser, getWorkspaceUser } from '../../repository/workspace_users.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'

export async function verifyInvitationToken(token: string, user: UserProfile): Promise<GetDetailWorkspaceInvitation> {
  const trx = await database.transaction()
  try {
    const [workspaceInvitation] = await getDetailWorkspaceInvitation(token)

    if (!workspaceInvitation || workspaceInvitation.status !== WORKSPACE_INVITATION_STATUS_PENDING) {
      throw new ApolloError('Token not valid')
    }

    await updateOrganizationUserByOrganizationAndUserId(workspaceInvitation.organization_id, user.id, { status: ORGANIZATION_USER_STATUS_ACTIVE, role: workspaceInvitation.role }, trx)

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
