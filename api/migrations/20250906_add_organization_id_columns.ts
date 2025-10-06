/**
 * Migration: Add organization_id column to multiple tables and update user_notifications unique key
 * Tables: allowed_sites, cancel_feedback, user_notifications, user_plan_tokens
 *
 * Changes:
 * 1. Adds organization_id column to all tables
 * 2. Replaces user_notifications unique key from (user_id) to (user_id, organization_id)
 *    This allows users to have different notification settings per organization
 */

import type { Knex } from 'knex'

import { IS_DEV, IS_LOCAL } from '../config/env'
import { TABLES as DB_TABLES } from '../constants/database.constant'

// Configuration
const TABLES = [DB_TABLES.allowed_sites, DB_TABLES.cancelFeedback, DB_TABLES.userNotifications, DB_TABLES.userPlanTokens]
const COLUMN_NAME = 'organization_id'
const DEFAULT_ORGANIZATION_ID = IS_LOCAL || IS_DEV ? 83 : 1

export async function up(knex: Knex): Promise<void> {
  for (const tableName of TABLES) {
    const hasColumn = await knex.schema.hasColumn(tableName, COLUMN_NAME)

    if (!hasColumn) {
      console.log(`Adding ${COLUMN_NAME} to ${tableName}...`)

      // Add column without default value (nullable)
      await knex.schema.alterTable(tableName, (t) => {
        t.integer(COLUMN_NAME).nullable()
      })

      // Add index separately for better performance
      await knex.schema.alterTable(tableName, (t) => {
        t.index(COLUMN_NAME, `idx_${tableName}_${COLUMN_NAME}`)
      })

      // Backfill existing rows with default organization_id
      const updateCount = await knex(tableName)
        .whereNull(COLUMN_NAME)
        .update({ [COLUMN_NAME]: DEFAULT_ORGANIZATION_ID })
      console.log(`  Updated ${updateCount} rows with organization_id=${DEFAULT_ORGANIZATION_ID}`)

      // Add FK constraint after data is populated
      await knex.schema.alterTable(tableName, (t) => {
        t.foreign(COLUMN_NAME, `fk_${tableName}_${COLUMN_NAME}`).references('id').inTable('organizations').onDelete('SET NULL')
      })

      console.log(`✓ Added ${COLUMN_NAME} to ${tableName}`)
    } else {
      console.log(`⚠ Column ${COLUMN_NAME} already exists in ${tableName}, skipping`)
    }
  }

  // Update unique key for user_notifications: replace user_id unique with composite (user_id, organization_id)
  console.log('Updating unique keys for user_notifications...')

  // Step 1: Check and remove old user_id UNIQUE key
  const hasOldUniqueKey = await knex.raw(`
    SELECT COUNT(*) as count 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = '${DB_TABLES.userNotifications}' 
      AND index_name = 'user_id'
      AND non_unique = 0
  `)

  if (hasOldUniqueKey[0][0].count > 0) {
    console.log('  Found old unique key on user_id, need to remove it...')

    // Find FK constraints that might be using this index
    const fkConstraints = await knex.raw(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${DB_TABLES.userNotifications}'
        AND COLUMN_NAME = 'user_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `)

    // Drop FK constraints temporarily
    for (const fk of fkConstraints[0]) {
      console.log(`  Dropping FK constraint: ${fk.CONSTRAINT_NAME}`)
      await knex.raw(`ALTER TABLE ${DB_TABLES.userNotifications} DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``)
    }

    // Now we can drop the unique index
    console.log('  Dropping old unique key on user_id...')
    await knex.raw(`ALTER TABLE ${DB_TABLES.userNotifications} DROP INDEX \`user_id\``)

    // Check if regular index already exists before creating
    const hasRegularIndex = await knex.raw(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
        AND table_name = '${DB_TABLES.userNotifications}' 
        AND index_name = 'idx_user_notifications_user_id'
    `)

    if (hasRegularIndex[0][0].count === 0) {
      // Create regular index for FK performance (non-unique)
      console.log('  Creating regular index on user_id for FK performance...')
      await knex.schema.alterTable(DB_TABLES.userNotifications, (t) => {
        t.index(['user_id'], 'idx_user_notifications_user_id')
      })
    } else {
      console.log('  ⚠ Regular index on user_id already exists, skipping creation')
    }

    // Restore FK constraints
    for (const fk of fkConstraints[0]) {
      console.log(`  Restoring FK constraint: ${fk.CONSTRAINT_NAME}`)
      await knex.raw(`
        ALTER TABLE ${DB_TABLES.userNotifications} 
        ADD CONSTRAINT \`${fk.CONSTRAINT_NAME}\` 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `)
    }

    console.log('  ✓ Removed old user_id unique key')
  } else {
    console.log('  ⚠ Old user_id unique key does not exist')
  }

  // Step 2: Add composite unique key
  const hasCompositeKey = await knex.raw(`
    SELECT COUNT(*) as count 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = '${DB_TABLES.userNotifications}' 
      AND index_name = 'user_notifications_user_id_organization_id_unique'
  `)

  if (hasCompositeKey[0][0].count === 0) {
    // Clean up any duplicate rows that would violate the new constraint
    console.log('  Cleaning up potential duplicates...')
    await knex.raw(`
      DELETE t1 FROM ${DB_TABLES.userNotifications} t1
      INNER JOIN ${DB_TABLES.userNotifications} t2 
      WHERE t1.id > t2.id 
        AND t1.user_id = t2.user_id 
        AND t1.organization_id = t2.organization_id
    `)

    console.log('  Adding composite unique key on (user_id, organization_id)...')
    await knex.schema.alterTable(DB_TABLES.userNotifications, (t) => {
      t.unique(['user_id', 'organization_id'], 'user_notifications_user_id_organization_id_unique')
    })
    console.log('✓ Updated unique keys for user_notifications')
  } else {
    console.log('⚠ Composite unique key already exists, skipping')
  }
}

export async function down(knex: Knex): Promise<void> {
  // Restore unique keys for user_notifications
  console.log('Restoring unique keys for user_notifications...')

  // Step 1: Drop composite unique key
  const hasCompositeKey = await knex.raw(`
    SELECT COUNT(*) as count 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = '${DB_TABLES.userNotifications}' 
      AND index_name = 'user_notifications_user_id_organization_id_unique'
  `)

  if (hasCompositeKey[0][0].count > 0) {
    console.log('  Dropping composite unique key on (user_id, organization_id)...')
    await knex.schema.alterTable(DB_TABLES.userNotifications, (t) => {
      t.dropUnique(['user_id', 'organization_id'], 'user_notifications_user_id_organization_id_unique')
    })
    console.log('  ✓ Dropped composite unique key')
  } else {
    console.log('  ⚠ Composite unique key does not exist')
  }

  // Step 2: Restore old user_id unique key
  const hasOldUniqueKey = await knex.raw(`
    SELECT COUNT(*) as count 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = '${DB_TABLES.userNotifications}' 
      AND index_name = 'user_id'
      AND non_unique = 0
  `)

  if (hasOldUniqueKey[0][0].count === 0) {
    console.log('  Removing duplicate rows (keeping one per user_id)...')
    await knex.raw(`
      DELETE t1 FROM ${DB_TABLES.userNotifications} t1
      INNER JOIN ${DB_TABLES.userNotifications} t2 
      WHERE t1.id > t2.id AND t1.user_id = t2.user_id
    `)

    console.log('  Restoring old unique key on user_id...')
    await knex.schema.alterTable(DB_TABLES.userNotifications, (t) => {
      t.unique(['user_id'], 'user_id')
    })
    console.log('✓ Restored unique keys for user_notifications')
  } else {
    console.log('⚠ Old user_id unique key already exists')
  }

  for (const tableName of TABLES) {
    const hasColumn = await knex.schema.hasColumn(tableName, COLUMN_NAME)

    if (hasColumn) {
      console.log(`Removing ${COLUMN_NAME} from ${tableName}...`)

      await knex.schema.alterTable(tableName, (t) => {
        // Drop FK first
        try {
          t.dropForeign(COLUMN_NAME, `fk_${tableName}_${COLUMN_NAME}`)
        } catch (e) {
          console.log(`⚠ FK not found for ${COLUMN_NAME} in ${tableName}:`, (e as Error).message)
        }

        // Drop index
        try {
          t.dropIndex(COLUMN_NAME, `idx_${tableName}_${COLUMN_NAME}`)
        } catch (e) {
          console.log(`⚠ Index not found for ${COLUMN_NAME} in ${tableName}:`, (e as Error).message)
        }

        // Drop column
        t.dropColumn(COLUMN_NAME)
      })

      console.log(`✓ Removed ${COLUMN_NAME} from ${tableName}`)
    }
  }
}
