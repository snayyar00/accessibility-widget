import { Request, Response } from 'express'

import { findSiteByURL } from '../repository/sites_allowed.repository'
import { addWidgetSettings, getWidgetSettingsBySiteId } from '../repository/widget_settings.repository'

export async function updateSiteWidgetSettings(req: Request, res: Response) {
  // const { user } = req as any
  const { settings, site_url } = req.body

  try {
    if (!site_url) {
      return res.status(400).json({ error: 'site_url is required' })
    }
    const site = await findSiteByURL(site_url)
    if (!site) {
      return res.status(404).json({ error: 'Site not found' })
    }

    // if (!site || site.user_id !== user.id) {
    //   return res.status(403).json({ error: 'User does not own this site' })
    // }

    // No implicit uploads here: frontend must upload file via /upload-logo
    // Accept stringified JSON or object and store as string
    const processedSettings = typeof settings === 'string' ? settings : JSON.stringify(settings || {})

    await addWidgetSettings({
      site_url,
      allowed_site_id: site.id,
      settings: processedSettings,
      user_id: site.user_id,
    })

    res.status(200).json('Success')
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getSiteWidgetSettings(req: Request, res: Response) {
  // const { user } = req as any
  const { site_url } = req.body

  try {
    const site = await findSiteByURL(site_url)

    // if (site?.user_id !== user.id) {
    //   return res.status(403).json({ error: 'User does not own this site' })
    // }

    const widgetSettings = await getWidgetSettingsBySiteId(site?.id)
    const response = widgetSettings?.settings || {}

    res.status(200).json({ settings: response })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
