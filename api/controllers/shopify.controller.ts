import crypto from 'crypto'
import { Request, Response } from 'express'

// HMAC verification function for Shopify webhooks
function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string): boolean {
  const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET

  if (!shopifySecret) {
    console.error('SHOPIFY_WEBHOOK_SECRET not configured')
    return false
  }

  const calculatedHmac = crypto.createHmac('sha256', shopifySecret).update(rawBody).digest('base64')

  return crypto.timingSafeEqual(Buffer.from(hmacHeader, 'base64'), Buffer.from(calculatedHmac, 'base64'))
}

// Main compliance webhook handler
export const handleComplianceWebhook = async (req: Request, res: Response) => {
  try {
    // req.body should be a Buffer due to express.raw middleware in server.ts
    let rawBody: Buffer
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body
    } else {
      // Fallback: convert object back to JSON string then to Buffer
      rawBody = Buffer.from(JSON.stringify(req.body))
    }

    // 1. Verify HMAC signature (REQUIRED)
    const hmac = req.get('X-Shopify-Hmac-Sha256')
    if (!hmac || !verifyShopifyWebhook(rawBody, hmac)) {
      console.warn('Shopify webhook HMAC verification failed', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        hmacProvided: !!hmac,
      })
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // 2. Parse the webhook payload
    const payload = JSON.parse(rawBody.toString())
    const topic = req.get('X-Shopify-Topic')
    const shopDomain = req.get('X-Shopify-Shop-Domain')
    const webhookId = req.get('X-Shopify-Webhook-Id')
    const triggeredAt = req.get('X-Shopify-Triggered-At')

    // 3. Log for audit trail (REQUIRED)
    console.log('Shopify compliance webhook received:', {
      topic,
      shop_id: payload.shop_id,
      shop_domain: payload.shop_domain || shopDomain,
      webhook_id: webhookId,
      triggered_at: triggeredAt,
      timestamp: new Date().toISOString(),
    })

    // 4. Handle each compliance topic
    switch (topic) {
      case 'customers/data_request':
        // Since no personal data is collected, return empty data
        console.log('Processing customer data request:', {
          customer_id: payload.customer?.id,
          shop_id: payload.shop_id,
          data_request_id: payload.data_request?.id,
        })

        return res.status(200).json({
          customer_id: payload.customer?.id,
          data: {},
          message: 'No personal data collected for this customer',
        })

      case 'customers/redact':
        // Since no personal data is stored, acknowledge completion
        console.log('Processing customer redaction request:', {
          customer_id: payload.customer?.id,
          shop_id: payload.shop_id,
          orders_to_redact: payload.orders_to_redact,
        })

        return res.status(200).json({
          customer_id: payload.customer?.id,
          status: 'completed',
          message: 'No personal data to redact',
        })

      case 'shop/redact':
        // Since no shop-specific data is stored, acknowledge completion
        console.log('Processing shop redaction request:', {
          shop_id: payload.shop_id,
          shop_domain: payload.shop_domain,
        })

        return res.status(200).json({
          shop_id: payload.shop_id,
          status: 'completed',
          message: 'No shop data to redact',
        })

      default:
        console.warn('Unknown Shopify compliance topic received:', {
          topic,
          shop_id: payload.shop_id,
          timestamp: new Date().toISOString(),
        })

        return res.status(400).json({
          error: 'Unknown compliance topic',
          topic: topic,
        })
    }
  } catch (error) {
    console.error('Error processing Shopify compliance webhook:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    return res.status(500).json({
      error: 'Internal server error processing compliance webhook',
    })
  }
}
