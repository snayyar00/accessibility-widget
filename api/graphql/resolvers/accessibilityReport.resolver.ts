import { combineResolvers } from 'graphql-resolvers';
import { fetchAccessibilityReport } from '~/services/accessibilityReport/accessibilityReport.service';
import { insertAccessibilityReport } from '~/repository/accessibilityReports.repository';
import { getR2KeysByParams } from '~/repository/accessibilityReports.repository';
import { saveReportToR2, fetchReportFromR2 } from '~/utils/r2Storage';

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
  },
  Query: {
    getAccessibilityReport: combineResolvers((_, { url }) => fetchAccessibilityReport(url)),
    fetchAccessibilityReportFromR2: async (_: any, { url, created_at, updated_at }: any) => {
      const keys = await getR2KeysByParams({ url, created_at, updated_at });
      if (!keys.length) return [];
      // Fetch all matching reports from R2
      const reports = await Promise.all(
        keys.map(async (row: any) => {
          try {
            return await fetchReportFromR2(row.r2_key);
          } catch (e) {
            return null;
          }
        })
      );
      // Filter out any failed fetches
      return reports.filter(Boolean);
    },
  },
};

export default resolvers;
