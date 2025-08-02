#!/usr/bin/env tsx

/**
 * Debug Day 1 Email Conditional Content
 * 
 * This script tests the Day 1 email conditional content to debug why both sections are showing
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
dotenv.config()

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import logger from './utils/logger'
import EmailSequenceService from './services/email/emailSequence.service'

async function debugDay1Email() {
  try {
    console.log('🔍 Debugging Day 1 Email Conditional Content')
    
    // Test with User 455 who should have no active domains
    const userId = 455
    console.log(`Testing with User ${userId}`)
    
    // Send Day 1 email to test the conditional logic
    await EmailSequenceService.processEmailSequenceForUser(userId)
    
    console.log('✅ Debug test completed - check logs for template data details')
    
  } catch (error) {
    console.error('❌ Error in debug test:', error)
    process.exit(1)
  }
}

// Run the debug test
debugDay1Email()
  .then(() => {
    console.log('🎯 Debug script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Debug script failed:', error)
    process.exit(1)
  })
