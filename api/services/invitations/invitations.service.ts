import dayjs from 'dayjs'
import { Knex } from 'knex'

import database from '../../config/database.config'
import { INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { ORGANIZATION_MANAGEMENT_ROLES, ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_ROLE_OWNER, ORGANIZATION_USER_STATUS_PENDING, OrganizationUserRole } from '../../constants/organization.constant'
import { WORKSPACE_USER_ROLE_MEMBER, WORKSPACE_USER_ROLE_OWNER, WORKSPACE_USER_STATUS_ACTIVE, WorkspaceUserRole } from '../../constants/workspace.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import generateRandomKey from '../../helpers/genarateRandomkey'
import { normalizeEmail } from '../../helpers/string.helper'
import {
  createOrganizationInvitation,
  createWorkspaceInvitation,
  deleteOrganizationInvitations,
  deleteWorkspaceInvitations,
  getDetailWorkspaceInvitations,
  getOrganizationInvitation,
  getOrganizationInvitations,
  getWorkspaceInvitation,
  VALID_PERIOD_DAYS,
} from '../../repository/invitations.repository'
import { getOrganizationUsersByOrganizationId } from '../../repository/organization_user.repository'
import { findUser } from '../../repository/user.repository'
import { getWorkspace, getWorkspaceMembers } from '../../repository/workspace.repository'
import { createMemberAndInviteToken, deleteWorkspaceUsers, getWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization, validateWorkspaceInvitePermissions } from '../../utils/access.helper'
import formatDateDB from '../../utils/format-date-db'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateInviteWorkspaceMember } from '../../validations/workspace.validation'
import { UserLogined } from '../authentication/get-user-logined.service'
import { sendMail } from '../email/email.service'
import { getOrganizationSmtpConfig } from '../../utils/organizationSmtp.utils'
import { addUserToOrganization, getUserOrganization } from '../organization/organization_users.service'

type InvitationResponse = {
  user_id: number
  user_name: string
  user_email: string
  status: string
}

export type InviteUserType = 'organization' | 'workspace'

export type InviteUserParams = {
  type: InviteUserType
  invitee_email: string
  role: WorkspaceUserRole | OrganizationUserRole
  allowedFrontendUrl: string
  workspace_id?: number
}

/**
 * Universal function to invite user to organization or workspace
 */
export async function inviteUser(user: UserLogined, params: InviteUserParams): Promise<InvitationResponse> {
  const { type, invitee_email, role, allowedFrontendUrl, workspace_id } = params

  if (type === 'workspace') {
    return inviteUserToWorkspace(user, workspace_id!, invitee_email, role as WorkspaceUserRole, allowedFrontendUrl)
  }

  return inviteUserToOrganization(user, invitee_email, role as OrganizationUserRole, allowedFrontendUrl)
}

/**
 * Invite user to workspace
 */
async function inviteUserToWorkspace(user: UserLogined, workspaceId: number, invitee_email: string, role: WorkspaceUserRole = WORKSPACE_USER_ROLE_MEMBER, allowedFrontendUrl: string): Promise<InvitationResponse> {
  const validateResult = validateInviteWorkspaceMember({ workspaceId, email: invitee_email, role })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    const workspace = await getWorkspace({ id: workspaceId, organization_id: user.current_organization_id })

    if (!workspace) {
      throw new ApolloError('Workspace not found')
    }

    const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })

    const permissions = validateWorkspaceInvitePermissions(user.is_super_admin || false, user.currentOrganizationUser?.role, workspaceMember?.role, role)

    if (!permissions.canInvite) {
      const allowedRolesStr = permissions.allowedRoles.length > 0 ? permissions.allowedRoles.join(', ') : 'none'
      throw new ApolloError(`You don't have permission to invite users with ${role} role. ` + `You can only invite with the following roles: ${allowedRolesStr}`)
    }

    // Check if trying to invite with owner role - only one owner allowed per workspace
    if (role === WORKSPACE_USER_ROLE_OWNER) {
      const allWorkspaceMembers = await getWorkspaceMembers({ workspaceId: workspace.id })
      const existingOwner = allWorkspaceMembers.find((member) => member.role === WORKSPACE_USER_ROLE_OWNER)

      if (existingOwner) {
        throw new ApolloError(`Workspace already has an ${WORKSPACE_USER_ROLE_OWNER}. Only one ${WORKSPACE_USER_ROLE_OWNER} is allowed per workspace.`)
      }

      const allInvitations = await getDetailWorkspaceInvitations({ workspaceId: workspace.id })
      const pendingOwnerInvitation = allInvitations.find((inv) => inv.role === WORKSPACE_USER_ROLE_OWNER && inv.status === INVITATION_STATUS_PENDING)

      if (pendingOwnerInvitation) {
        throw new ApolloError(`There is already a pending invitation for ${WORKSPACE_USER_ROLE_OWNER} role. Only one ${WORKSPACE_USER_ROLE_OWNER} is allowed per workspace.`)
      }
    }

    if (user.email === invitee_email) {
      throw new ApolloError("Can't invite yourself")
    }

    const existingInvitations = await getWorkspaceInvitation({
      email: invitee_email,
      workspace_id: workspace.id,
    })

    const pendingInvitation = existingInvitations.find((inv) => inv.status === INVITATION_STATUS_PENDING)

    if (pendingInvitation) {
      const isExpired = dayjs().isAfter(pendingInvitation.valid_until)

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
        url: `${allowedFrontendUrl}/invitation/${token}`,
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
          invited_by_id: user.id,
          workspace_id: workspace.id,
          organization_id: workspace.organization_id,
          workspace_role: role,
          valid_until: formatDateDB(dayjs().add(VALID_PERIOD_DAYS, 'day')),
          status: INVITATION_STATUS_PENDING,
        },
        transaction,
      )
    }

    await transaction.commit()

    try {
      const smtpConfig = await getOrganizationSmtpConfig(workspace.organization_id)
      await sendMail(normalizeEmail(invitee_email), 'Workspace invitation', template, undefined, 'WebAbility Team', smtpConfig)
      console.log('Workspace Invitation Token', token)
    } catch (emailError) {
      logger.error('Failed to send workspace invitation email:', {
        error: emailError,
        workspace_id: workspaceId,
        invitee_email,
        inviter_id: user.id,
      })
    }

    return {
      user_id: member?.id || 0,
      user_name: member?.name || '',
      user_email: member?.email || invitee_email,
      status: INVITATION_STATUS_PENDING,
    }
  } catch (error) {
    if (transaction) await transaction.rollback()
    throw error
  }
}

