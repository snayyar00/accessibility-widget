import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return (
    knex.schema
      .createTable('accessibility_issues', (table) => {
        // Primary key
        table.string('id', 255).primary()

        // Core fields
        table.string('urlid', 255).notNullable().index()
        table.text('url').notNullable()
        table.text('issue').notNullable()
        table.text('fix').notNullable()

        // Status and priority
        table.boolean('is_applied').defaultTo(false).index()
        table.enum('kind_of_change', ['add', 'update', 'review']).nullable()

        // Timestamps
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
      })
      // Additional index for URL (first 255 chars for TEXT fields in MySQL)
      .raw('CREATE INDEX idx_url ON accessibility_issues (url(255))')
  )
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('accessibility_issues')
}
