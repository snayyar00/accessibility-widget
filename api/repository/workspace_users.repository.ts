import dayjs from 'dayjs'
import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { WORKSPACE_INVITATION_STATUS_PENDING, WORKSPACE_USER_STATUS_PENDING, WorkspaceUserStatus } from '../constants/workspace.constant'
import formatDateDB from '../utils/format-date-db'
import { usersColumns } from './user.repository'
import { workspacesColumns } from './workspace.repository'
import { createWorkspaceInvitation, VALID_PERIOD_DAYS } from './workspace_invitations.repository'

const TABLE = TABLES.workspace_users

export type WorkspaceUser = {
  user_id?: number
  workspace_id?: number
  role?: string
  status?: WorkspaceUserStatus
  created_at?: string
  updated_at?: string
  deleted_at?: string
  invitation_token?: string
}

type MemberAndInviteToken = {
  user_id: number
  workspace_id?: number
  member_id?: number
  email?: string
  token?: string
  role?: string
  organization_id?: number
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

export async function createMemberAndInviteToken({ user_id, workspace_id, member_id, email, token, role, organization_id }: MemberAndInviteToken, transaction: Knex.Transaction): Promise<boolean> {
  try {
    await createWorkspaceInvitation(
      {
        email,
        invited_by: user_id,
        workspace_id: workspace_id,
        organization_id: organization_id,
        role,
        valid_until: formatDateDB(dayjs().add(VALID_PERIOD_DAYS, 'day')),
        status: WORKSPACE_INVITATION_STATUS_PENDING,
        token,
      },
      transaction,
    )

    await createWorkspaceUser({ user_id: member_id, workspace_id, role, status: WORKSPACE_USER_STATUS_PENDING, invitation_token: token }, transaction)

    return true
  } catch (error) {
    throw new Error(error)
  }
}

export async function getWorkspaceUser(condition: Partial<WorkspaceUser>): Promise<WorkspaceUser | null> {
  const result = await database(TABLE).where(condition).first()
  return result || null
}

export async function deleteWorkspaceUsers(condition: Partial<WorkspaceUser>, transaction: Knex.Transaction = null): Promise<number> {
  const query = database(TABLE).where(condition).del()

  if (transaction) {
    return query.transacting(transaction)
  }

  return query
}

export async function updateWorkspaceUser(condition: WorkspaceUser, data: WorkspaceUser): Promise<number> {
  return database(TABLE).where(condition).update(data)
}
