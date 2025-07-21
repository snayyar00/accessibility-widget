import { verify } from '../../helpers/jwt.helper'
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
}

export default async function getUserLogined(bearerToken: string | null): Promise<UserLoginedResponse | null> {
  if (bearerToken) {
    try {
      const verifyToken = verify(bearerToken)

      if (typeof verifyToken === 'object') {
        const { user } = verifyToken
        const userInfo = await findUser({ email: user.email })

        return {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          isActive: userInfo.is_active,
          position: userInfo.position,
          company: userInfo.company,
          avatarUrl: userInfo.avatar_url,
          current_organization_id: userInfo.current_organization_id || null,
        }
      }
    } catch {
      return null
    }
  }

  return null
}
