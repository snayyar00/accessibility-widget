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


                // Fetch the accessibility report
                // const accessibilityReport = await fetchAccessibilityReport(url);
                // Fetch the tech stack data
               //const techStack = await fetchTechStackFromAPI(url);


        // Run both fetches in parallel
        const [accessibilityReport, techStack] = await Promise.all([
          fetchAccessibilityReport(url),
          fetchTechStackFromAPI(url)
        ]);

        // Combine the accessibility report and tech stack data
        return {
          ...accessibilityReport,
          techStack,
        };
      } catch (error) {
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
      return await fetchReportFromR2(r2_key);
    },
  },
};

export default resolvers;
