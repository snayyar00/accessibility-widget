import dayjs from 'dayjs'
import { Knex } from 'knex'

import database from '../../config/database.config'
import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { WORKSPACE_INVITATION_STATUS_PENDING, WORKSPACE_USER_STATUS_ACTIVE, WorkspaceUserRole } from '../../constants/workspace.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import generateRandomKey from '../../helpers/genarateRandomkey'
import { normalizeEmail, stringToSlug } from '../../helpers/string.helper'
import { findUser } from '../../repository/user.repository'
import { UserProfile } from '../../repository/user.repository'
import { createNewWorkspaceAndMember, deleteWorkspaceById, getAllWorkspace, GetAllWorkspaceResponse, getWorkspace, updateWorkspace as updateWorkspaceRepo, Workspace } from '../../repository/workspace.repository'
import { createWorkspaceInvitation, deleteWorkspaceInvitations, getWorkspaceInvitation, VALID_PERIOD_DAYS } from '../../repository/workspace_invitations.repository'
import { createMemberAndInviteToken, deleteWorkspaceUsers, getListWorkspaceMemberByAliasWorkspace, getWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization } from '../../utils/access.helper'
import formatDateDB from '../../utils/format-date-db'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateCreateWorkspace, validateInviteWorkspaceMember, validateUpdateWorkspace } from '../../validations/workspace.validation'
import { sendMail } from '../email/email.service'
import { getUserOrganization } from '../organization/organization_users.service'

type FindWorkspaceByAliasResponse = {
  user_name: string
  user_id: number
  user_email: string
  status: string
}

type CreateWorkspaceResponse = {
  id: Promise<number | Error>
  name: string
  alias: string
  organization_id: number
}

/**
 * Function to get all workspaces for current user
 *
 * @param UserProfile user User who execute this function
 * @returns Promise<GetAllWorkspaceResponse[]> Array of user's workspaces
 */
export async function getAllWorkspaces(user: UserProfile): Promise<GetAllWorkspaceResponse[]> {
  const allWorkspaces = await getAllWorkspace({ userId: user.id, organizationId: user.current_organization_id })

  const uniqueWorkspaces = allWorkspaces.reduce((acc: GetAllWorkspaceResponse[], current) => {
    const existingWorkspace = acc.find((ws) => ws.id === current.id)

    if (!existingWorkspace) {
      acc.push(current)
    }

    return acc
  }, [])

  return uniqueWorkspaces
}

/**
 * Function to get all workspaces for a specific organization
 * Only organization owner can see all workspaces
 *
 * @param number organizationId Organization ID to get workspaces for
 * @param UserProfile user User requesting the workspaces
 * @returns Promise<Workspace[]> Array of workspaces belonging to the organization
 */
export async function getOrganizationWorkspaces(organizationId: number, user: UserProfile): Promise<Workspace[]> {
  if (!organizationId) {
    throw new ValidationError('Organization ID is required')
  }

  if (!user) {
    throw new ValidationError('User is required')
  }

  const userOrganization = await getUserOrganization(user.id, organizationId)

  if (!userOrganization) {
    throw new ValidationError('User is not a member of this organization')
  }

  if (!canManageOrganization(userOrganization.role)) {
    throw new ValidationError('Only organization owner and admin can view all workspaces')
  }

  const workspaces = await getAllWorkspace({ organizationId })

  const uniqueWorkspaces = workspaces.reduce((acc: Workspace[], current) => {
    const existingWorkspace = acc.find((ws) => ws.id === current.id)

    if (!existingWorkspace) acc.push(current)

    return acc
  }, [])

  return uniqueWorkspaces
}

/**
 * Function to get all members of a workspace
 * Only organization owner and admin can see all workspace members
 *
 * @param number workspaceId ID of the workspace to get members for
 * @param UserProfile user User requesting the workspace members
 * @returns Promise<GetAllWorkspaceResponse[]> Array of workspace members
 */
export async function getWorkspaceMembers(workspaceId: number, user?: UserProfile): Promise<GetAllWorkspaceResponse[]> {
  if (!workspaceId) {
    throw new ValidationError('Workspace ID is required')
  }

  if (!user.current_organization_id) {
    throw new ValidationError('No current organization selected')
  }

  const userOrganization = await getUserOrganization(user.id, user.current_organization_id)

  if (!userOrganization) {
    throw new ValidationError('User is not a member of this organization')
  }

  if (!canManageOrganization(userOrganization.role)) {
    throw new ValidationError('Only organization owner and admin can view workspace members')
  }

  const members = await getAllWorkspace({ workspaceId })

  const uniqueMembers = members.reduce((acc: GetAllWorkspaceResponse[], current) => {
    const existingMember = acc.find((m) => m.user_id === current.user_id)

    if (!existingMember) {
      acc.push(current)
    }
    return acc
  }, [])

  return uniqueMembers
}

/**
 * Function to get workspace members by alias
 *
 * @param string alias Alias of workspace to get members for
 * @returns Promise<FindWorkspaceByAliasResponse[]> Array of workspace members with user info and status
 */
export async function findWorkspaceByAlias(alias: string): Promise<FindWorkspaceByAliasResponse[]> {
  const members = await getListWorkspaceMemberByAliasWorkspace({ alias })

  const uniqueMembers = members.reduce((acc: typeof members, member) => {
    const existingMember = acc.find((m) => m.user_id === member.user_id)

    if (!existingMember) {
      acc.push(member)
    }

    return acc
  }, [])

  return uniqueMembers.map((member) => ({
    user_id: member.user_id,
    user_name: member.user_name,
    user_email: member.email,
    status: member.status,
  }))
}

