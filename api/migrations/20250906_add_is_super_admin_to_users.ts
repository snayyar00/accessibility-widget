/**
 * Migration: Add is_super_admin column to users table
 */

import type { Knex } from 'knex'

import { TABLES } from '../constants/database.constant'

const TABLE_NAME = TABLES.users
const COLUMN_NAME = 'is_super_admin'

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn(TABLE_NAME, COLUMN_NAME)

  if (!hasColumn) {
    console.log(`Adding ${COLUMN_NAME} to ${TABLE_NAME}...`)

    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.boolean(COLUMN_NAME).notNullable().defaultTo(false)
    })

    // Add index for faster queries filtering by super admins
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.index(COLUMN_NAME, `idx_${TABLE_NAME}_${COLUMN_NAME}`)
    })

    console.log(`✓ Added ${COLUMN_NAME} to ${TABLE_NAME}`)
  } else {
    console.log(`⚠ Column ${COLUMN_NAME} already exists in ${TABLE_NAME}, skipping`)
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn(TABLE_NAME, COLUMN_NAME)

  if (hasColumn) {
    console.log(`Removing ${COLUMN_NAME} from ${TABLE_NAME}...`)

    await knex.schema.alterTable(TABLE_NAME, (table) => {
      // Drop index first
      try {
        table.dropIndex(COLUMN_NAME, `idx_${TABLE_NAME}_${COLUMN_NAME}`)
      } catch (e) {
        console.log(`⚠ Index not found for ${COLUMN_NAME}:`, (e as Error).message)
      }

      // Drop column
      table.dropColumn(COLUMN_NAME)
    })

    console.log(`✓ Removed ${COLUMN_NAME} from ${TABLE_NAME}`)
  }
}
