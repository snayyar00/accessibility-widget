import { Request, Response } from 'express'

import { getProblemReportsBySiteId, toggleProblemReportFixedStatus } from '../repository/problem_reports.repository'
import { findSitesByUserId, IUserSites } from '../repository/sites_allowed.repository'

export async function getProblemReports(req: Request, res: Response) {
  const { user } = req as any

  try {
    // Fetch sites by user ID
    const Sites: IUserSites[] = await findSitesByUserId(user.id)

    // Use Promise.all to fetch problem reports for all sites concurrently
    const allReports = (
      await Promise.all(
        Sites.map(async (site: IUserSites) => {
          const reports = await getProblemReportsBySiteId(site.id)
          return reports // Return reports for each site
        }),
      )
    ).flat() // Flatten the array of arrays into a single array

    res.status(200).send(allReports)
  } catch (error) {
    console.error('Error fetching problem reports:', error)
    res.status(500).send('Cannot fetch reports')
  }
}

export async function toggleProblemReportFixed(req: Request, res: Response) {
  const { user } = req as any
  const { id } = req.params

  try {
    if (!id || isNaN(Number(id))) {
      return res.status(400).send('Invalid problem report ID')
    }

    const result = await toggleProblemReportFixedStatus(Number(id))

    if (result === 0) {
      return res.status(404).send('Problem report not found')
    }

    res.status(200).send({ success: true, message: 'Fixed status toggled successfully' })
  } catch (error) {
    console.error('Error toggling problem report fixed status:', error)
    res.status(500).send('Cannot toggle fixed status')
  }
}
