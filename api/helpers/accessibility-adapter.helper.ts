import { getAccessibilityInformationPally } from './accessibility.helper';
import { getAccessibilityInformationWebAbility } from './webability.helper';

/**
 * Unified accessibility scanning function with automatic WebAbility fallback
 * Always tries Pally first, then automatically falls back to WebAbility if Pally fails
 */
export async function getAccessibilityInformation(domain: string) {
  console.log(`🔍 Scanning ${domain} with Pally scanner`);

  try {
    // Always try Pally first
    const result = await getAccessibilityInformationPally(domain);
    
    // Check if Pally returned a compatibility issue
    if (result.processing_stats?.scan_error === 'PA11Y_COMPATIBILITY_ISSUE') {
      console.log(`⚠️  Pally compatibility issue detected, automatically falling back to WebAbility`);
      throw new Error('PA11Y_COMPATIBILITY_ISSUE');
    }
    
    console.log(`✅ Pally scan successful for ${domain}`);
    return result;
  } catch (pallyError: any) {
    console.error(`❌ Pally scanner failed for ${domain}:`, pallyError.message);
    console.log(`🔄 Automatically attempting WebAbility scanner as fallback for ${domain}`);
    
    try {
      const result = await getAccessibilityInformationWebAbility(domain);
      console.log(`✅ WebAbility fallback scan successful for ${domain}`);
      console.log(`📊 WebAbility fallback result:`, {
        score: result.score,
        totalElements: result.totalElements,
        hasByFunctions: !!result.ByFunctions,
        byFunctionsLength: result.ByFunctions?.length || 0,
        axeErrors: result.axe?.errors?.length || 0,
        htmlcsErrors: result.htmlcs?.errors?.length || 0
      });
      
      // Add metadata about fallback usage
      if (result.processing_stats) {
        result.processing_stats.fallback_used = true;
        result.processing_stats.primary_scanner_failed = 'pally';
        result.processing_stats.fallback_scanner = 'webability';
        result.processing_stats.primary_error = pallyError.message;
      }
      
      return result;
    } catch (webabilityError: any) {
      console.error(`❌ WebAbility fallback also failed for ${domain}:`, webabilityError.message);
      
      // Return error structure indicating both scanners failed
      return {
        axe: { errors: [], notices: [], warnings: [] },
        htmlcs: { errors: [], notices: [], warnings: [] },
        score: 0,
        totalElements: 0,
        ByFunctions: [{
          FunctionalityName: 'Scanner Failure',
          Errors: [{
            'Error Guideline': 'SCANNER001',
            code: 'SCANNER001',
            description: 'Both Pally and WebAbility scanners failed to process this website. This could indicate complex website architecture, security restrictions, or temporary service issues.',
            message: 'Multiple scanner failure detected',
            context: [
              `Pally error: ${pallyError.message}`,
              `WebAbility error: ${webabilityError.message}`
            ] as string[],
            recommended_action: 'Please try scanning individual pages, check website accessibility manually, or contact support for assistance.',
            selectors: [] as string[]
          }]
        }],
        processing_stats: {
          total_batches: 0,
          successful_batches: 0,
          failed_batches: 2,
          total_issues: 1,
          scan_error: 'MULTIPLE_SCANNER_FAILURE',
          primary_scanner: 'pally',
          fallback_scanner: 'webability',
          primary_error: pallyError.message,
          fallback_error: webabilityError.message,
          fallback_used: true
        },
        _originalHtmlcs: { errors: [], notices: [], warnings: [] }
      };
    }
  }
}

/**
 * Health check function to test both scanners
 */
export async function checkScannerHealth() {
  const testDomain = 'https://google.com';
  const results = {
    pally: { status: 'unknown', error: null as string | null, duration: 0 },
    webability: { status: 'unknown', error: null as string | null, duration: 0 }
  };

  // Test Pally scanner
  try {
    const startTime = Date.now();
    await getAccessibilityInformationPally(testDomain);
    results.pally.duration = Date.now() - startTime;
    results.pally.status = 'healthy';
  } catch (error: any) {
    results.pally.status = 'unhealthy';
    results.pally.error = error.message;
  }

  // Test WebAbility scanner
  try {
    const startTime = Date.now();
    await getAccessibilityInformationWebAbility(testDomain);
    results.webability.duration = Date.now() - startTime;
    results.webability.status = 'healthy';
  } catch (error: any) {
    results.webability.status = 'unhealthy';
    results.webability.error = error.message;
  }

  return results;
}

/**
 * Force a specific scanner for testing purposes
 */
export async function getAccessibilityInformationWithScanner(domain: string, scanner: 'pally' | 'webability') {
  console.log(`🧪 Force scanning ${domain} with ${scanner} scanner`);
  
  if (scanner === 'webability') {
    return await getAccessibilityInformationWebAbility(domain);
  } else {
    return await getAccessibilityInformationPally(domain);
  }
}