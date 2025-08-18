import dayjs from 'dayjs'
import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import formatDateDB from '../utils/format-date-db'
import { usersColumns } from './user.repository'
import { workspacesColumns } from './workspace.repository'
import { createWorkspaceInvitation, VALID_PERIOD_DAYS } from './workspace_invitations.repository'

const TABLE = TABLES.workspace_users

export type WorkspaceUser = {
  user_id?: number
  workspace_id?: number
  role?: string
  status?: 'pending' | 'active' | 'inactive' | 'decline'
  created_at?: string
  updated_at?: string
  deleted_at?: string
  invitation_token?: string
}

type MemberAndInviteToken = {
  userId: number
  workspaceId?: number
  memberId?: number
  email?: string
  token?: string
  role?: string
  organizationId?: number
}

type Alias = {
  alias: string
}

type GetListWorkspaceMemberByAliasWorkspaceResponse = {
  userName: string
  userId: number
  email: string
  status: string
  owner: number
}

export const workspaceUsersColumns = {
  userId: 'workspace_users.user_id',
  workspaceId: 'workspace_users.workspace_id',
  role: 'workspace_users.role',
  status: 'workspace_users.status',
  createdAt: 'workspace_users.created_at',
  updatedAt: 'workspace_users.updated_at',
  deletedAt: 'workspace_users.deleted_at',
  invitationToken: 'workspace_users.invitation_token',
}

export async function getListWorkspaceMemberByAliasWorkspace({ alias }: Alias): Promise<GetListWorkspaceMemberByAliasWorkspaceResponse[]> {
  return database(TABLES.workspaces)
    .join(TABLE, workspacesColumns.id, workspaceUsersColumns.workspaceId)
    .whereIn(workspaceUsersColumns.workspaceId, function subQuery() {
      this.select('id').from(TABLES.workspaces).where({ alias })
    })
    .join(TABLES.users, workspaceUsersColumns.userId, usersColumns.id)
    .select({
      userName: usersColumns.name,
      userId: usersColumns.id,
      email: usersColumns.email,
      status: workspaceUsersColumns.status,
      owner: workspacesColumns.createdBy,
    })
}

export async function createWorkspaceUser(data: WorkspaceUser, transaction: Knex.Transaction = null): Promise<number[]> {
  const query = database(TABLE).insert(data)

  if (!transaction) {
    return query
  }

  return query.transacting(transaction)
}

export async function createMemberAndInviteToken({ userId, workspaceId, memberId, email, token, role, organizationId }: MemberAndInviteToken): Promise<boolean> {
  let transaction
  try {
    transaction = await database.transaction()
    await createWorkspaceInvitation(
      {
        email,
        invited_by: userId,
        workspace_id: workspaceId,
        organization_id: organizationId,
        role,
        valid_until: formatDateDB(dayjs().add(VALID_PERIOD_DAYS, 'day')),
        status: 'pending',
        token,
      },
      transaction,
    )
    await createWorkspaceUser({ user_id: memberId, workspace_id: workspaceId, role, status: 'pending', invitation_token: token }, transaction)
    await transaction.commit()
    return true
  } catch (error) {
    transaction.rollback()
    throw new Error(error)
  }
}

export async function updateWorkspaceUser(condition: WorkspaceUser, data: WorkspaceUser): Promise<number> {
  return database(TABLE).where(condition).update(data)
}
