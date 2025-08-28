import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { WorkspaceInvitationStatus, WorkspaceUserRole } from '../constants/workspace.constant'
import { usersColumns } from './user.repository'
import { workspacesColumns } from './workspace.repository'

type WorkspaceInvitation = {
  id?: number
  email?: string
  invited_by?: number
  workspace_id?: number
  organization_id?: number
  role?: WorkspaceUserRole
  status: WorkspaceInvitationStatus
  token?: string
  valid_until?: string
  created_at?: string
}

export type GetDetailWorkspaceInvitation = {
  id?: number
  workspace_name: string
  invited_by: string
  email: string
  status: WorkspaceInvitationStatus
  role: WorkspaceUserRole
  valid_until: string
  organization_id?: number
  workspace_id?: number
  token?: string
  created_at?: string
}

const TABLE = TABLES.workspace_invitations

export const VALID_PERIOD_DAYS = 14

export const workspaceInvitationsColumns = {
  id: 'workspace_invitations.id',
  email: 'workspace_invitations.email',
  workspaceId: 'workspace_invitations.workspace_id',
  organizationId: 'workspace_invitations.organization_id',
  role: 'workspace_invitations.role',
  token: 'workspace_invitations.token',
  validUntil: 'workspace_invitations.valid_until',
  invitedBy: 'workspace_invitations.invited_by',
  status: 'workspace_invitations.status',
  createdAt: 'workspace_invitations.created_at',
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
 * Function to get workspace invitation details with user information
 *
 * @param condition Filter conditions for workspace invitations
 */
export async function getDetailWorkspaceInvitations(condition: { token?: string; workspaceId?: number }): Promise<GetDetailWorkspaceInvitation[]> {
  const query = database(TABLE)
    .join(TABLES.workspaces, function joinOn() {
      this.on(workspacesColumns.id, '=', workspaceInvitationsColumns.workspaceId)
    })
    .join(TABLES.users, usersColumns.id, workspaceInvitationsColumns.invitedBy)
    .select({
      id: workspaceInvitationsColumns.id,
      workspace_name: workspacesColumns.name,
      invited_by: usersColumns.email,
      email: workspaceInvitationsColumns.email,
      status: workspaceInvitationsColumns.status,
      role: workspaceInvitationsColumns.role,
      valid_until: workspaceInvitationsColumns.validUntil,
      organization_id: workspaceInvitationsColumns.organizationId,
      workspace_id: workspaceInvitationsColumns.workspaceId,
      token: workspaceInvitationsColumns.token,
      created_at: workspaceInvitationsColumns.createdAt,
    })

  if (condition.token) {
    query.where({ [workspaceInvitationsColumns.token]: condition.token })
  }

  if (condition.workspaceId) {
    query.where({ [workspaceInvitationsColumns.workspaceId]: condition.workspaceId })
  }

  query.orderBy(workspaceInvitationsColumns.createdAt, 'desc')

  return query
}

export async function updateWorkspaceInvitationByToken(token: string, data: WorkspaceInvitation, transaction: Knex.Transaction = null): Promise<number> {
  const query = database(TABLE).where({ token }).update(data)

  if (transaction) {
    return query.transacting(transaction)
  }

  return query
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
