import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Enhanced R2 Storage with caching support
 * This module provides direct R2 storage operations
 * For cached operations, use cacheManager.ts
 */

// Validate R2 configuration
const validateR2Config = () => {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env

  if (!R2_ENDPOINT) {
    throw new Error('R2_ENDPOINT environment variable is required')
  }
  if (!R2_ACCESS_KEY_ID) {
    throw new Error('R2_ACCESS_KEY_ID environment variable is required')
  }
  if (!R2_SECRET_ACCESS_KEY) {
    throw new Error('R2_SECRET_ACCESS_KEY environment variable is required')
  }
  if (!R2_BUCKET) {
    throw new Error('R2_BUCKET environment variable is required')
  }

  return { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET }
}

// Initialize S3 client with validation
let s3: S3Client | null = null

try {
  const config = validateR2Config()
  s3 = new S3Client({
    region: 'auto',
    endpoint: config.R2_ENDPOINT,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  })
  console.log('✅ R2 Storage: Initialized successfully')
} catch (error) {
  console.error('❌ R2 Storage: Initialization failed', error)
}

/**
 * Get R2 client instance
 */
export function getR2Client(): S3Client {
  if (!s3) {
    throw new Error('R2 client not initialized. Check environment variables.')
  }
  return s3
}

/**
 * Check if R2 is available
 */
export function isR2Available(): boolean {
  return s3 !== null
}

/**
 * Save report/data to R2
 * @param key - The R2 object key
 * @param json - The data to save
 * @param metadata - Optional metadata
 */
export async function saveReportToR2(key: string, json: any, metadata?: Record<string, string>) {
  const client = getR2Client()
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Body: JSON.stringify(json),
    ContentType: 'application/json',
    Metadata: {
      saved_at: new Date().toISOString(),
      ...metadata,
    },
  })

  await client.send(command)
  console.log(`✅ Saved to R2: ${key}`)
}

/**
 * Fetch report/data from R2
 * @param key - The R2 object key
 */
export async function fetchReportFromR2(key: string) {
  const client = getR2Client()
  
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
  })

  const response = await client.send(command)
  const stream = response.Body as Readable
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }

  const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
  console.log(`✅ Fetched from R2: ${key}`)
  return data
}

/**
 * Delete report/data from R2
 * @param key - The R2 object key
 */
export async function deleteReportFromR2(key: string) {
  const client = getR2Client()
  
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
  })

  await client.send(command)
  console.log(`✅ Deleted from R2: ${key}`)
}

/**
 * Check if a key exists in R2
 * @param key - The R2 object key
 */
export async function existsInR2(key: string): Promise<boolean> {
  try {
    const client = getR2Client()
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    })
    await client.send(command)
    return true
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      return false
    }
    throw error
  }
}

/**
 * Generate a unique R2 key for reports
 */
export function generateReportKey(prefix: string = 'reports'): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 10)
  return `${prefix}/${timestamp}-${randomStr}.json`
}
