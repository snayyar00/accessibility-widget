import { Request, Response } from 'express'
import multer from 'multer'

import { findSiteByURL } from '../repository/sites_allowed.repository'
import { addWidgetSettings, getWidgetSettingsBySiteId } from '../repository/widget_settings.repository'
import { deleteWidgetLogoFromR2, uploadWidgetLogoToR2, validateImageFile } from '../utils/r2WidgetStorage'

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 76800, // 75 KB limit
  },
  fileFilter: (req, file, cb) => {
    const validTypes = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']
    if (validTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only PNG, SVG, WebP, and JPEG images are allowed.'))
    }
  },
})

export const uploadMiddleware = upload.single('logo')

// Separate middleware for widget icon uploads (field name: "icon")
export const uploadIconMiddleware = upload.single('icon')

/**
 * Upload widget logo to R2 and return the URL
 */
export async function uploadWidgetLogo(req: Request, res: Response) {
  try {
    const { site_url } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    if (!site_url) {
      return res.status(400).json({ error: 'site_url is required' })
    }

    // Find the site
    const site = await findSiteByURL(site_url)
    if (!site) {
      return res.status(404).json({ error: 'Site not found' })
    }

    // Validate the image
    const validation = validateImageFile(file.buffer, file.mimetype)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    // Get current settings to check for existing logo
    const currentSettings = await getWidgetSettingsBySiteId(site.id)
    if (currentSettings?.settings) {
      const currentSettingsObj = typeof currentSettings.settings === 'string' ? JSON.parse(currentSettings.settings) : currentSettings.settings

      // Delete old logo if it exists and is an R2 URL
      if (currentSettingsObj.logoImage && currentSettingsObj.logoImage.startsWith('http')) {
        await deleteWidgetLogoFromR2(currentSettingsObj.logoImage)
      }
    }

    // Upload to R2
    const logoUrl = await uploadWidgetLogoToR2(file.buffer, file.mimetype, site.id)
    const cleanLogoUrl = (logoUrl || '').replace(/\/$/, '')

    // Update the settings with the new logo URL (create if missing)
    const baseSettingsObj = currentSettings?.settings ? (typeof currentSettings.settings === 'string' ? JSON.parse(currentSettings.settings) : currentSettings.settings) : {}

    baseSettingsObj.logoImage = cleanLogoUrl

    await addWidgetSettings({
      site_url,
      allowed_site_id: site.id,
      settings: JSON.stringify(baseSettingsObj),
      user_id: site.user_id,
    })

    res.status(200).json({
      success: true,
      logoUrl: cleanLogoUrl,
      message: 'Logo uploaded successfully',
    })
  } catch (error) {
    console.error('Error uploading widget logo:', error)
    res.status(500).json({ error: 'Failed to upload logo' })
  }
}

/**
 * Upload widget launcher icon to R2 and return the URL.
 * This stores the URL under the `widgetIcon` key in widget settings.
 */
export async function uploadWidgetIcon(req: Request, res: Response) {
  try {
    const { site_url } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    if (!site_url) {
      return res.status(400).json({ error: 'site_url is required' })
    }

    // Find the site
    const site = await findSiteByURL(site_url)
    if (!site) {
      return res.status(404).json({ error: 'Site not found' })
    }

    // Validate the image (SVG, PNG, etc., with 75 KB limit)
    const validation = validateImageFile(file.buffer, file.mimetype)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    // Get current settings to check for existing icon
    const currentSettings = await getWidgetSettingsBySiteId(site.id)
    const baseSettingsObj = currentSettings?.settings
      ? typeof currentSettings.settings === 'string'
        ? JSON.parse(currentSettings.settings)
        : currentSettings.settings
      : {}

    // Delete old icon from R2 if present
    if (baseSettingsObj.widgetIcon && typeof baseSettingsObj.widgetIcon === 'string' && baseSettingsObj.widgetIcon.startsWith('http')) {
      await deleteWidgetLogoFromR2(baseSettingsObj.widgetIcon)
    }

    // Upload new icon to R2
    const iconUrl = await uploadWidgetLogoToR2(file.buffer, file.mimetype, site.id)
    const cleanIconUrl = (iconUrl || '').replace(/\/$/, '')

    // Persist new icon URL under widgetIcon key
    baseSettingsObj.widgetIcon = cleanIconUrl

    await addWidgetSettings({
      site_url,
      allowed_site_id: site.id,
      settings: JSON.stringify(baseSettingsObj),
      user_id: site.user_id,
    })

    res.status(200).json({
      success: true,
      iconUrl: cleanIconUrl,
      message: 'Widget icon uploaded successfully',
    })
  } catch (error) {
    console.error('Error uploading widget icon:', error)
    res.status(500).json({ error: 'Failed to upload widget icon' })
  }
}

/**
 * Delete widget launcher icon from R2
 */
export async function deleteWidgetIcon(req: Request, res: Response) {
  try {
    const { site_url, icon_url } = req.body

    if (!site_url || !icon_url) {
      return res.status(400).json({ error: 'site_url and icon_url are required' })
    }

    const site = await findSiteByURL(site_url)
    if (!site) {
      return res.status(404).json({ error: 'Site not found' })
    }

    await deleteWidgetLogoFromR2(icon_url)

    const currentSettings = await getWidgetSettingsBySiteId(site.id)
    const settingsWhenDeleting = currentSettings?.settings
      ? typeof currentSettings.settings === 'string'
        ? JSON.parse(currentSettings.settings)
        : currentSettings.settings
      : {}

    settingsWhenDeleting.widgetIcon = ''

    await addWidgetSettings({
      site_url,
      allowed_site_id: site.id,
      settings: JSON.stringify(settingsWhenDeleting),
      user_id: site.user_id,
    })

    res.status(200).json({
      success: true,
      message: 'Widget icon deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting widget icon:', error)
    res.status(500).json({ error: 'Failed to delete widget icon' })
  }
}

/**
 * Delete widget logo from R2
 */
export async function deleteWidgetLogo(req: Request, res: Response) {
  try {
    const { site_url, logo_url } = req.body

    if (!site_url || !logo_url) {
      return res.status(400).json({ error: 'site_url and logo_url are required' })
    }

    // Find the site
    const site = await findSiteByURL(site_url)
    if (!site) {
      return res.status(404).json({ error: 'Site not found' })
    }

    // Delete from R2
    await deleteWidgetLogoFromR2(logo_url)

    // Update settings to remove logo (no-op create keeps other fields intact)
    const currentSettings = await getWidgetSettingsBySiteId(site.id)
    const settingsWhenDeleting = currentSettings?.settings ? (typeof currentSettings.settings === 'string' ? JSON.parse(currentSettings.settings) : currentSettings.settings) : {}

    settingsWhenDeleting.logoImage = ''

    await addWidgetSettings({
      site_url,
      allowed_site_id: site.id,
      settings: JSON.stringify(settingsWhenDeleting),
      user_id: site.user_id,
    })

    res.status(200).json({
      success: true,
      message: 'Logo deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting widget logo:', error)
    res.status(500).json({ error: 'Failed to delete logo' })
  }
}
