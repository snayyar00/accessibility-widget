import database from '../../config/database.config'
import { TABLES } from '../../constants/database.constant'
import { UserProfile } from '../../repository/user.repository'
import { getToken } from '../../repository/user_tokens.repository'

type TokenParams = {
  id?: number
  user_id?: number
  token?: string
  type?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export async function deleteUser(currentUser: UserProfile): Promise<boolean> {
  const tokens = await getToken({ user_id: currentUser.id })

  const activeTokens = tokens.filter((token) => token.is_active)

  const pms = [disableAllField(currentUser, activeTokens)]

  await Promise.all(pms)
  return true
}

function disableAllField(user: UserProfile, tokens: TokenParams[]): Promise<unknown> {
  return database.transaction((trx) => {
    const queries = []
    queries.push(database(TABLES.users).where({ id: user.id }).update({ deleted_at: new Date() }).transacting(trx))

    if (tokens.length > 0) {
      tokens.forEach((token) => {
        queries.push(database(TABLES.userTokens).where({ id: token.id }).update({ is_active: false }).transacting(trx))
      })
    }

    Promise.all(queries).then(trx.commit).catch(trx.rollback)
  })
}
