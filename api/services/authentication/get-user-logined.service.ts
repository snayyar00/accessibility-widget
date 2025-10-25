import dayjs from 'dayjs'

import { verify } from '../../helpers/jwt.helper'
import { Organization } from '../../repository/organization.repository'
import { OrganizationUser } from '../../repository/organization_user.repository'
import { findUserWithOrganization } from '../../repository/user.repository'

export type UserLogined = {
  id: number
  email: string
  name: string
  isActive: boolean
  is_super_admin: boolean
  position: string
  company: string
  avatarUrl: string
  current_organization_id: number | null
  currentOrganization: Organization | null
  currentOrganizationUser: OrganizationUser | null
  invitationToken: string | null
}

export default async function getUserLogined(bearerToken: string | null): Promise<UserLogined | null> {
  if (bearerToken) {
    try {
      const verifyToken = verify(bearerToken)

      if (typeof verifyToken === 'object') {
        const { user, iat } = verifyToken
        const userInfo = await findUserWithOrganization(user.email)

        if (!userInfo) {
          console.log('User not found')
          return null
        }

        if (userInfo.password_changed_at && iat && iat * 1000 < dayjs.utc(userInfo.password_changed_at).valueOf()) {
          return null
        }

        const invitationToken = userInfo.organizationInvitationToken || userInfo.workspaceInvitationToken

        return {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          isActive: userInfo.is_active,
          is_super_admin: userInfo.is_super_admin || false,
          position: userInfo.position,
          company: userInfo.company,
          avatarUrl: userInfo.avatar_url,
          current_organization_id: userInfo.current_organization_id || null,
          currentOrganization: userInfo.currentOrganization,
          currentOrganizationUser: userInfo.currentOrganizationUser,
          invitationToken,
        }
      }
    } catch (error) {
      console.error('Error in getUserLogined:', error)
      return null
    }
  }

  console.log('No bearer token provided')
  return null
}
