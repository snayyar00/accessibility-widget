import dayjs from 'dayjs'
import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_PENDING } from '../constants/organization.constant'
import { WORKSPACE_INVITATION_STATUS_PENDING, WORKSPACE_USER_STATUS_PENDING, WorkspaceUserRole, WorkspaceUserStatus } from '../constants/workspace.constant'
import { addUserToOrganization, getUserOrganization } from '../services/organization/organization_users.service'
import formatDateDB from '../utils/format-date-db'
import { createWorkspaceInvitation, VALID_PERIOD_DAYS } from './invitations.repository'
import { updateUser } from './user.repository'
import { workspacesColumns } from './workspace.repository'

const TABLE = TABLES.workspace_users

export type WorkspaceUser = {
  id?: number
  user_id?: number
  workspace_id?: number
  role?: WorkspaceUserRole
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
  role?: WorkspaceUserRole
  organization_id?: number
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

export async function createWorkspaceUser(data: WorkspaceUser, transaction: Knex.Transaction = null): Promise<number[]> {
  const query = database(TABLE).insert(data)

  if (!transaction) {
    return query
  }

  return query.transacting(transaction)
}

export async function createMemberAndInviteToken({ user_id, workspace_id, member_id, email, token, role, organization_id }: MemberAndInviteToken, transaction: Knex.Transaction): Promise<boolean> {
  try {
    const existing = await getUserOrganization(member_id, organization_id)

    if (!existing) {
      await addUserToOrganization(member_id, organization_id, ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_PENDING, transaction)
    }

    await updateUser(member_id, { current_organization_id: organization_id }, transaction)
    await createWorkspaceInvitation(
      {
        email,
        invited_by_id: user_id,
        workspace_id: workspace_id,
        organization_id: organization_id,
        workspace_role: role,
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

export async function deleteWorkspaceUsersByOrganization(userId: number, organizationId: number, transaction: Knex.Transaction = null): Promise<number> {
  const query = database(TABLE)
    .join(TABLES.workspaces, workspaceUsersColumns.workspaceId, workspacesColumns.id)
    .where({
      [workspaceUsersColumns.userId]: userId,
      [workspacesColumns.organizationId]: organizationId,
    })
    .del()

  if (transaction) {
    return query.transacting(transaction)
  }

  return query
}

export async function updateWorkspaceUser(condition: WorkspaceUser, data: WorkspaceUser, transaction: Knex.Transaction = null): Promise<number> {
  const query = database(TABLE).where(condition).update(data)

  if (transaction) {
    return query.transacting(transaction)
  }

  return query
}
