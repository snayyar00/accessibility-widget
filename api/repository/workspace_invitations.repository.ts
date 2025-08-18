import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { usersColumns } from './user.repository'
import { workspacesColumns } from './workspace.repository'

type WorkspaceInvitation = {
  email?: string
  invited_by?: number
  workspace_id?: number
  organization_id?: number
  role?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  token?: string
  valid_until?: string
  created_at?: string
}

export type GetDetailWorkspaceInvitation = {
  owner: string
  workspaceName: string
  until: string
  status: string
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

export async function getWorkspaceInvitation(condition: WorkspaceInvitation): Promise<WorkspaceInvitation[]> {
  return database(TABLE).where(condition)
}

/**
 * Function to get workspace invitation by email, workspaceId and inviteUserId.
 *
 * @param string email        Email this invitation send to
 * @param int    workspaceId  Id of workspace related to this invitation
 * @param int    inviteUserId Id of user who create the invitation
 */
export async function getDetailWorkspaceInvitation(token: string): Promise<GetDetailWorkspaceInvitation[]> {
  return database(TABLE)
    .join(TABLES.workspaces, function joinOn() {
      this.on(workspacesColumns.id, '=', workspaceInvitationsColumns.workspaceId)
    })
    .join(TABLES.users, usersColumns.id, workspaceInvitationsColumns.invitedBy)
    .where({ [workspaceInvitationsColumns.token]: token })
    .select({
      owner: usersColumns.email,
      workspaceName: workspacesColumns.name,
      until: workspaceInvitationsColumns.validUntil,
      status: workspaceInvitationsColumns.status,
    })
}

export async function updateWorkspaceInvitationByToken(token: string, data: WorkspaceInvitation): Promise<number> {
  return database(TABLE).where({ token }).update(data)
}
