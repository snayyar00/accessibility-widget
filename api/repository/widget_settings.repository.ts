import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

const TABLE = TABLES.widgetSettings

export const widgetSettingsColumns = {
  id: 'widget_settings.id',
  site_url: 'widget_settings.site_url',
  allowed_site_id: 'widget_settings.allowed_site_id',
  settings: 'widget_settings.settings',
  user_id: 'widget_settings.user_id',
  created_at: 'widget_settings.created_at',
  updated_at: 'widget_settings.updated_at',
}

export type widgetSettingsProps = {
  site_url: string
  allowed_site_id: number
  settings: string
  user_id: number
}

export async function addWidgetSettings(settings: widgetSettingsProps) {
  // Extract columns from the settings object.
  const columns = Object.keys(settings)
  const placeholders = columns.map(() => '?').join(', ')

  // Exclude allowed_site_id from the update clause since it's used as the unique key.
  const updateColumns = columns.filter((col) => col !== 'allowed_site_id')
  const updateClause = updateColumns.map((col) => `${col} = VALUES(${col})`).join(', ')

  const query = `
      INSERT INTO widget_settings (${columns.join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateClause};
    `

  const values = Object.values(settings)
  return database.raw(query, values)
}

export async function getWidgetSettingsBySiteId(site_id: number) {
  return database(TABLE).select(widgetSettingsColumns).where('allowed_site_id', site_id).first()
}
