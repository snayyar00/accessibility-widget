import { generateImageUrl } from '@imgproxy/imgproxy-node'

export interface ImageResizeOptions {
  width: number
  height: number
  resizingType?: 'fit' | 'fill' | 'auto'
  gravity?: 'ce' | 'no' | 'so' | 'ea' | 'we' | 'noea' | 'nowe' | 'soea' | 'sowe' | 'sm'
  enlarge?: boolean
  format?: 'jpg' | 'png' | 'webp' | 'avif'
}

/**
 * Generates a signed imgproxy URL with specified resize/crop parameters
 * @param sourceUrl - Original image URL (from R2)
 * @param options - Image processing parameters
 * @returns Signed imgproxy URL
 */
export function generateImgproxyUrl(sourceUrl: string, options: ImageResizeOptions): string {
  if (!sourceUrl) {
    return ''
  }

  // If the URL is already an imgproxy URL, return it as-is (for backwards compatibility)
  if (sourceUrl.includes('/rs:') || sourceUrl.includes('/resize:')) {
    return sourceUrl
  }

  if (!process.env.IMGPROXY_URL || !process.env.IMGPROXY_KEY || !process.env.IMGPROXY_SALT) {
    console.warn('Imgproxy not configured. Returning original URL.')
    return sourceUrl
  }

  const { width, height, resizingType = 'fit', gravity = 'ce', format } = options

  try {
    const imgproxyUrl = generateImageUrl({
      endpoint: process.env.IMGPROXY_URL,
      url: sourceUrl,
      options: {
        resizing_type: resizingType,
        width,
        height,
        gravity: { type: gravity },
        ...(format && { format }),
      },
      salt: process.env.IMGPROXY_SALT,
      key: process.env.IMGPROXY_KEY,
    })

    return imgproxyUrl
  } catch (error) {
    console.error('Failed to generate imgproxy URL:', error)
    return sourceUrl
  }
}

/**
 * Generates a URL for organization logo (520x80)
 */
export function generateOrganizationLogoUrl(sourceUrl: string): string {
  return generateImgproxyUrl(sourceUrl, {
    width: 520,
    height: 80,
    resizingType: 'fit',
    gravity: 'ce',
    enlarge: false,
  })
}

/**
 * Generates a URL for organization favicon (64x64)
 */
export function generateOrganizationFaviconUrl(sourceUrl: string): string {
  return generateImgproxyUrl(sourceUrl, {
    width: 64,
    height: 64,
    resizingType: 'fit',
    gravity: 'ce',
    enlarge: false,
  })
}
