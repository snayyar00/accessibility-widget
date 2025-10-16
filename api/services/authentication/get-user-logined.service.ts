import dayjs from 'dayjs'

import { INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { verify } from '../../helpers/jwt.helper'
import { getOrganizationInvitation, getWorkspaceInvitation } from '../../repository/invitations.repository'
import { findUser } from '../../repository/user.repository'

export type UserLoginedResponse = {
  id: number
  email: string
  name: string
  isActive: boolean
  position: string
  company: string
  avatarUrl: string
  current_organization_id: number | null
  invitationToken: string | null
}

export default async function getUserLogined(bearerToken: string | null): Promise<UserLoginedResponse | null> {
  if (bearerToken) {
    try {
      const verifyToken = verify(bearerToken)

      if (typeof verifyToken === 'object') {
        const { user, iat } = verifyToken

        const userInfo = await findUser({ email: user.email })

        const [workspaceInvitationToken] = await getWorkspaceInvitation({ email: user.email, status: INVITATION_STATUS_PENDING })
        const [organizationInvitationToken] = await getOrganizationInvitation({ email: user.email, status: INVITATION_STATUS_PENDING })

        const invitationToken = organizationInvitationToken || workspaceInvitationToken

        if (userInfo.password_changed_at && iat && iat * 1000 < dayjs.utc(userInfo.password_changed_at).valueOf()) {
          return null
        }

        return {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          isActive: userInfo.is_active,
          position: userInfo.position,
          company: userInfo.company,
          avatarUrl: userInfo.avatar_url,
          current_organization_id: userInfo.current_organization_id || null,
          invitationToken: invitationToken ? invitationToken.token : null,
        }
      }
    } catch {
      return null
    }
  }

  return null
}