/**
 * Invite user to organization
 */
async function inviteUserToOrganization(user: UserLogined, invitee_email: string, role: OrganizationUserRole = ORGANIZATION_USER_ROLE_MEMBER, allowedFrontendUrl: string): Promise<InvitationResponse> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  if (role === ORGANIZATION_USER_ROLE_OWNER && !user.is_super_admin) {
    throw new ApolloError(`Only super admin can invite users with ${ORGANIZATION_USER_ROLE_OWNER} role.`)
  }

  if (role === ORGANIZATION_USER_ROLE_OWNER) {
    const organization = user.currentOrganization

    if (!organization) {
      throw new ApolloError('Organization not found')
    }

    const allOrgUsers = await getOrganizationUsersByOrganizationId(organization.id)
    const existingOwner = allOrgUsers.find((orgUser) => orgUser.role === ORGANIZATION_USER_ROLE_OWNER)

    if (existingOwner) {
      throw new ApolloError(`Organization already has an ${ORGANIZATION_USER_ROLE_OWNER}. Only one ${ORGANIZATION_USER_ROLE_OWNER} is allowed per organization.`)
    }

    const allInvitations = await getOrganizationInvitations(organization.id)
    const pendingOwnerInvitation = allInvitations.find((inv) => inv.role === ORGANIZATION_USER_ROLE_OWNER && inv.status === INVITATION_STATUS_PENDING)

    if (pendingOwnerInvitation) {
      throw new ApolloError(`There is already a pending invitation for ${ORGANIZATION_USER_ROLE_OWNER} role. Only one ${ORGANIZATION_USER_ROLE_OWNER} is allowed per organization.`)
    }
  }

  const isAllowed = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can invite to organization`)
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    const organization = user.currentOrganization

    if (!organization) {
      throw new ApolloError('Organization not found')
    }

    if (user.email === invitee_email) {
      throw new ApolloError("Can't invite yourself")
    }

    const existingInvitations = await getOrganizationInvitation({
      email: invitee_email,
      organization_id: organization.id,
    })

    const pendingInvitation = existingInvitations.find((inv) => inv.status === ORGANIZATION_USER_STATUS_PENDING)

    if (pendingInvitation) {
      const isExpired = dayjs().isAfter(pendingInvitation.valid_until)

      if (!isExpired) {
        throw new ApolloError('User already has a pending invitation for this organization')
      }
    }

    await deleteOrganizationInvitations(
      {
        email: invitee_email,
        organization_id: organization.id,
      },
      transaction,
    )

    const member = await findUser({ email: invitee_email })

    if (member) {
      const existingOrgUser = await getUserOrganization(member.id, organization.id!)

      if (existingOrgUser) {
        throw new ApolloError('User is already a member of this organization')
      }
    }

    const token = await generateRandomKey()

    const template = await compileEmailTemplate({
      fileName: 'inviteOrganizationMember.mjml',
      data: {
        organizationName: organization.name,
        url: `${allowedFrontendUrl}/invitation/${token}`,
      },
    })

    if (member) {
      await addUserToOrganization(member.id, organization.id, role, ORGANIZATION_USER_STATUS_PENDING, transaction)
    }

    await createOrganizationInvitation(
      {
        email: invitee_email,
        token,
        invited_by_id: user.id,
        organization_id: organization.id,
        organization_role: role,
        valid_until: formatDateDB(dayjs().add(VALID_PERIOD_DAYS, 'day')),
        status: ORGANIZATION_USER_STATUS_PENDING,
      },
      transaction,
    )

    await transaction.commit()

    try {
      const smtpConfig = organization.id ? await getOrganizationSmtpConfig(organization.id) : null
      await sendMail(normalizeEmail(invitee_email), 'Organization invitation', template, undefined, 'WebAbility Team', smtpConfig)
      console.log('Organization Invitation Token', token)
    } catch (emailError) {
      logger.error('Failed to send organization invitation email:', {
        error: emailError,
        organization_id: organization.id,
        invitee_email,
        inviter_id: user.id,
      })
    }

    return {
      user_id: member?.id || 0,
      user_name: member?.name || '',
      user_email: member?.email || invitee_email,
      status: ORGANIZATION_USER_STATUS_PENDING,
    }
  } catch (error) {
    if (transaction) await transaction.rollback()
    throw error
  }
}
