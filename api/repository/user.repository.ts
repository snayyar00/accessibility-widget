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
  license_owner_email: 'users.license_owner_email',
  phone_number: 'users.phone_number',
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
  license_owner_email?: string
  phone_number?: string
  monitoring_alert_flag?: boolean
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

export async function findUserById(id: number): Promise<UserProfile> {
  return getUserbyId(id)
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
export async function findUserNotificationByUserId(user_id: number): Promise<unknown> {
  return database('user_notifications').where({ user_id }).first()
}

export async function insertUserNotification(user_id: number, trx?: Knex.Transaction): Promise<unknown> {
  const query = database('user_notifications').insert({ user_id })
  return trx ? query.transacting(trx) : query
}

export async function updateUserNotificationFlags(
  user_id: number,
  flags: {
    monthly_report_flag?: boolean
    new_domain_flag?: boolean
    issue_reported_flag?: boolean
    onboarding_emails_flag?: boolean
    monitoring_alert_flag?: boolean
  },
): Promise<number> {
  return database('user_notifications').where({ user_id }).update(flags)
}

export async function getUserNotificationSettings(user_id: number): Promise<unknown> {
  return database('user_notifications').where({ user_id }).first()
}

/**
 * Check if a user has onboarding emails enabled
 */
export async function checkOnboardingEmailsEnabled(user_id: number): Promise<boolean> {
  try {
    const result = await database('user_notifications').where({ user_id }).first()
    return !!result && !!result.onboarding_emails_flag
  } catch (error) {
    console.error('Error checking onboarding emails flag:', error)
    return false // Default to false on error to avoid sending unwanted emails
  }
}

/**
 * Set onboarding emails flag for a user
 */
export async function setOnboardingEmailsFlag(user_id: number, enabled: boolean): Promise<boolean> {
  try {
    const updatedRows = await database('user_notifications')
      .where({ user_id })
      .update({ onboarding_emails_flag: enabled ? 1 : 0 })

    if (updatedRows > 0) {
      return true
    }

    // If no rows were updated, insert the record with the onboarding flag
    await database('user_notifications')
      .insert({ user_id, onboarding_emails_flag: enabled ? 1 : 0 })
      .onConflict('user_id')
      .merge({ onboarding_emails_flag: enabled ? 1 : 0 })

    return true
  } catch (error) {
    console.error('Error setting onboarding emails flag:', error)
    return false
  }
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

/**
 * Get user's sent emails from database JSON column
 */
export async function getUserSentEmails(user_id: number): Promise<Record<string, string> | null> {
  try {
    const result = await database('user_notifications').where({ user_id }).first('sent_emails')
    return result?.sent_emails || null
  } catch (error) {
    console.error('Error getting user sent emails:', error)
    return null
  }
}

/**
 * Update user's sent emails in database JSON column
 */
export async function updateUserSentEmails(user_id: number, sentEmails: Record<string, string>): Promise<boolean> {
  try {
    const updatedRows = await database('user_notifications')
      .where({ user_id })
      .update({ sent_emails: JSON.stringify(sentEmails) })

    if (updatedRows > 0) {
      return true
    }

    // If no rows were updated, insert or upsert the record
    await database('user_notifications')
      .insert({ user_id, sent_emails: JSON.stringify(sentEmails) })
      .onConflict('user_id')
      .merge({ sent_emails: JSON.stringify(sentEmails) })

    return true
  } catch (error) {
    console.error('Error updating user sent emails:', error)
    return false
  }
}

/**
 * MIGRATION UTILITY: Reset user's email tracking (for testing/recovery)
 */
export async function resetUserEmailTracking(user_id: number): Promise<boolean> {
  try {
    const updatedRows = await database('user_notifications').where({ user_id }).update({ sent_emails: null })

    if (updatedRows > 0) {
      return true
    }

    // If no rows were updated, insert the record with null sent_emails
    await database('user_notifications').insert({ user_id, sent_emails: null }).onConflict('user_id').merge({ sent_emails: null })

    return true
  } catch (error) {
    console.error('Error resetting user email tracking:', error)
    return false
  }
}
