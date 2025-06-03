import { combineResolvers } from 'graphql-resolvers';
import { fetchAccessibilityReport } from '~/services/accessibilityReport/accessibilityReport.service';
import { insertAccessibilityReport, deleteAccessibilityReportByR2Key, getR2KeysByParams } from '~/repository/accessibilityReports.repository';
import { saveReportToR2, fetchReportFromR2, deleteReportFromR2 } from '~/utils/r2Storage';

const resolvers = {
  Mutation: {
    saveAccessibilityReport: async (
      _: any,
      { report, url, allowed_sites_id, key }: any
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
    getAccessibilityReport: combineResolvers((_, { url }) => fetchAccessibilityReport(url)),
    fetchAccessibilityReportFromR2: async (_: any, { url, created_at, updated_at }: any) => {
      const rows = await getR2KeysByParams({ url, created_at, updated_at });
      return rows;
    },
    fetchReportByR2Key: async (_: any, { r2_key }: any) => {
      return await fetchReportFromR2(r2_key);
    },
  },
};

export default resolvers;