/**
 * Function to create workspace
 *
 * @param UserProfile user User who creates workspace
 * @param string workspaceName Name of new workspace
 * @returns Promise<CreateWorkspaceResponse> Created workspace info
 */
export async function createWorkspace(user: UserProfile, workspaceName: string): Promise<CreateWorkspaceResponse> {
  const validateResult = validateCreateWorkspace({ name: workspaceName })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError('Only organization owner or admin can create the workspace')
  }

  const alias = stringToSlug(workspaceName)
  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  if (workspace) {
    throw new ApolloError('Workspace exist')
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
 * Function to invite workspace member
 *
 * @param UserProfile user User who creates invitation
 * @param string alias Alias of workspace you want to invite to join
 * @param string invitee_email Email of who you want to send invitation to
 * @param WorkspaceUserRole role Role for the invited user (optional, defaults to 'member')
 * @param string allowedFrontendUrl Frontend URL for invitation link
 * @returns Promise<FindWorkspaceByAliasResponse> Created invitation info
 */
export async function inviteWorkspaceMember(user: UserProfile, alias: string, invitee_email: string, role: WorkspaceUserRole = 'member', allowedFrontendUrl: string): Promise<FindWorkspaceByAliasResponse> {
  const validateResult = validateInviteWorkspaceMember({ email: invitee_email, alias, role })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can create the workspace`)
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    const workspace = await getWorkspace({ alias })

    if (!workspace) {
      throw new ApolloError('Workspace not found')
    }

    if (user.email === invitee_email) {
      throw new ApolloError("Can't invite yourself")
    }

    const existingInvitations = await getWorkspaceInvitation({
      email: invitee_email,
      workspace_id: workspace.id,
    })

    const pendingInvitation = existingInvitations.find((inv) => inv.status === WORKSPACE_INVITATION_STATUS_PENDING)

    if (pendingInvitation) {
      const isExpired = new Date(pendingInvitation.valid_until) < new Date()

      if (!isExpired) {
        throw new ApolloError('User already has a pending invitation for this workspace')
      }
    }

    await deleteWorkspaceInvitations(
      {
        email: invitee_email,
        workspace_id: workspace.id,
      },
      transaction,
    )

    const member = await findUser({ email: invitee_email })

    if (member) {
      const existingWorkspaceUser = await getWorkspaceUser({
        user_id: member.id,
        workspace_id: workspace.id,
      })

      if (existingWorkspaceUser) {
        if (existingWorkspaceUser.status === WORKSPACE_USER_STATUS_ACTIVE) {
          throw new ApolloError('User is already an active member of this workspace')
        }

        await deleteWorkspaceUsers(
          {
            user_id: member.id,
            workspace_id: workspace.id,
          },
          transaction,
        )
      }
    }

    const token = await generateRandomKey()

    const template = await compileEmailTemplate({
      fileName: 'inviteWorkspaceMember.mjml',
      data: {
        workspaceName: workspace.name,
        url: `${allowedFrontendUrl}/workspaces/invitation/${token}`,
      },
    })

    if (member) {
      await createMemberAndInviteToken(
        {
          organization_id: workspace.organization_id,
          workspace_id: workspace.id,
          user_id: user.id,
          member_id: member.id,
          email: invitee_email,
          token,
          role,
        },
        transaction,
      )
    } else {
      await createWorkspaceInvitation(
        {
          email: invitee_email,
          token,
          invited_by: user.id,
          workspace_id: workspace.id,
          organization_id: workspace.organization_id,
          role,
          valid_until: formatDateDB(dayjs().add(VALID_PERIOD_DAYS, 'day')),
          status: WORKSPACE_INVITATION_STATUS_PENDING,
        },
        transaction,
      )
    }

    await transaction.commit()

    try {
      await sendMail(normalizeEmail(invitee_email), 'Workspace invitation', template)
    } catch (emailError) {
      logger.error('Failed to send invitation email:', {
        error: emailError,
        workspace_alias: alias,
        invitee_email,
        inviter_id: user.id,
      })
    }

    return {
      user_id: member?.id || 0,
      user_name: member?.name || '',
      user_email: member?.email || invitee_email,
      status: WORKSPACE_INVITATION_STATUS_PENDING,
    }
  } catch (error) {
    await transaction.rollback()

    logger.error('Failed to invite workspace member:', {
      error,
      workspace_alias: alias,
      invitee_email,
      inviter_id: user.id,
    })

    throw new ApolloError(error)
  }
}

/**
 * Function to delete workspace
 * @param UserProfile user User who wants to delete workspace
 * @param number workspace_id ID of the workspace to delete
 * @returns Promise<boolean> True if workspace was deleted successfully
 */
export async function deleteWorkspace(user: UserProfile, workspace_id: number): Promise<boolean> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError('Only organization owner or admin can delete the workspace')
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  await deleteWorkspaceById(workspace_id)

  return true
}

/**
 * Function to update workspace
 * @param UserProfile user User who wants to update workspace
 * @param number workspace_id ID of the workspace to update
 * @param Partial<Workspace> data Object with fields to update
 * @returns Promise<Workspace> Updated workspace
 */
export async function updateWorkspace(user: UserProfile, workspace_id: number, data: Partial<Workspace>): Promise<Workspace> {
  const validateResult = validateUpdateWorkspace(data)

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError('Only organization owner or admin can update the workspace')
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })
  if (!workspace) {
    throw new ApolloError('Workspace not found')
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
      const existingWorkspace = await getWorkspace({
        alias,
        organization_id: user.current_organization_id,
      })

      if (existingWorkspace) {
        throw new ValidationError('Workspace alias already exists in organization')
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
