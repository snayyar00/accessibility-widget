import { Request, Response } from 'express'

import { findSiteByURL } from '../repository/sites_allowed.repository'
import { UserProfile } from '../repository/user.repository'
import { addWidgetSettings, getWidgetSettingsBySiteId } from '../repository/widget_settings.repository'
import { canAccessSite } from '../services/allowedSites/allowedSites.service'

export async function updateSiteWidgetSettings(req: Request & { user: UserProfile }, res: Response) {
  const { user } = req
  const { settings, site_url } = req.body

  try {
    const site = await findSiteByURL(site_url)

    if (!site) {
      return res.status(404).json({ error: 'Site not found' })
    }

    const hasAccess = await canAccessSite(user, site)

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to modify this site' })
    }

    await addWidgetSettings({
      site_url,
      allowed_site_id: site?.id,
      settings,
      user_id: site.user_id,
    })

    res.status(200).json('Success')
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getSiteWidgetSettings(req: Request & { user: UserProfile }, res: Response) {
  const { user } = req
  const { site_url } = req.body

  try {
    const site = await findSiteByURL(site_url)

    if (!site) {
      return res.status(404).json({ error: 'Site not found' })
    }

    const hasAccess = await canAccessSite(user, site)

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to view this site' })
    }

    const widgetSettings = await getWidgetSettingsBySiteId(site?.id)
    const response = widgetSettings?.settings || {}

    res.status(200).json({ settings: response })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
