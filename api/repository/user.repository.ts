import { Knex } from 'knex'
import union from 'lodash/union'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { UserToken, userTokenColumns } from './user_tokens.repository'

const TABLE = TABLES.users

export const usersColumns = {
  id: 'users.id',
  name: 'users.name',
  email: 'users.email',
  createAt: 'users.created_at',
  updatedAt: 'users.updated_at',
  isActive: 'users.is_active',
  position: 'users.position',
  company: 'users.company',
  avatarUrl: 'users.avatar_url',
  provider: 'users.provider',
  providerId: 'users.provider_id',
  deletedAt: 'users.deleted_at',
  current_organization_id: 'users.current_organization_id',
}

type FindUserProps = {
  id?: number
  email?: string
  provider_id?: string
  provider?: 'github' | 'google' | 'facebook'
  deleted_at?: string
}

export type UserProfile = {
  id?: number
  position?: string
  provider?: 'github' | 'google' | 'facebook'
  email?: string
  name?: string
  password?: string
  provider_id?: string
  avatar_url?: string
  is_active?: boolean
  company?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string
  current_organization_id?: number
  password_changed_at?: string
}

type GetUserByIdAndJoinUserTokenResponse = UserProfile & UserToken

export async function findUser({ id, email, provider_id, provider, deleted_at = null }: FindUserProps): Promise<UserProfile> {
  const condition: FindUserProps = {
    deleted_at,
  }

  if (id) condition.id = id
  if (email) condition.email = email
  if (provider_id) condition.provider_id = provider_id
  if (provider) condition.provider = provider

  return database(TABLE).where(condition).first()
}

export async function createUser(userData: UserProfile, trx?: Knex.Transaction): Promise<number | Error> {
  if (trx) {
    const [userId] = await database(TABLE).transacting(trx).insert(userData)

    return userId
  } else {
    let t

    try {
      t = await database.transaction()
      const [userId] = await database(TABLE).transacting(t).insert(userData)

      await t.commit()

      return userId
    } catch (error) {
      if (t) await t.rollback()
      return new Error(error)
    }
  }
}

export async function updateUser(id: number, data: Partial<UserProfile>, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ id }).update(data)

  return trx ? query.transacting(trx) : query
}

export async function getUserbyId(id: number): Promise<UserProfile> {
  return database(TABLE).where({ id }).first()
}

export async function getUserByIdAndJoinUserToken(id: number, type: 'verify_email' | 'forgot_password' | 'team_invitation_email'): Promise<GetUserByIdAndJoinUserTokenResponse> {
  const users = Object.values(usersColumns)
  const userToken = Object.values(userTokenColumns)
  return database(TABLE)
    .join(TABLES.userTokens, usersColumns.id, userTokenColumns.userId)
    .select(union(users, userToken))
    .where({ [usersColumns.id]: id, [userTokenColumns.type]: type })
    .first()
}

export async function activeUser(id: number): Promise<number> {
  return database(TABLE).where({ id }).update({ is_active: true })
}

// USER NOTIFICATIONS
export async function findUserNotificationByUserId(user_id: number): Promise<any> {
  return database('user_notifications').where({ user_id }).first()
}

export async function insertUserNotification(user_id: number): Promise<any> {
  return database('user_notifications').insert({ user_id })
}

export async function updateUserNotificationFlags(
  user_id: number,
  flags: {
    monthly_report_flag?: boolean
    new_domain_flag?: boolean
    issue_reported_flag?: boolean
  },
): Promise<number> {
  return database('user_notifications').where({ user_id }).update(flags)
}

export async function getUserNotificationSettings(user_id: number): Promise<any> {
  return database('user_notifications').where({ user_id }).first()
}

/**
 * Get users registered on a specific date
 */
export async function getUsersRegisteredOnDate(date: string): Promise<UserProfile[]> {
  return database(TABLE).whereRaw('DATE(created_at) = ?', [date]).select('*')
}

/**
 * Get the latest registered user for testing purposes
 */
export async function getLatestRegisteredUser(): Promise<UserProfile | null> {
  return database(TABLE).orderBy('created_at', 'desc').first()
}
