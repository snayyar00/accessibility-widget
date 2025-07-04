import database from '~/config/database.config';

export interface FailedLoginAttempt {
  id: number;
  user_id: number;
  failed_count: number;
  locked_at: Date | null;
  first_failed_at: Date;
  last_failed_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Increment failed login attempts for a user
 */
export async function incrementFailedAttempts(userId: number): Promise<FailedLoginAttempt> {
  const existingRecord = await database('failed_login_attempts')
    .where('user_id', userId)
    .first();

  if (existingRecord) {
    // Update existing record
    await database('failed_login_attempts')
      .where('user_id', userId)
      .update({
        failed_count: existingRecord.failed_count + 1,
        last_failed_at: database.raw('CURRENT_TIMESTAMP'),
        updated_at: database.raw('CURRENT_TIMESTAMP')
      });
    
    // Get the updated record
    const updatedRecord = await database('failed_login_attempts')
      .where('user_id', userId)
      .first();
    
    return updatedRecord;
  } else {
    // Create new record
    await database('failed_login_attempts')
      .insert({
        user_id: userId,
        failed_count: 1,
        first_failed_at: database.raw('CURRENT_TIMESTAMP'),
        last_failed_at: database.raw('CURRENT_TIMESTAMP')
      });
    
    // Get the newly created record
    const newRecord = await database('failed_login_attempts')
      .where('user_id', userId)
      .first();
    
    return newRecord;
  }
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: number): Promise<boolean> {
  const record = await database('failed_login_attempts')
    .where('user_id', userId)
    .whereNotNull('locked_at')
    .first();

  return !!record;
}

/**
 * Lock account by setting locked_at timestamp
 */
export async function lockAccount(userId: number): Promise<void> {
  await database('failed_login_attempts')
    .where('user_id', userId)
    .update({
      locked_at: database.raw('CURRENT_TIMESTAMP'),
      updated_at: database.raw('CURRENT_TIMESTAMP')
    });
}

/**
 * Unlock account by deleting the failed attempts record
 */
export async function unlockAccount(userId: number): Promise<void> {
  await database('failed_login_attempts')
    .where('user_id', userId)
    .del();
}

/**
 * Get failed login attempts info for a user
 */
export async function getFailedAttempts(userId: number): Promise<FailedLoginAttempt | null> {
  const record = await database('failed_login_attempts')
    .where('user_id', userId)
    .first();

  return record || null;
}

/**
 * Check if user should be locked (reached max attempts)
 */
export async function shouldLockAccount(userId: number, maxAttempts: number = 5): Promise<boolean> {
  const record = await getFailedAttempts(userId);
  return record ? record.failed_count >= maxAttempts : false;
}

/**
 * Reset failed attempts after successful login
 */
export async function resetFailedAttempts(userId: number): Promise<void> {
  await unlockAccount(userId);
}

/**
 * Cleanup old records (for maintenance)
 */
export async function cleanupOldRecords(daysOld: number = 30): Promise<number> {
  const deletedCount = await database('failed_login_attempts')
    .where('created_at', '<', database.raw(`DATE_SUB(NOW(), INTERVAL ${daysOld} DAY)`))
    .del();

  return deletedCount;
} 