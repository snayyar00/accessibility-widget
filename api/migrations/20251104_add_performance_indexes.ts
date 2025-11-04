/**
 * Migration: Add composite indexes for analytics performance optimization
 *
 * This migration adds optimized indexes to impressions and unique_visitors tables
 * to dramatically improve dashboard query performance.
 *
 * Expected improvements:
 * - Engagement queries: 2,000ms -> ~250ms (8x faster)
 * - Visitor count: 970ms -> ~120ms (8x faster)
 * - Overall dashboard load: 3,400ms -> ~550ms (6x faster)
 */

import type { Knex } from 'knex'

import { TABLES } from '../constants/database.constant'

const IMPRESSIONS_TABLE = TABLES.impressions
const VISITORS_TABLE = TABLES.visitors

export async function up(knex: Knex): Promise<void> {
  console.log('🚀 Starting performance index migration...')

  // Check if impressions table exists
  const hasImpressionsTable = await knex.schema.hasTable(IMPRESSIONS_TABLE)
  if (!hasImpressionsTable) {
    console.log(`⚠ Table ${IMPRESSIONS_TABLE} does not exist, skipping impressions indexes`)
  } else {
    // Index 1: Composite index for engagement rate queries
    // Optimizes: SELECT ... WHERE site_id = X AND created_at BETWEEN Y AND Z
    const hasEngagementIndex = await knex.raw(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      AND table_name = '${IMPRESSIONS_TABLE}'
      AND index_name = 'idx_impressions_site_date_widgets'
    `)

    if (hasEngagementIndex[0][0].count === 0) {
      console.log(`Adding composite index for engagement queries on ${IMPRESSIONS_TABLE}...`)
      await knex.raw(`
        CREATE INDEX idx_impressions_site_date_widgets
        ON ${IMPRESSIONS_TABLE}(site_id, created_at, widget_opened, widget_closed)
      `)
      console.log(`✓ Added idx_impressions_site_date_widgets to ${IMPRESSIONS_TABLE}`)
    } else {
      console.log(`⚠ Index idx_impressions_site_date_widgets already exists, skipping`)
    }

    // Index 2: Composite index for date-based aggregations (backup/fallback)
    // Optimizes: SELECT ... WHERE created_at >= X GROUP BY DATE(created_at)
    const hasDateIndex = await knex.raw(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      AND table_name = '${IMPRESSIONS_TABLE}'
      AND index_name = 'idx_impressions_date_site'
    `)

    if (hasDateIndex[0][0].count === 0) {
      console.log(`Adding date aggregation index on ${IMPRESSIONS_TABLE}...`)
      await knex.raw(`
        CREATE INDEX idx_impressions_date_site
        ON ${IMPRESSIONS_TABLE}(created_at, site_id)
      `)
      console.log(`✓ Added idx_impressions_date_site to ${IMPRESSIONS_TABLE}`)
    } else {
      console.log(`⚠ Index idx_impressions_date_site already exists, skipping`)
    }
  }

  // Check if unique_visitors table exists
  const hasVisitorsTable = await knex.schema.hasTable(VISITORS_TABLE)
  if (!hasVisitorsTable) {
    console.log(`⚠ Table ${VISITORS_TABLE} does not exist, skipping visitor indexes`)
  } else {
    // Index 3: Optimized site_id index for visitor counting
    // Optimizes: SELECT COUNT(*) FROM unique_visitors WHERE site_id = X
    const hasSiteIndex = await knex.raw(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      AND table_name = '${VISITORS_TABLE}'
      AND index_name = 'idx_visitors_site_only'
    `)

    if (hasSiteIndex[0][0].count === 0) {
      console.log(`Adding site_id index on ${VISITORS_TABLE}...`)
      await knex.raw(`
        CREATE INDEX idx_visitors_site_only
        ON ${VISITORS_TABLE}(site_id)
      `)
      console.log(`✓ Added idx_visitors_site_only to ${VISITORS_TABLE}`)
    } else {
      console.log(`⚠ Index idx_visitors_site_only already exists, skipping`)
    }

    // Index 4: Composite index for visitor date filtering
    // Optimizes: SELECT ... WHERE site_id = X AND first_visit >= Y
    const hasSiteDateIndex = await knex.raw(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      AND table_name = '${VISITORS_TABLE}'
      AND index_name = 'idx_visitors_site_date'
    `)

    if (hasSiteDateIndex[0][0].count === 0) {
      console.log(`Adding composite site+date index on ${VISITORS_TABLE}...`)
      await knex.raw(`
        CREATE INDEX idx_visitors_site_date
        ON ${VISITORS_TABLE}(site_id, first_visit)
      `)
      console.log(`✓ Added idx_visitors_site_date to ${VISITORS_TABLE}`)
    } else {
      console.log(`⚠ Index idx_visitors_site_date already exists, skipping`)
    }
  }

  console.log('✅ Performance index migration completed successfully!')
  console.log('📊 Expected improvements:')
  console.log('   - Engagement queries: ~8x faster')
  console.log('   - Visitor counts: ~8x faster')
  console.log('   - Overall dashboard: ~6x faster')
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏮  Rolling back performance indexes...')

  // Drop impressions indexes
  if (await knex.schema.hasTable(IMPRESSIONS_TABLE)) {
    await knex.schema.alterTable(IMPRESSIONS_TABLE, (table) => {
      table.dropIndex(['site_id', 'created_at', 'widget_opened', 'widget_closed'], 'idx_impressions_site_date_widgets')
      table.dropIndex(['created_at', 'site_id'], 'idx_impressions_date_site')
    })
    console.log(`✓ Dropped indexes from ${IMPRESSIONS_TABLE}`)
  }

  // Drop visitor indexes
  if (await knex.schema.hasTable(VISITORS_TABLE)) {
    await knex.schema.alterTable(VISITORS_TABLE, (table) => {
      table.dropIndex(['site_id'], 'idx_visitors_site_only')
      table.dropIndex(['site_id', 'first_visit'], 'idx_visitors_site_date')
    })
    console.log(`✓ Dropped indexes from ${VISITORS_TABLE}`)
  }

  console.log('✅ Rollback completed')
}
