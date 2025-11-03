import { Request, Response } from 'express'

import { findSiteByURL } from '../repository/sites_allowed.repository'
import { addWidgetSettings, getWidgetSettingsBySiteId } from '../repository/widget_settings.repository'
import { uploadWidgetLogoToR2, base64ToBuffer, validateImageFile, deleteWidgetLogoFromR2 } from '../utils/r2WidgetStorage'

export async function updateSiteWidgetSettings(req: Request, res: Response) {
  // const { user } = req as any
  const { settings, site_url } = req.body

  try {
    const site = await findSiteByURL(site_url)

    // if (!site || site.user_id !== user.id) {
    //   return res.status(403).json({ error: 'User does not own this site' })
    // }

    let processedSettings = settings

    // Handle logo upload to R2 if logoImage is base64
    if (typeof settings === 'string') {
      const settingsObj = JSON.parse(settings)
      
      if (settingsObj.logoImage && settingsObj.logoImage.startsWith('data:image/')) {
        try {
          // Convert base64 to buffer
          const { buffer, contentType } = base64ToBuffer(settingsObj.logoImage)
          
          // Validate the image
          const validation = validateImageFile(buffer, contentType)
          if (!validation.valid) {
            return res.status(400).json({ error: validation.error })
          }
          
          // Get current settings to check for existing logo
          const currentSettings = await getWidgetSettingsBySiteId(site?.id)
          if (currentSettings?.settings) {
            const currentSettingsObj = typeof currentSettings.settings === 'string' 
              ? JSON.parse(currentSettings.settings) 
              : currentSettings.settings
            
            // Delete old logo if it exists and is an R2 URL
            if (currentSettingsObj.logoImage && currentSettingsObj.logoImage.startsWith('http')) {
              await deleteWidgetLogoFromR2(currentSettingsObj.logoImage)
            }
          }
          
          // Upload to R2
          const logoUrl = await uploadWidgetLogoToR2(buffer, contentType, site?.id)
          
          // Replace base64 with R2 URL
          settingsObj.logoImage = logoUrl
          processedSettings = JSON.stringify(settingsObj)
          
        } catch (uploadError) {
          console.error('Error uploading logo to R2:', uploadError)
          return res.status(500).json({ error: 'Failed to upload logo' })
        }
      }
    }

    await addWidgetSettings({
      site_url,
      allowed_site_id: site?.id,
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
