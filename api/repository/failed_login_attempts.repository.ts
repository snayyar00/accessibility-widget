import { Knex } from 'knex'

import database from '../config/database.config'

export interface FailedLoginAttempt {
  id: number
  user_id: number
  failed_count: number
  locked_at: Date | null
  first_failed_at: Date
  last_failed_at: Date
  created_at: Date
  updated_at: Date
}

/**
 * Increment failed login attempts for a user
 */
export async function incrementFailedAttempts(userId: number): Promise<FailedLoginAttempt> {
  return database.transaction(async (trx: Knex.Transaction) => {
    // Try to get existing record with row lock
    const existingRecord = await trx('failed_login_attempts').where('user_id', userId).forUpdate().first()

    if (existingRecord) {
      // Update existing record
      await trx('failed_login_attempts')
        .where('user_id', userId)
        .update({
          failed_count: existingRecord.failed_count + 1,
          last_failed_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })

      // Get the updated record
      const updatedRecord = await trx('failed_login_attempts').where('user_id', userId).first()

      return updatedRecord
    }
    // Create new record
    await trx('failed_login_attempts').insert({
      user_id: userId,
      failed_count: 1,
      first_failed_at: trx.fn.now(),
      last_failed_at: trx.fn.now(),
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })

    // Get the newly created record
    const newRecord = await trx('failed_login_attempts').where('user_id', userId).first()

    return newRecord
  })
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: number): Promise<boolean> {
  const record = await database('failed_login_attempts').where('user_id', userId).whereNotNull('locked_at').first()

  return !!record
}

/**
 * Lock account by setting locked_at timestamp
 */
export async function lockAccount(userId: number): Promise<void> {
  await database.transaction(async (trx: Knex.Transaction) => {
    // Try to get existing record with row lock
    const existingRecord = await trx('failed_login_attempts').where('user_id', userId).forUpdate().first()

    if (existingRecord) {
      // Update existing record to lock it
      await trx('failed_login_attempts').where('user_id', userId).update({
        locked_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
    } else {
      // Create new record and lock it immediately
      await trx('failed_login_attempts').insert({
        user_id: userId,
        failed_count: 5, // Set to max attempts since we're locking
        first_failed_at: trx.fn.now(),
        last_failed_at: trx.fn.now(),
        locked_at: trx.fn.now(),
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
    }
  })
}

/**
 * Unlock account by deleting the failed attempts record
 */
export async function unlockAccount(userId: number, trx?: Knex.Transaction): Promise<void> {
  if (trx) {
    await trx('failed_login_attempts').where('user_id', userId).del()
  } else {
    await database('failed_login_attempts').where('user_id', userId).del()
  }
}

/**
 * Reset failed attempts after successful login
 */
export async function resetFailedAttempts(userId: number, trx?: Knex.Transaction): Promise<void> {
  await unlockAccount(userId, trx)
}
