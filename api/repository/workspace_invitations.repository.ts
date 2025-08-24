import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { WorkspaceInvitationStatus, WorkspaceUserRole } from '../constants/workspace.constant'
import { usersColumns } from './user.repository'
import { workspacesColumns } from './workspace.repository'

type WorkspaceInvitation = {
  email?: string
  invited_by?: number
  workspace_id?: number
  organization_id?: number
  role?: string
  status: WorkspaceInvitationStatus
  token?: string
  valid_until?: string
  created_at?: string
}

export type GetDetailWorkspaceInvitation = {
  workspace_name: string
  invited_by: string
  status: WorkspaceInvitationStatus
  role: WorkspaceUserRole
  valid_until: string
}

const TABLE = TABLES.workspace_invitations

export const VALID_PERIOD_DAYS = 14

export const workspaceInvitationsColumns = {
  email: 'workspace_invitations.email',
  workspaceId: 'workspace_invitations.workspace_id',
  organizationId: 'workspace_invitations.organization_id',
  role: 'workspace_invitations.role',
  token: 'workspace_invitations.token',
  validUntil: 'workspace_invitations.valid_until',
  invitedBy: 'workspace_invitations.invited_by',
  status: 'workspace_invitations.status',
}

/**
 * Function to create workspace invitation
 *
 * @param object      data        Object contains invitations data
 * @param Transaction transaction Transaction object want to use within query
 */
export async function createWorkspaceInvitation(data: WorkspaceInvitation, transaction: Knex.Transaction = null): Promise<number[]> {
  const query = database(TABLE).insert(data)

  if (!transaction) {
    return query
  }

  return query.transacting(transaction)
}

export async function getWorkspaceInvitation(condition: Partial<WorkspaceInvitation>): Promise<WorkspaceInvitation[]> {
  return database(TABLE).where(condition)
}

/**
 * Function to get workspace invitation details by token.
 *
 * @param string token Token of the workspace invitation
 */
export async function getDetailWorkspaceInvitation(token: string): Promise<GetDetailWorkspaceInvitation[]> {
  return database(TABLE)
    .join(TABLES.workspaces, function joinOn() {
      this.on(workspacesColumns.id, '=', workspaceInvitationsColumns.workspaceId)
    })
    .join(TABLES.users, usersColumns.id, workspaceInvitationsColumns.invitedBy)
    .where({ [workspaceInvitationsColumns.token]: token })
    .select({
      workspace_name: workspacesColumns.name,
      invited_by: usersColumns.email,
      status: workspaceInvitationsColumns.status,
      role: workspaceInvitationsColumns.role,
      valid_until: workspaceInvitationsColumns.validUntil,
    })
}

export async function updateWorkspaceInvitationByToken(token: string, data: WorkspaceInvitation): Promise<number> {
  return database(TABLE).where({ token }).update(data)
}

export async function deleteWorkspaceInvitations(condition: Partial<WorkspaceInvitation>, transaction: Knex.Transaction = null): Promise<boolean> {
  const query = database(TABLE).where(condition).del()

  if (transaction) {
    const result = await query.transacting(transaction)
    return result > 0
  }

  const result = await query
  return result > 0
}
