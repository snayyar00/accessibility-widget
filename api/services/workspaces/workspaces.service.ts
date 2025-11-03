import { Knex } from 'knex'

import database from '../../config/database.config'
import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { WORKSPACE_MANAGEMENT_ROLES } from '../../constants/workspace.constant'
import { stringToSlug } from '../../helpers/string.helper'
import { createNewWorkspaceAndMember, deleteWorkspaceById, getAllWorkspace, GetAllWorkspaceResponse, getWorkspace, updateWorkspace as updateWorkspaceRepo, Workspace } from '../../repository/workspace.repository'
import { getWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization, canManageWorkspace } from '../../utils/access.helper'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateCreateWorkspace, validateUpdateWorkspace } from '../../validations/workspace.validation'
import { UserLogined } from '../authentication/get-user-logined.service'
import { getUserOrganization } from '../organization/organization_users.service'

type CreateWorkspaceResponse = {
  id: Promise<number | Error>
  name: string
  alias: string
  organization_id: number
}

/**
 * Function to get all workspaces for current user
 * Users with organization management rights see all organization workspaces
 * Regular users see only workspaces they are members of
 *
 * @param UserLogined user User who execute this function
 * @returns Promise<GetAllWorkspaceResponse[]> Array of user's workspaces
 */
export async function getAllWorkspaces(user: UserLogined): Promise<GetAllWorkspaceResponse[]> {
  if (!user.current_organization_id) {
    return []
  }

  if (user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))) {
    const allWorkspaces = await getAllWorkspace({ organizationId: user.current_organization_id })
    return removeDuplicateWorkspaces(allWorkspaces)
  }

  const userWorkspaces = await getAllWorkspace({ userId: user.id, organizationId: user.current_organization_id })

  return removeDuplicateWorkspaces(userWorkspaces)
}

/**
 * Function to get workspace by alias
 * Only organization members with management rights can access workspaces within their organization
 *
 * @param string alias Alias of the workspace to get
 * @param UserLogined user User requesting the workspace
 * @returns Promise<Workspace | null> Workspace or null if not found/no access
 */
export async function getWorkspaceByAlias(alias: string, user: UserLogined): Promise<Workspace | null> {
  if (!alias) {
    throw new ValidationError('Workspace alias is required')
  }

  if (!user || !user.id) {
    return null
  }

  if (!user.current_organization_id) {
    return null
  }

  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  if (!workspace) {
    return null
  }

  const userWorkspaceMembership = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })

  if (userWorkspaceMembership) {
    return workspace
  }

  if (!user.is_super_admin && (!user.currentOrganizationUser || !canManageOrganization(user.currentOrganizationUser.role))) {
    return null
  }

  return workspace
}

/**
 * Function to create workspace
 *
 * @param UserLogined user User who creates workspace
 * @param string workspaceName Name of new workspace
 * @returns Promise<CreateWorkspaceResponse> Created workspace info
 */
export async function createWorkspace(user: UserLogined, workspaceName: string): Promise<CreateWorkspaceResponse> {
  const validateResult = validateCreateWorkspace({ name: workspaceName })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  if (!user.currentOrganizationUser) {
    throw new ApolloError('You are not a member of this organization')
  }

  const alias = stringToSlug(workspaceName)

  const existingWorkspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  if (existingWorkspace) {
    logger.error('Workspace already exists in this organization, throwing error:', existingWorkspace)
    throw new ApolloError(`Workspace with alias "${alias}" already exists in this organization`)
  }

  const workspaceId = createNewWorkspaceAndMember({ name: workspaceName, alias, organization_id: user.current_organization_id, user_id: user.id })

  return {
    id: workspaceId,
    organization_id: user.current_organization_id,
    name: workspaceName,
    alias,
  }
}

/**
 * Function to delete workspace
 * @param UserLogined user User who wants to delete workspace
 * @param number workspace_id ID of the workspace to delete
 * @returns Promise<boolean> True if workspace was deleted successfully
 */
export async function deleteWorkspace(user: UserLogined, workspace_id: number): Promise<boolean> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can delete the workspace`)
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    await deleteWorkspaceById(workspace_id, transaction)

    await transaction.commit()

    logger.info('Successfully deleted workspace', {
      workspace_id,
      deleted_by: user.id,
      organization_id: user.current_organization_id,
    })

    return true
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }

    logger.error('Failed to delete workspace', {
      workspace_id,
      user_id: user.id,
      error: error.message,
    })

    throw new ApolloError('Failed to delete workspace')
  }
}

/**
 * Function to update workspace
 * @param UserLogined user User who wants to update workspace
 * @param number workspace_id ID of the workspace to update
 * @param Partial<Workspace> data Object with fields to update
 * @returns Promise<Workspace> Updated workspace
 */
export async function updateWorkspace(user: UserLogined, workspace_id: number, data: Partial<Workspace>): Promise<Workspace> {
  const validateResult = validateUpdateWorkspace(data)

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })
  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can update the workspace`)
  }

  const { id, organization_id, created_at, updated_at, ...rawUpdateData } = data

  const cleanedData = Object.fromEntries(Object.entries(rawUpdateData).filter(([_, value]) => value !== undefined && value !== null))

  if (Object.keys(cleanedData).length === 0) {
    throw new ValidationError('No data provided for update')
  }

  let finalUpdateData = { ...cleanedData }

  if (cleanedData.name) {
    const alias = stringToSlug(cleanedData.name as string)

    if (alias !== workspace.alias) {
      const existingWorkspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

      if (existingWorkspace) {
        throw new ValidationError('Workspace with this name already exists in this organization')
      }
    }

    finalUpdateData = { ...finalUpdateData, alias }
  }

  await updateWorkspaceRepo(workspace_id, finalUpdateData)

  const updated = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!updated) {
    throw new ApolloError('Workspace not found after update')
  }

  return updated
}

/**
 * Function to get all workspaces for a specific organization
 * Users with management rights see all workspaces, regular users see only their workspaces
 *
 * @param number organizationId Organization ID to get workspaces for
 * @param UserLogined user User requesting the workspaces
 * @returns Promise<Workspace[]> Array of workspaces belonging to the organization
 */
export async function getOrganizationWorkspaces(organizationId: number, user: UserLogined): Promise<Workspace[]> {
  if (!organizationId) {
    throw new ValidationError('Organization ID is required')
  }

  if (!user) {
    throw new ValidationError('User is required')
  }

  if (user.is_super_admin) {
    const workspaces = await getAllWorkspace({ organizationId })
    return removeDuplicateWorkspaces(workspaces)
  }

  // Optimize: if requesting current organization, use cached data
  const userOrganization = Number(organizationId) === Number(user.current_organization_id) && user.currentOrganizationUser ? user.currentOrganizationUser : await getUserOrganization(user.id, organizationId)

  if (!userOrganization) {
    return []
  }

  if (canManageOrganization(userOrganization.role)) {
    const workspaces = await getAllWorkspace({ organizationId })
    return removeDuplicateWorkspaces(workspaces)
  }

  const workspaces = await getAllWorkspace({ userId: user.id, organizationId })
  return removeDuplicateWorkspaces(workspaces)
}

/**
 * Helper function to remove duplicate workspaces by ID
 * @param workspaces Array of workspaces that may contain duplicates
 * @returns Array of unique workspaces
 */
function removeDuplicateWorkspaces<T extends { id?: number }>(workspaces: T[]): T[] {
  return workspaces.reduce((acc: T[], current) => {
    const existingWorkspace = acc.find((ws) => ws.id === current.id)

    if (!existingWorkspace) {
      acc.push(current)
    }

    return acc
  }, [])
}
