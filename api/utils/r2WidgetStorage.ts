import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
// uuid import no longer needed since we write deterministic key

// Extract base endpoint from the widget customization endpoint
const getBaseEndpoint = () => {
  const widgetEndpoint = process.env.R2_BUCKET_WIDGET_CUSTOMIZATION_ENDPOINT!
  // Remove the bucket name from the end to get base endpoint
  return widgetEndpoint.replace('/widget-customization', '')
}

// Public URL base (e.g., custom domain like https://widget-customiaztion.trywebability.com)
function getPublicBase(): string {
  return process.env.R2_BUCKET_WIDGET_CUSTOMIZATION_PUBLIC_BASE || process.env.R2_BUCKET_WIDGET_CUSTOMIZATION_ENDPOINT || ''
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: getBaseEndpoint(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * Upload widget logo to R2 storage
 * @param buffer - Image buffer
 * @param contentType - MIME type (image/png, image/svg+xml, image/webp, image/jpeg)
 * @param siteId - Site ID for organizing files
 * @returns Promise<string> - The public URL of the uploaded file
 */
export async function uploadWidgetLogoToR2(buffer: Buffer, contentType: string, siteId: number): Promise<string> {
  // Generate unique filename with original extension
  const fileExtension = getFileExtension(contentType)
  // Ensure only one object exists per site: clear existing files then write deterministic key
  await deleteAllForSite(siteId)
  const fileName = `${siteId}/logo.${fileExtension}`

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_WIDGET_CUSTOMIZATION!,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
    // Add cache headers for better performance
    CacheControl: 'public, max-age=31536000', // 1 year cache
  })

  await s3.send(command)

  // Return the public URL using the custom/public base when available
  return `${getPublicBase()}/${fileName}`
}

/**
 * Remove all objects under a site's prefix so there is always only one logo
 */
async function deleteAllForSite(siteId: number): Promise<void> {
  try {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_WIDGET_CUSTOMIZATION!,
        Prefix: `${siteId}/`,
      }),
    )

    const objects = list.Contents || []
    if (!objects.length) return

    const toDelete = objects.map((o) => ({ Key: o.Key! }))
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_WIDGET_CUSTOMIZATION!,
        Delete: { Objects: toDelete },
      }),
    )
  } catch (e) {
    console.warn('Failed to cleanup existing site logo objects:', e)
  }
}

/**
 * Delete widget logo from R2 storage
 * @param logoUrl - The full URL of the logo to delete
 */
export async function deleteWidgetLogoFromR2(logoUrl: string): Promise<void> {
  try {
    // Support both public custom domain and Cloudflare storage endpoint
    const publicBase = `${getPublicBase()}/`
    const cfBase = `${process.env.R2_BUCKET_WIDGET_CUSTOMIZATION_ENDPOINT}/`

    let key: string | null = null
    if (logoUrl.startsWith(publicBase)) key = logoUrl.replace(publicBase, '')
    else if (logoUrl.startsWith(cfBase)) key = logoUrl.replace(cfBase, '')
    else return

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_WIDGET_CUSTOMIZATION!,
      Key: key!,
    })

    await s3.send(command)
  } catch (error) {
    console.error('Error deleting logo from R2:', error)
    // Don't throw error to prevent breaking the main flow
  }
}

/**
 * Convert base64 data URL to buffer
 * @param base64DataUrl - Base64 data URL (data:image/png;base64,...)
 * @returns Object with buffer and contentType
 */
export function base64ToBuffer(base64DataUrl: string): { buffer: Buffer; contentType: string } {
  const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/)

  if (!matches) {
    throw new Error('Invalid base64 data URL format')
  }

  const contentType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, 'base64')

  return { buffer, contentType }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png'
    case 'image/svg+xml':
      return 'svg'
    case 'image/webp':
      return 'webp'
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    default:
      return 'png'
  }
}

/**
 * Validate image file type and size
 */
export function validateImageFile(buffer: Buffer, contentType: string): { valid: boolean; error?: string } {
  const validTypes = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']

  if (!validTypes.includes(contentType)) {
    return { valid: false, error: 'Only PNG, SVG, WebP, and JPEG images are allowed.' }
  }

  // 75 KB limit
  if (buffer.length > 76800) {
    return { valid: false, error: 'File size should not exceed 75 KB.' }
  }

  return { valid: true }
}
