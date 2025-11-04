import { Request, Response } from 'express'

import { getProblemReportsBySiteIds, toggleProblemReportFixedStatus } from '../repository/problem_reports.repository'
import { findUserSitesWithPlansWithWorkspaces } from '../repository/sites_allowed.repository'
import { UserLogined } from '../services/authentication/get-user-logined.service'
import { canManageOrganization } from '../utils/access.helper'

export async function getProblemReports(req: Request & { user: UserLogined }, res: Response) {
  const { user } = req

  try {
    if (!user.current_organization_id) {
      return res.status(400).send('No organization selected')
    }

    const isSuperAdmin = user.is_super_admin
    const isAdmin = isSuperAdmin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

    const sites = await findUserSitesWithPlansWithWorkspaces(user.id, user.current_organization_id, isAdmin)
    const allReports = await getProblemReportsBySiteIds(sites.map((site) => site.id))

    res.status(200).send(allReports)
  } catch (error) {
    console.error('Error fetching problem reports:', error)
    res.status(500).send('Cannot fetch reports')
  }
}

export async function toggleProblemReportFixed(req: Request, res: Response) {
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
