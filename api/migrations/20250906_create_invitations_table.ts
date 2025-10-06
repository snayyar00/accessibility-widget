/**
 * Migration: Create invitations table
 * For managing organization and workspace invitations
 */

import type { Knex } from 'knex'

import { TABLES } from '../constants/database.constant'

const TABLE_NAME = TABLES.invitations

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(TABLE_NAME)

  if (!hasTable) {
    console.log(`Creating ${TABLE_NAME} table...`)

    await knex.schema.createTable(TABLE_NAME, (table) => {
      // Primary key
      table.increments('id').primary()

      // Email of the invited user
      table.string('email', 255).notNullable().index()

      // Type of invitation
      table.enum('type', ['organization', 'workspace']).notNullable()

      // Foreign keys (nullable because invitation can be for either organization OR workspace)
      table.integer('organization_id').nullable()
      table.integer('workspace_id').nullable()

      // Roles (nullable, depends on invitation type)
      table.string('organization_role', 50).nullable()
      table.string('workspace_role', 50).nullable()

      // Invitation status
      table.enum('status', ['pending', 'accepted', 'declined', 'expired']).notNullable().defaultTo('pending').index()

      // Unique invitation token
      table.string('token', 255).notNullable().unique().index()

      // Who invited (references users.id which is int unsigned)
      table.integer('invited_by_id').unsigned().notNullable()

      // Expiration and acceptance tracking
      table.timestamp('valid_until').notNullable()
      table.timestamp('accepted_at').nullable()
      table.integer('accepted_by_id').unsigned().nullable()

      // Timestamps
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      table.timestamp('created_at').defaultTo(knex.fn.now())

      // Foreign key constraints
      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')
      table.foreign('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE')
      table.foreign('invited_by_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('accepted_by_id').references('id').inTable('users').onDelete('SET NULL')
    })

    // Create composite indexes for performance
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      // Index for finding pending invitations by organization
      table.index(['organization_id', 'status'], 'idx_invitations_org_status')

      // Index for finding pending invitations by workspace
      table.index(['workspace_id', 'status'], 'idx_invitations_workspace_status')

      // Index for finding invitations by email and status
      table.index(['email', 'status'], 'idx_invitations_email_status')

      // Index for finding invitations by type
      table.index(['type', 'status'], 'idx_invitations_type_status')

      // Index for expired invitations cleanup
      table.index(['status', 'valid_until'], 'idx_invitations_status_valid')
    })

    console.log(`✓ Created ${TABLE_NAME} table with indexes and foreign keys`)
  } else {
    console.log(`⚠ Table ${TABLE_NAME} already exists, skipping`)
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(TABLE_NAME)

  if (hasTable) {
    console.log(`Dropping ${TABLE_NAME} table...`)
    await knex.schema.dropTable(TABLE_NAME)
    console.log(`✓ Dropped ${TABLE_NAME} table`)
  }
}
