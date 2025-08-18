import dayjs from 'dayjs'

import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import generateRandomKey from '../../helpers/genarateRandomkey'
import { normalizeEmail, stringToSlug } from '../../helpers/string.helper'
import { findUser } from '../../repository/user.repository'
import { UserProfile } from '../../repository/user.repository'
import { createNewWorkspaceAndMember, deleteWorkspaceById, getAllWorkspace, GetAllWorkspaceResponse, getWorkspace, updateWorkspace as updateWorkspaceRepo, Workspace } from '../../repository/workspace.repository'
import { createWorkspaceInvitation, VALID_PERIOD_DAYS } from '../../repository/workspace_invitations.repository'
import { createMemberAndInviteToken, getListWorkspaceMemberByAliasWorkspace } from '../../repository/workspace_users.repository'
import formatDateDB from '../../utils/format-date-db'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateCreateWorkspace, validateUpdateWorkspace } from '../../validations/workspace.validation'
import { sendMail } from '../email/email.service'
import { getUserOrganization } from '../organization/organization_users.service'

type FindWorkspaceByAliasResponse = {
  userName: string
  userId: number
  email: string
  status: string
  isOwner: boolean
}

type CreateWorkspaceResponse = {
  id: Promise<number | Error>
  name: string
  alias: string
}

/**
 * Function to get all workspace
 *
 * @param User user User who execute this function
 *
 */
export async function getAllWorkspaces(user: UserProfile): Promise<GetAllWorkspaceResponse[]> {
  const allWorkspaces = await getAllWorkspace({ userId: user.id })
  return allWorkspaces
}

/**
 * Function to get workspace by alias
 *
 * @param User user   User who execute this function
 * @param string alias Alias of workspace want to get
 *
 */
export async function findWorkspaceByAlias(alias: string): Promise<FindWorkspaceByAliasResponse[]> {
  const members = await getListWorkspaceMemberByAliasWorkspace({ alias })

  return members.map((member) => ({
    userName: member.userName,
    userId: member.userId,
    email: member.email,
    status: member.status,
    isOwner: member.userId === member.owner,
  }))
}

/**
 * Function to create workspace
 *
 * @param User          user             User who create workspace
 * @param string        workspaceName    Name of new workspace
 * @param Organization  organization     Organization where workspace will be created
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
  const isAllowed = orgUser && ORGANIZATION_MANAGEMENT_ROLES.includes(orgUser.role as (typeof ORGANIZATION_MANAGEMENT_ROLES)[number])

  if (!isAllowed) {
    throw new ApolloError('Only owner or admin can create the workspace')
  }

  const alias = stringToSlug(workspaceName)
  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  if (workspace) {
    throw new ApolloError('Workspace exist')
  }

  const workspaceId = createNewWorkspaceAndMember({ name: workspaceName, alias, organization_id: user.current_organization_id, userid: user.id })

  return {
    id: workspaceId,
    name: workspaceName,
    alias,
  }
}

/**
 * Function to invite workspace member
 *
 * @param User   user         User who create invitation
 * @param string alias        alias of workspace you want to invite to join
 * @param string inviteeEmail Email of who you want to send invitation to
 * @param string role         Role for the invited user (optional, defaults to 'member')
 */
export async function inviteWorkspaceMember(user: UserProfile, alias: string, inviteeEmail: string, role: string = 'member'): Promise<FindWorkspaceByAliasResponse> {
  try {
    const workspace = await getWorkspace({ alias })

    if (!workspace) {
      throw new ApolloError('Workspace not found')
    }

    if (user.email === inviteeEmail) {
      throw new ApolloError("Can't invite yourself")
    }

    const member = await findUser({ email: inviteeEmail })

    const token = await generateRandomKey()
    const subject = 'Workspace invitation'

    const template = await compileEmailTemplate({
      fileName: 'inviteWorkspaceMember.mjml',
      data: {
        workspaceName: workspace.name,
        url: `${process.env.FRONTEND_URL}/workspaces/invitation/${token}`,
      },
    })

    const queries: (Promise<boolean> | Promise<number[]>)[] = [sendMail(normalizeEmail(inviteeEmail), subject, template)]

    if (member) {
      queries.push(
        createMemberAndInviteToken({
          email: inviteeEmail,
          token,
          workspaceId: workspace.id,
          organizationId: workspace.organization_id,
          memberId: member.id,
          userId: user.id,
          role,
        }),
      )
    } else {
      queries.push(
        createWorkspaceInvitation({
          email: inviteeEmail,
          token,
          invited_by: user.id,
          workspace_id: workspace.id,
          organization_id: workspace.organization_id,
          role,
          valid_until: formatDateDB(dayjs().add(VALID_PERIOD_DAYS, 'day')),
          status: 'pending',
        }),
      )
    }

    await Promise.all<boolean | number[]>(queries)

    return {
      userName: member?.name || '',
      userId: member?.id || 0,
      email: member?.email || inviteeEmail,
      status: 'pending',
      isOwner: false,
    }
  } catch (error) {
    logger.error(error)
    throw new ApolloError(error)
  }
}

/**
 * Function to delete workspace
 * @param user User who wants to delete workspace
 * @param workspaceId ID of the workspace to delete
 * @returns true if deleted
 */
export async function deleteWorkspace(user: UserProfile, workspaceId: number): Promise<boolean> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && ORGANIZATION_MANAGEMENT_ROLES.includes(orgUser.role as (typeof ORGANIZATION_MANAGEMENT_ROLES)[number])

  if (!isAllowed) {
    throw new ApolloError('Only owner or admin can delete the workspace')
  }

  const workspace = await getWorkspace({ id: workspaceId })

  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  if (workspace.organization_id !== Number(user.current_organization_id)) {
    throw new ApolloError('You cannot delete workspace from another organization')
  }

  await deleteWorkspaceById(workspaceId)

  return true
}

/**
 * Function to update workspace
 * @param user User who wants to update workspace
 * @param workspaceId ID of the workspace to update
 * @param data Object with fields to update
 * @returns updated workspace
 */
export async function updateWorkspace(user: UserProfile, workspaceId: number, data: Partial<Workspace>): Promise<Workspace> {
  const validateResult = validateUpdateWorkspace(data)

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && ORGANIZATION_MANAGEMENT_ROLES.includes(orgUser.role as (typeof ORGANIZATION_MANAGEMENT_ROLES)[number])

  if (!isAllowed) {
    throw new ApolloError('Only owner or admin can update the workspace')
  }

  const workspace = await getWorkspace({ id: workspaceId })
  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  if (workspace.organization_id !== Number(user.current_organization_id)) {
    throw new ApolloError('You cannot update workspace from another organization')
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

  await updateWorkspaceRepo(workspaceId, finalUpdateData)

  const updated = await getWorkspace({ id: workspaceId })

  if (!updated) {
    throw new ApolloError('Workspace not found after update')
  }

  return updated
}
