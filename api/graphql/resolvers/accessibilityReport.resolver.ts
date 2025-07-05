import { combineResolvers } from 'graphql-resolvers';
import { fetchTechStackFromAPI } from '~/repository/techStack.repository';
import { fetchAccessibilityReport } from '~/services/accessibilityReport/accessibilityReport.service';
import { insertAccessibilityReport, deleteAccessibilityReportByR2Key, getR2KeysByParams } from '~/repository/accessibilityReports.repository';
import { saveReportToR2, fetchReportFromR2, deleteReportFromR2 } from '~/utils/r2Storage';

const resolvers = {
  Mutation: {
    saveAccessibilityReport: async (
      _: any,
      { report, url, allowed_sites_id, key, score }: any
    ) => {
      const reportKey =
        key ||
        `reports/${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}.json`;

      await saveReportToR2(reportKey, report);

      const meta = await insertAccessibilityReport({
        url,
        allowed_sites_id,
        r2_key: reportKey,
        score:  typeof score === 'object' ? score : { value: score },
      });

      return { success: true, key: reportKey, report: meta };
    },
    deleteAccessibilityReport: async (_: any, { r2_key }: any) => {
      // Delete from R2 storage
      await deleteReportFromR2(r2_key);
      // Delete from SQL database
      return await deleteAccessibilityReportByR2Key(r2_key);
    },
  },
  Query: {
    //getAccessibilityReport: combineResolvers((_, { url }) => fetchAccessibilityReport(url)),
    getAccessibilityReport: async (_: any, { url }: { url: string }) => {
      try {
        console.log('🔍 GraphQL resolver: getAccessibilityReport called with URL:', url);
        
        // Fetch the accessibility report
        console.log('📡 Fetching accessibility report...');
        const accessibilityReport = await fetchAccessibilityReport(url);
        console.log('✅ Accessibility report fetched successfully:', !!accessibilityReport);

        // Fetch the tech stack data
        console.log('📡 Fetching tech stack data...');
        let techStack = null;
        try {
          techStack = await fetchTechStackFromAPI(url);
          console.log('✅ Tech stack data fetched successfully:', !!techStack);
        } catch (techStackError: any) {
          console.error('⚠️ Tech stack fetch failed, continuing without it:', techStackError.message);
          techStack = null; // Continue without tech stack data
        }

        // Ensure arrays are properly initialized to prevent GraphQL errors
        if (accessibilityReport) {
          // Handle htmlcs results
          if (accessibilityReport.htmlcs) {
            accessibilityReport.htmlcs.errors = accessibilityReport.htmlcs.errors || [];
            accessibilityReport.htmlcs.notices = accessibilityReport.htmlcs.notices || [];
            accessibilityReport.htmlcs.warnings = accessibilityReport.htmlcs.warnings || [];
          }
          
          // Handle axe results
          if (accessibilityReport.axe) {
            accessibilityReport.axe.errors = accessibilityReport.axe.errors || [];
            accessibilityReport.axe.notices = accessibilityReport.axe.notices || [];
            accessibilityReport.axe.warnings = accessibilityReport.axe.warnings || [];
          }
          
          // Handle ByFunctions array - CRITICAL: This was missing from the recent GraphQL fix!
          if (!accessibilityReport.ByFunctions) {
            console.log('⚠️  ByFunctions is missing in fresh report, initializing empty array');
            accessibilityReport.ByFunctions = [];
          } else if (!Array.isArray(accessibilityReport.ByFunctions)) {
            console.log('⚠️  ByFunctions is not an array in fresh report, converting:', typeof accessibilityReport.ByFunctions);
            accessibilityReport.ByFunctions = [];
          } else {
            console.log('✅ ByFunctions array found in fresh report with length:', accessibilityReport.ByFunctions.length);
            // Ensure each functionality has proper structure
            accessibilityReport.ByFunctions = accessibilityReport.ByFunctions.map((func: any, index: number) => {
              if (!func.FunctionalityName) {
                console.log(`⚠️  Missing FunctionalityName in ByFunctions[${index}]`);
              }
              if (!Array.isArray(func.Errors)) {
                console.log(`⚠️  Errors is not an array in ByFunctions[${index}]`);
                func.Errors = [];
              }
              return {
                FunctionalityName: func.FunctionalityName || 'Unknown',
                Errors: func.Errors || []
              };
            });
          }
          
          // Initialize other extended fields that might be missing
          if (accessibilityReport.issues && !Array.isArray(accessibilityReport.issues)) {
            console.log('⚠️  Issues field exists but is not an array in fresh report');
            accessibilityReport.issues = [];
          }
          
          if (accessibilityReport.functionalityNames && !Array.isArray(accessibilityReport.functionalityNames)) {
            console.log('⚠️  FunctionalityNames field exists but is not an array in fresh report');
            accessibilityReport.functionalityNames = [];
          }
        }

        // Combine the accessibility report and tech stack data
        return {
          ...accessibilityReport,
          techStack,
        };
      } catch (error: any) {
        console.error('❌ GraphQL resolver error:', error);
        console.error('❌ GraphQL resolver error details:', {
          message: error.message,
          stack: error.stack,
          url: url
        });
        throw new Error(`Failed to fetch accessibility report: ${error.message}`);
      }
    },
    fetchAccessibilityReportFromR2: async (_: any, { url, created_at, updated_at }: any) => {
      const rows = await getR2KeysByParams({ url, created_at, updated_at });
      // Ensure score is properly formatted
      const formattedRows = rows.map((row: any) => {
        console.log(typeof row.score, row.score);
        return {
          ...row,
          score: row.score!=null && typeof row.score === 'object' ? row.score.value : row.score ?? 0, // Extract value if score is an object
        };
      });

      return formattedRows;
    },
    fetchReportByR2Key: async (_: any, { r2_key }: any) => {
      try {
        console.log('🔍 Fetching report from R2 with key:', r2_key);
        const report = await fetchReportFromR2(r2_key);
        
        if (!report) {
          console.error('❌ No report found for R2 key:', r2_key);
          return null;
        }
        
        console.log('📦 Raw report from R2:', {
          hasAxe: !!report.axe,
          hasHtmlcs: !!report.htmlcs,
          hasByFunctions: !!report.ByFunctions,
          ByFunctionsLength: report.ByFunctions?.length || 0,
          hasScore: !!report.score,
          hasTotalElements: !!report.totalElements
        });
        
        // Ensure arrays are properly initialized to prevent GraphQL errors
        if (report) {
          // Handle htmlcs results
          if (report.htmlcs) {
            report.htmlcs.errors = report.htmlcs.errors || [];
            report.htmlcs.notices = report.htmlcs.notices || [];
            report.htmlcs.warnings = report.htmlcs.warnings || [];
            console.log('🔧 Initialized htmlcs arrays:', {
              errors: report.htmlcs.errors.length,
              notices: report.htmlcs.notices.length,
              warnings: report.htmlcs.warnings.length
            });
          }
          
          // Handle axe results
          if (report.axe) {
            report.axe.errors = report.axe.errors || [];
            report.axe.notices = report.axe.notices || [];
            report.axe.warnings = report.axe.warnings || [];
            console.log('🔧 Initialized axe arrays:', {
              errors: report.axe.errors.length,
              notices: report.axe.notices.length,
              warnings: report.axe.warnings.length
            });
          }
          
          // Handle ByFunctions array - this was missing!
          if (!report.ByFunctions) {
            console.log('⚠️  ByFunctions is missing, initializing empty array');
            report.ByFunctions = [];
          } else if (!Array.isArray(report.ByFunctions)) {
            console.log('⚠️  ByFunctions is not an array, converting:', typeof report.ByFunctions);
            report.ByFunctions = [];
          } else {
            console.log('✅ ByFunctions array found with length:', report.ByFunctions.length);
            // Ensure each functionality has proper structure
            report.ByFunctions = report.ByFunctions.map((func: any, index: number) => {
              if (!func.FunctionalityName) {
                console.log(`⚠️  Missing FunctionalityName in ByFunctions[${index}]`);
              }
              if (!Array.isArray(func.Errors)) {
                console.log(`⚠️  Errors is not an array in ByFunctions[${index}]`);
                func.Errors = [];
              }
              return {
                FunctionalityName: func.FunctionalityName || 'Unknown',
                Errors: func.Errors || []
              };
            });
          }
          
          // Initialize other fields that might be missing
          report.score = report.score || 0;
          report.totalElements = report.totalElements || 0;
          
          // Initialize extended fields if they exist
          if (report.issues && !Array.isArray(report.issues)) {
            console.log('⚠️  Issues field exists but is not an array');
            report.issues = [];
          }
          
          if (report.functionalityNames && !Array.isArray(report.functionalityNames)) {
            console.log('⚠️  FunctionalityNames field exists but is not an array');
            report.functionalityNames = [];
          }
        }
        
        console.log('✅ Final report structure:', {
          hasAxe: !!report.axe,
          hasHtmlcs: !!report.htmlcs,
          ByFunctionsLength: report.ByFunctions?.length || 0,
          score: report.score,
          totalElements: report.totalElements,
          hasIssues: !!report.issues,
          issuesLength: report.issues?.length || 0,
          hasFunctionalityNames: !!report.functionalityNames,
          functionalityNamesLength: report.functionalityNames?.length || 0
        });
        
        return report;
      } catch (error) {
        console.error('❌ Error in fetchReportByR2Key:', error);
        throw new Error(`Failed to fetch report from R2: ${error.message}`);
      }
    },
  },
};

export default resolvers;
