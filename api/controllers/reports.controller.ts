import { Request, Response } from 'express';
import { UserProfile } from '../repository/user.repository';
import { findSitesByUserId, IUserSites } from '../repository/sites_allowed.repository';
import { getProblemReportsBySiteId } from '../repository/problem_reports.repository';

export async function getProblemReports(req: Request, res: Response) {
  const {user} = (req as any);

  try {
    // Fetch sites by user ID
    const Sites: IUserSites[] = await findSitesByUserId(user.id);

    // Use Promise.all to fetch problem reports for all sites concurrently
    const allReports = (
      await Promise.all(
        Sites.map(async (site: IUserSites) => {
          const reports = await getProblemReportsBySiteId(site.id);
          return reports; // Return reports for each site
        }),
      )
    ).flat(); // Flatten the array of arrays into a single array

    res.status(200).send(allReports);
  } catch (error) {
    console.error('Error fetching problem reports:', error);
    res.status(500).send('Cannot fetch reports');
  }
}
