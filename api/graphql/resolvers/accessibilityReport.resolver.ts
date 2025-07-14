import { combineResolvers } from 'graphql-resolvers';
import { fetchTechStackFromAPI } from '~/repository/techStack.repository';
import { fetchAccessibilityReport } from '~/services/accessibilityReport/accessibilityReport.service';
import { insertAccessibilityReport, deleteAccessibilityReportByR2Key, getR2KeysByParams, getAccessibilityReportByR2Key } from '~/repository/accessibilityReports.repository';
import { saveReportToR2, fetchReportFromR2, deleteReportFromR2 } from '~/utils/r2Storage';
import { validateAccessibilityReport, validateAccessibilityReportR2Filter, validateR2Key, validateSaveAccessibilityReportInput } from '~/validations/accesability.validation';
import { ValidationError } from 'apollo-server-express';
import { isAuthenticated } from '~/graphql/resolvers/authorization.resolver';
import { findSiteByURL } from '~/repository/sites_allowed.repository';

const resolvers = {
  Query: {
    getAccessibilityReport: async (_: any, { url }: { url: string }) => {
      const validateResult = validateAccessibilityReport({ url });
      
      if (Array.isArray(validateResult) && validateResult.length) {
        return new ValidationError(
          validateResult.map((it) => it.message).join(','),
        );
      }

      try {
   

        const [accessibilityReport, techStack] = await Promise.all([
          fetchAccessibilityReport(url),
          fetchTechStackFromAPI(url)
        ]);

        return {
          ...accessibilityReport,
          techStack,
        };
      } catch (error) {
        throw new Error(`Failed to fetch accessibility report: ${error.message}`);
      }
    },

    fetchAccessibilityReportFromR2: combineResolvers(
      isAuthenticated,
      async (_: any, { url, created_at, updated_at }: any, { user }) => {
        const validateResult = validateAccessibilityReportR2Filter({ url, created_at, updated_at });

        if (Array.isArray(validateResult) && validateResult.length) {
          return new ValidationError(
            validateResult.map((it) => it.message).join(',')
          );
        }

        try {
          const site = await findSiteByURL(url);

          if (!site || site.user_id !== user.id) {
            throw new Error('User does not own this site');
          }

          const rows = await getR2KeysByParams({ url, created_at, updated_at });
          // Ensure score is properly formatted
          const formattedRows = rows.map((row: any) => {
            console.log(typeof row.score, row.score);
            return {
              ...row,
              score: row.score != null && typeof row.score === 'object' ? row.score.value : row.score ?? 0, // Extract value if score is an object
            };
          });

          return formattedRows;
        } catch (error) {
          throw new Error(`Failed to fetch reports from R2: ${error.message}`);
        }
      },
    ),
    
    fetchReportByR2Key: combineResolvers(
      isAuthenticated,
      async (_: any, { r2_key }: any, { user }) => {
        const validateResult = validateR2Key(r2_key);

        if (Array.isArray(validateResult) && validateResult.length) {
          return new ValidationError(
            validateResult.map((it) => it.message).join(',')
          );
        }

        try {
          const report = await getAccessibilityReportByR2Key(r2_key);

          if (!report || !report?.url) {
            throw new Error('Report not found');
          }

          const site = await findSiteByURL(report.url);

          if (!site || site.user_id !== user.id) {
            throw new Error('User does not own this site');
          }

          return await fetchReportFromR2(r2_key);
        } catch (error) {
          throw new Error(`Failed to fetch report by R2 key: ${error.message}`);
        }
      }
    ),
  },
  Mutation: {
    saveAccessibilityReport: combineResolvers(
      isAuthenticated,
      async (_: any, { report, url, allowed_sites_id, key, score }: any, { user }) => {
        const validateResult = validateSaveAccessibilityReportInput({ report, url, allowed_sites_id, key, score });

        if (Array.isArray(validateResult) && validateResult.length) {
          return new ValidationError(
            validateResult.map((it) => it.message).join(',')
          );
        }

        try {
          const site = await findSiteByURL(url);

          if (!site || site.user_id !== user.id) {
            throw new Error('User does not own this site');
          }

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
            score: typeof score === 'object' ? score : { value: score },
          });

          return { success: true, key: reportKey, report: meta };
        } catch (error) {
          throw new Error(`Failed to save accessibility report: ${error.message}`);
        }
      }
    ),

    deleteAccessibilityReport: combineResolvers(
      isAuthenticated,
      async (_: any, { r2_key }: any, { user }) => {
        const validateResult = validateR2Key(r2_key);

        if (Array.isArray(validateResult) && validateResult.length) {
          return new ValidationError(
            validateResult.map((it) => it.message).join(',')
          );
        }

        try {
          const report = await getAccessibilityReportByR2Key(r2_key);

          if (!report || !report.url) {
            throw new Error('Report not found');
          }

          const site = await findSiteByURL(report.url);

          if (!site || site.user_id !== user.id) {
            throw new Error('User does not own this site');
          }

          const result = await deleteAccessibilityReportByR2Key(r2_key);
          await deleteReportFromR2(r2_key);

          return result;
        } catch (error) {
          throw new Error(`Failed to delete accessibility report: ${error.message}`);
        }
      }
    ),
  },
};

export default resolvers;
