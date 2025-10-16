import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { createWorkspaceUser, WorkspaceUser, workspaceUsersColumns } from './workspace_users.repository'

export type Workspace = {
  id?: number
  name?: string
  alias?: string
  organization_id?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string
  created_by?: number
}

type GetAllWorkspace = {
  organizationId?: number
  workspaceId?: number
  userId?: number
}

type NewWorkspaceAndMember = {
  name?: string
  alias?: string
  organization_id?: number
  user_id?: number
}

export type GetAllWorkspaceResponse = WorkspaceUser & Workspace

type Condition = {
  [key: string]: number | string
}

const TABLE = TABLES.workspaces

export const workspacesColumns = {
  id: 'workspaces.id',
  name: 'workspaces.name',
  alias: 'workspaces.alias',
  organizationId: 'workspaces.organization_id',
  createAt: 'workspaces.created_at',
  updatedAt: 'workspaces.updated_at',
  deletedAt: 'workspaces.deleted_at',
  createdBy: 'workspaces.created_by',
}

/**
 * Function to create Workspace
 *
 * @param object      data        Object contains data of workspace. Example: {name, alias, organization_id, created_by}
 * @param Transaction transaction Transaction object want to use within query
 *
 */
export async function insertWorkspace(data: Workspace, transaction: Knex.Transaction = null): Promise<number[]> {
  const query = database(TABLE).insert(data)
  if (!transaction) {
    return query
  }
  return query.transacting(transaction)
}

/**
 * Function to update workspace
 *
 * @param int         workspaceId Id of workspace want to update
 * @param object      data        Object contains update data of workspace. Example: {name, alias, organization_id}
 * @param Transaction transaction Transaction object want to use within query
 *
 */
export async function updateWorkspace(workspaceId: number, data: Workspace, transaction: Knex.Transaction = null): Promise<number> {
  const query = database(TABLE).where({ id: workspaceId }).update(data)

  if (!transaction) {
    return query
  }

  return query.transacting(transaction)
}

/**
 * Function to get all workspace
 *
 */
export async function getAllWorkspace({ workspaceId, userId, organizationId }: GetAllWorkspace): Promise<GetAllWorkspaceResponse[]> {
  const condition: Condition = {
    [workspaceUsersColumns.status]: 'active',
  }

  if (workspaceId) condition[workspaceUsersColumns.workspaceId] = workspaceId
  if (userId) condition[workspaceUsersColumns.userId] = userId
  if (organizationId) condition[workspacesColumns.organizationId] = organizationId

  return database(TABLE).join(TABLES.workspace_users, workspacesColumns.id, workspaceUsersColumns.workspaceId).where(condition).select('workspaces.*', 'workspace_users.*', 'workspaces.id as id').orderBy('workspaces.updated_at', 'desc')
}

/**
 * This function is used to get workspace by search data
 *
 * @param object searchData Object contains search data. Example: {name, alias, organization_id, created_by}
 */
export async function getWorkspace(searchData: Workspace): Promise<Workspace> {
  return database(TABLE).where(searchData).first()
}

export async function createNewWorkspaceAndMember({ name, alias, organization_id, user_id }: NewWorkspaceAndMember): Promise<number | Error> {
  let transaction

  try {
    transaction = await database.transaction()
    const [workspaceId] = await insertWorkspace({ name, alias, organization_id, created_by: user_id }, transaction)

    await createWorkspaceUser({ user_id: user_id, workspace_id: workspaceId, role: 'owner', status: 'active' }, transaction)

    await transaction.commit()

    return workspaceId
  } catch (error) {
    transaction.rollback()
    return new Error(error)
  }
}

/**
 * Function to get workspace members with user details
 */
export async function getWorkspaceMembers({ workspaceId, userId, organizationId }: GetAllWorkspace): Promise<GetAllWorkspaceResponse[]> {
  const query = database(TABLE)
    .join('workspace_users', 'workspaces.id', 'workspace_users.workspace_id')
    .join('users', 'workspace_users.user_id', 'users.id')
    .select(
      'workspace_users.id',
      'workspace_users.user_id',
      'workspace_users.workspace_id',
      'workspace_users.role',
      'workspace_users.status',
      'workspace_users.created_at',
      'workspace_users.updated_at',
      database.raw(`JSON_OBJECT(
        'id', users.id,
        'name', users.name,
        'email', users.email,
        'avatarUrl', users.avatar_url
      ) as user`),
    )

  const condition: Condition = {}

  if (workspaceId) condition[workspacesColumns.id] = workspaceId
  if (organizationId) condition[workspacesColumns.organizationId] = organizationId

  if (Object.keys(condition).length > 0) {
    query.where(condition)
  }

  if (userId) {
    query.join('workspace_users as wu2', 'workspaces.id', 'wu2.workspace_id').where('wu2.user_id', userId)
  }

  return query.orderBy('workspace_users.updated_at', 'desc')
}

/**
 * Delete workspace by id
 * @param id - workspace id
 * @param transaction - optional transaction
 * @returns number of deleted rows
 */
export async function deleteWorkspaceById(id: number, transaction: Knex.Transaction = null): Promise<number> {
  const query = database(TABLE).where({ id }).del()
  if (transaction) {
    return query.transacting(transaction)
  }
  return query
}
