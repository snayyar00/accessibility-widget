import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { OrganizationUserRole } from '../constants/organization.constant'
import { WorkspaceInvitationStatus, WorkspaceUserRole } from '../constants/workspace.constant'
import { organizationsColumns } from './organization.repository'
import { usersColumns } from './user.repository'
import { workspacesColumns } from './workspace.repository'

type Invitation = {
  id?: number
  email?: string
  type?: 'workspace' | 'organization'
  organization_id?: number
  workspace_id?: number
  organization_role?: string
  workspace_role?: WorkspaceUserRole
  status?: WorkspaceInvitationStatus
  token?: string
  invited_by_id?: number
  valid_until?: string
  accepted_at?: string
  accepted_by_id?: number
  created_at?: string
  updated_at?: string
}

export type GetDetailWorkspaceInvitation = {
  id?: number
  workspace_name: string
  workspace_alias?: string
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

export type GetDetailOrganizationInvitation = {
  id?: number
  organization_name: string
  invited_by: string
  email: string
  status: WorkspaceInvitationStatus
  role: OrganizationUserRole
  valid_until: string
  organization_id?: number
  token?: string
  created_at?: string
}

const TABLE = TABLES.invitations

export const VALID_PERIOD_DAYS = 14

export const invitationsColumns = {
  id: 'invitations.id',
  email: 'invitations.email',
  type: 'invitations.type',
  organizationId: 'invitations.organization_id',
  workspaceId: 'invitations.workspace_id',
  organizationRole: 'invitations.organization_role',
  workspaceRole: 'invitations.workspace_role',
  status: 'invitations.status',
  token: 'invitations.token',
  invitedById: 'invitations.invited_by_id',
  validUntil: 'invitations.valid_until',
  acceptedAt: 'invitations.accepted_at',
  acceptedById: 'invitations.accepted_by_id',
  createdAt: 'invitations.created_at',
  updatedAt: 'invitations.updated_at',
}

/**
 * Function to create workspace invitation
 *
 * @param object      data        Object contains invitations data
 * @param Transaction transaction Transaction object want to use within query
 */
export async function createWorkspaceInvitation(data: Invitation, transaction: Knex.Transaction = null): Promise<number[]> {
  const invitationData = {
    email: data.email,
    type: 'workspace' as const,
    organization_id: data.organization_id,
    workspace_id: data.workspace_id,
    workspace_role: data.workspace_role,
    status: data.status,
    token: data.token,
    invited_by_id: data.invited_by_id,
    valid_until: data.valid_until,
  }

  const query = database(TABLE).insert(invitationData)

  if (!transaction) {
    return query
  }

  return query.transacting(transaction)
}

export async function getWorkspaceInvitation(condition: Partial<Invitation>): Promise<Invitation[]> {
  const query = database(TABLE).where({ type: 'workspace' })

  if (condition.id) query.where({ id: condition.id })
  if (condition.email) query.where({ email: condition.email })
  if (condition.workspace_id) query.where({ workspace_id: condition.workspace_id })
  if (condition.organization_id) query.where({ organization_id: condition.organization_id })
  if (condition.status) query.where({ status: condition.status })
  if (condition.token) query.where({ token: condition.token })

  return query
}

/**
 * Function to get workspace invitation details with user information
 *
 * @param condition Filter conditions for workspace invitations
 */
export async function getDetailWorkspaceInvitations(condition: { token?: string; workspaceId?: number }): Promise<GetDetailWorkspaceInvitation[]> {
  const query = database(TABLE)
    .join(TABLES.workspaces, function joinOn() {
      this.on(workspacesColumns.id, '=', invitationsColumns.workspaceId)
    })
    .join(TABLES.users, usersColumns.id, invitationsColumns.invitedById)
    .where({ [invitationsColumns.type]: 'workspace' })
    .select({
      id: invitationsColumns.id,
      workspace_name: workspacesColumns.name,
      invited_by: usersColumns.email,
      email: invitationsColumns.email,
      status: invitationsColumns.status,
      role: invitationsColumns.workspaceRole,
      valid_until: invitationsColumns.validUntil,
      organization_id: invitationsColumns.organizationId,
      workspace_id: invitationsColumns.workspaceId,
      token: invitationsColumns.token,
      created_at: invitationsColumns.createdAt,
    })

  if (condition.token) {
    query.where({ [invitationsColumns.token]: condition.token })
  }

  if (condition.workspaceId) {
    query.where({ [invitationsColumns.workspaceId]: condition.workspaceId })
  }

  query.orderBy(invitationsColumns.createdAt, 'desc')

  return query
}

export async function updateWorkspaceInvitationByToken(token: string, data: Partial<Invitation>, transaction: Knex.Transaction = null): Promise<number> {
  const updateData: Partial<Invitation> = {}

  if (data.status) updateData.status = data.status
  if (data.workspace_role) updateData.workspace_role = data.workspace_role
  if (data.accepted_at) updateData.accepted_at = data.accepted_at
  if (data.accepted_by_id) updateData.accepted_by_id = data.accepted_by_id

  const query = database(TABLE).where({ token, type: 'workspace' }).update(updateData)

  if (transaction) {
    return query.transacting(transaction)
  }

  return query
}

export async function deleteWorkspaceInvitations(condition: Partial<Invitation>, transaction: Knex.Transaction = null): Promise<boolean> {
  const query = database(TABLE).where({ type: 'workspace' })

  if (condition.id) query.where({ id: condition.id })
  if (condition.email) query.where({ email: condition.email })
  if (condition.workspace_id) query.where({ workspace_id: condition.workspace_id })
  if (condition.organization_id) query.where({ organization_id: condition.organization_id })
  if (condition.token) query.where({ token: condition.token })
  if (condition.invited_by_id) query.where({ invited_by_id: condition.invited_by_id })

  const deleteQuery = query.del()

  if (transaction) {
    const result = await deleteQuery.transacting(transaction)
    return result > 0
  }

  const result = await deleteQuery
  return result > 0
}

export async function getOrganizationInvitations(organizationId: number): Promise<GetDetailWorkspaceInvitation[]> {
  const query = database(TABLE)
    .leftJoin(TABLES.users, usersColumns.id, invitationsColumns.invitedById)
    .leftJoin(TABLES.workspaces, workspacesColumns.id, invitationsColumns.workspaceId)
    .where(invitationsColumns.organizationId, organizationId)
    .where(invitationsColumns.type, 'workspace')
    .select([
      `${invitationsColumns.id} as id`,
      `${invitationsColumns.email} as email`,
      `${invitationsColumns.status} as status`,
      `${invitationsColumns.workspaceRole} as role`,
      `${invitationsColumns.token} as token`,
      `${invitationsColumns.validUntil} as valid_until`,
      `${invitationsColumns.createdAt} as created_at`,
      `${invitationsColumns.organizationId} as organization_id`,
      `${invitationsColumns.workspaceId} as workspace_id`,
      `${usersColumns.name} as invited_by`,
      `${workspacesColumns.name} as workspace_name`,
      `${workspacesColumns.alias} as workspace_alias`,
    ])

  return await query
}

/**
 * Function to create organization invitation
 *
 * @param object      data        Object contains invitations data
 * @param Transaction transaction Transaction object want to use within query
 */
export async function createOrganizationInvitation(data: Invitation, transaction: Knex.Transaction = null): Promise<number[]> {
  const invitationData = {
    email: data.email,
    type: 'organization' as const,
    organization_id: data.organization_id,
    organization_role: data.organization_role,
    status: data.status,
    token: data.token,
    invited_by_id: data.invited_by_id,
    valid_until: data.valid_until,
  }

  const query = database(TABLE).insert(invitationData)

  if (!transaction) {
    return query
  }

  return query.transacting(transaction)
}

export async function getOrganizationInvitation(condition: Partial<Invitation>): Promise<Invitation[]> {
  const query = database(TABLE).where({ type: 'organization' })

  if (condition.id) query.where({ id: condition.id })
  if (condition.email) query.where({ email: condition.email })
  if (condition.organization_id) query.where({ organization_id: condition.organization_id })
  if (condition.status) query.where({ status: condition.status })
  if (condition.token) query.where({ token: condition.token })

  return query
}

export async function getDetailOrganizationInvitations(condition: { token?: string; organizationId?: number }): Promise<GetDetailOrganizationInvitation[]> {
  const query = database(TABLE)
    .join(TABLES.organizations, organizationsColumns.id, invitationsColumns.organizationId)
    .join(TABLES.users, usersColumns.id, invitationsColumns.invitedById)
    .where({ [invitationsColumns.type]: 'organization' })
    .select({
      id: invitationsColumns.id,
      organization_name: organizationsColumns.name,
      invited_by: usersColumns.email,
      email: invitationsColumns.email,
      status: invitationsColumns.status,
      role: invitationsColumns.organizationRole,
      valid_until: invitationsColumns.validUntil,
      organization_id: invitationsColumns.organizationId,
      token: invitationsColumns.token,
      created_at: invitationsColumns.createdAt,
    })

  if (condition.token) {
    query.where({ [invitationsColumns.token]: condition.token })
  }

  if (condition.organizationId) {
    query.where({ [invitationsColumns.organizationId]: condition.organizationId })
  }

  query.orderBy(invitationsColumns.createdAt, 'desc')

  return query
}

export async function updateOrganizationInvitationByToken(token: string, data: Partial<Invitation>, transaction: Knex.Transaction = null): Promise<number> {
  const updateData: Partial<Invitation> = {}

  if (data.status) updateData.status = data.status
  if (data.organization_role) updateData.organization_role = data.organization_role
  if (data.accepted_at) updateData.accepted_at = data.accepted_at
  if (data.accepted_by_id) updateData.accepted_by_id = data.accepted_by_id

  const query = database(TABLE).where({ token, type: 'organization' }).update(updateData)

  if (transaction) {
    return query.transacting(transaction)
  }

  return query
}

export async function deleteOrganizationInvitations(condition: Partial<Invitation>, transaction: Knex.Transaction = null): Promise<boolean> {
  const query = database(TABLE).where({ type: 'organization' })

  if (condition.id) query.where({ id: condition.id })
  if (condition.email) query.where({ email: condition.email })
  if (condition.organization_id) query.where({ organization_id: condition.organization_id })
  if (condition.token) query.where({ token: condition.token })
  if (condition.invited_by_id) query.where({ invited_by_id: condition.invited_by_id })

  const deleteQuery = query.del()

  if (transaction) {
    const result = await deleteQuery.transacting(transaction)
    return result > 0
  }

  const result = await deleteQuery
  return result > 0
}
