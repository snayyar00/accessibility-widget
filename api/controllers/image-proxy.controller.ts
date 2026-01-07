import { Request, Response } from 'express'

/**
 * Proxy image fetch to avoid CORS issues
 * Endpoint: POST /proxy-image
 * Body: { imageUrl: string }
 * Returns: { base64: string } - base64 encoded image data URL
 */
export async function proxyImage(req: Request, res: Response): Promise<Response> {
  try {
    const { imageUrl } = req.body

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        error: 'imageUrl is required',
        message: 'Please provide a valid imageUrl in the request body',
      })
    }

    // Validate URL format
    let url: URL
    try {
      url = new URL(imageUrl)
    } catch {
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid image URL',
      })
    }
    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'WebAbility-Image-Proxy/1.0',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch image',
        message: `HTTP ${response.status}: ${response.statusText}`,
      })
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    
    // Determine content type
    const contentType = response.headers.get('content-type') || 'image/png'
    const dataUrl = `data:${contentType};base64,${base64}`

    return res.json({
      success: true,
      base64: dataUrl,
    })
  } catch (error) {
    console.error('Error proxying image:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching the image',
    })
  }
}

