import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import logger from '../utils/logger'

export interface AutoFix {
  selector: string
  action: string
  attributes: {
    [key: string]: string
  }
  issue_type: string
}

export interface AutoFixesRecord {
  id?: number
  url: string
  deleted_fixes: AutoFix[] | null
  created_at?: Date
  updated_at?: Date
}

/**
 * Normalize URL for consistent storage and lookup
 * Removes trailing slash and normalizes protocol
 */
function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }
  
  let normalized = url.trim()
  
  // Validate URL format (basic check)
  if (normalized.length > 2048) {
    logger.warn(`URL exceeds maximum length: ${normalized.length} characters`)
    normalized = normalized.substring(0, 2048)
  }
  
  // Ensure protocol
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`
  }
  
  // Remove trailing slash (but keep protocol slashes)
  // This handles both root domains and paths consistently
  normalized = normalized.replace(/\/+$/, '')
  
  return normalized
}

/**
 * Find auto fixes record by URL
 */
export async function findAutoFixesByUrl(url: string): Promise<AutoFixesRecord | null> {
  try {
    const normalizedUrl = normalizeUrl(url)
    
    if (!normalizedUrl) {
      return null
    }
    
    const record = await database(TABLES.autoFixesRecords)
      .where({ url: normalizedUrl })
      .first()

    if (!record) {
      return null
    }

    let deletedFixes: AutoFix[] | null = null
    if (record.deleted_fixes) {
      try {
        deletedFixes = JSON.parse(record.deleted_fixes) as AutoFix[]
      } catch (parseError) {
        // Log error but don't fail - return null for deleted_fixes
        logger.error('Error parsing deleted_fixes JSON:', parseError)
        deletedFixes = null
      }
    }

    return {
      ...record,
      deleted_fixes: deletedFixes,
    }
  } catch (error) {
    logger.error('Error finding auto fixes by URL:', error)
    throw error
  }
}

/**
 * Get deleted fixes for a URL (used to filter out from API response)
 */
export async function getDeletedFixes(url: string): Promise<AutoFix[]> {
  try {
    const normalizedUrl = normalizeUrl(url)
    
    if (!normalizedUrl) {
      return []
    }
    
    const record = await findAutoFixesByUrl(normalizedUrl)
    return record?.deleted_fixes || []
  } catch (error) {
    logger.error('Error getting deleted fixes:', error)
    // Return empty array on error to not break the flow
    return []
  }
}


/**
 * Update deleted fixes (user marks fixes as unwanted)
 * Only stores deleted fixes - removes them from active display
 */
export async function updateDeletedFixes(
  url: string,
  deletedFixes: AutoFix[],
): Promise<AutoFixesRecord> {
  try {
    // Validate input
    if (!Array.isArray(deletedFixes)) {
      throw new Error('deletedFixes must be an array')
    }
    
    const normalizedUrl = normalizeUrl(url)
    
    if (!normalizedUrl) {
      throw new Error('Invalid URL provided')
    }
    
    const existing = await findAutoFixesByUrl(normalizedUrl)

    if (!existing) {
      // Create new record if it doesn't exist
      const [id] = await database(TABLES.autoFixesRecords).insert({
        url: normalizedUrl,
        deleted_fixes: JSON.stringify(deletedFixes),
      })

      return {
        id,
        url: normalizedUrl,
        deleted_fixes: deletedFixes,
        created_at: new Date(),
        updated_at: new Date(),
      }
    }

    await database(TABLES.autoFixesRecords)
      .where({ url: normalizedUrl })
      .update({
        deleted_fixes: JSON.stringify(deletedFixes),
        updated_at: database.fn.now(),
      })

    return {
      ...existing,
      url: normalizedUrl,
      deleted_fixes: deletedFixes,
      updated_at: new Date(),
    }
  } catch (error) {
    logger.error('Error updating deleted fixes:', error)
    throw error
  }
}

/**
 * Delete auto fixes record
 */
export async function deleteAutoFixes(url: string): Promise<void> {
  try {
    const normalizedUrl = normalizeUrl(url)
    
    if (!normalizedUrl) {
      throw new Error('Invalid URL provided')
    }
    
    await database(TABLES.autoFixesRecords).where({ url: normalizedUrl }).delete()
  } catch (error) {
    logger.error('Error deleting auto fixes:', error)
    throw error
  }
}
