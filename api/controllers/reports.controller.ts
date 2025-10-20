import { Request, Response } from 'express'

import { getProblemReportsBySiteIds } from '../repository/problem_reports.repository'
import { findUserSitesWithPlansWithWorkspaces } from '../repository/sites_allowed.repository'
import { UserProfile } from '../repository/user.repository'
import { getUserOrganization } from '../services/organization/organization_users.service'
import { canManageOrganization } from '../utils/access.helper'

export async function getProblemReports(req: Request & { user: UserProfile }, res: Response) {
  const { user } = req

  try {
    if (!user.current_organization_id) {
      return res.status(400).send('No organization selected')
    }

    const isSuperAdmin = user.is_super_admin
    const userOrganization = !isSuperAdmin ? await getUserOrganization(user.id, user.current_organization_id) : null
    const isAdmin = isSuperAdmin || (userOrganization && canManageOrganization(userOrganization.role))

    const sites = await findUserSitesWithPlansWithWorkspaces(user.id, user.current_organization_id, isAdmin)
    const allReports = await getProblemReportsBySiteIds(sites.map((site) => site.id))

    res.status(200).send(allReports)
  } catch (error) {
    console.error('Error fetching problem reports:', error)
    res.status(500).send('Cannot fetch reports')
  }
}
