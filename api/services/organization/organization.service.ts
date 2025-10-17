import database from '../../config/database.config'
import { IS_PROD } from '../../config/env'
import { ORGANIZATION_USER_ROLE_ADMIN, ORGANIZATION_USER_ROLE_OWNER, ORGANIZATION_USER_STATUS_ACTIVE } from '../../constants/organization.constant'
import { objectToString } from '../../helpers/string.helper'
import { deleteOrganizationInvitations, deleteWorkspaceInvitations } from '../../repository/invitations.repository'
import { createOrganization, deleteOrganization, getOrganizationByDomain, getOrganizationByDomainExcludeId, getOrganizationById as getOrganizationByIdRepo, getOrganizationsByIds as getOrganizationByIdsRepo, Organization, updateOrganization } from '../../repository/organization.repository'
import { findUser } from '../../repository/user.repository'
import { updateUser, UserProfile } from '../../repository/user.repository'
import { deleteWorkspaceUsersByOrganization } from '../../repository/workspace_users.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { normalizeDomain } from '../../utils/domain.utils'
import { getMatchingFrontendUrl } from '../../utils/env.utils'
import { ApolloError, ForbiddenError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateAddOrganization, validateEditOrganization, validateGetOrganizationByDomain, validateRemoveOrganization } from '../../validations/organization.validation'
import { addUserToOrganization, getOrganizationsByUserId, getUserOrganization, removeUserFromOrganization as removeUserFromOrganizationService } from './organization_users.service'
export interface CreateOrganizationInput {
  name: string
  domain: string
  logo_url?: string
  settings?: any
}

export async function addOrganization(data: CreateOrganizationInput, user: UserProfile & { isActive?: number }): Promise<number | ValidationError> {
  const validateResult = validateAddOrganization(data)

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const currentUrl = getMatchingFrontendUrl(data.domain)
  logger.info('Current URL:', currentUrl)

  if (!currentUrl) {
    throw new ForbiddenError('Provided domain is not in the list of allowed URLs')
  }

  const orgLinks = await getOrganizationsByUserId(user.id)
  const maxOrgs = user.isActive ? 3 : 1

  if (IS_PROD) {
    if (orgLinks.length >= maxOrgs) {
      throw new ApolloError(user.isActive ? 'You have reached the limit of organizations you can create (3 for verified users).' : 'Please verify your email to create more than one organization.')
    }
  }

  const trx = await database.transaction()

  try {
    const exists = await getOrganizationByDomain(data.domain)

    if (exists) {
      throw new ApolloError('Organization domain already exists, please choose another one')
    }

    const orgToCreate = { ...data }

    if ('settings' in data) {
      orgToCreate.settings = objectToString(data.settings)
    }

    const ids = await createOrganization(orgToCreate, trx)
    const newOrgId = Number(ids[0])

    await addUserToOrganization(user.id, newOrgId, ORGANIZATION_USER_ROLE_ADMIN, ORGANIZATION_USER_STATUS_ACTIVE, trx)
    await updateUser(user.id, { current_organization_id: newOrgId }, trx)

    await trx.commit()

    return ids && ids.length > 0 ? ids[0] : null
  } catch (error) {
    await trx.rollback()
    logger.error('Error creating organization:', error)

    throw error
  }
}

export async function editOrganization(data: Partial<Organization>, user: UserProfile, organizationId: number | string): Promise<number | ValidationError> {
  const validateResult = validateEditOrganization({ ...data, id: organizationId })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  await checkOrganizationAccess(user, organizationId, 'You can only edit your own organizations')

  const orgUser = await getUserOrganization(user.id, Number(organizationId))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError('Only owner or admin can edit the organization')
  }

  const trx = await database.transaction()

  try {
    const updateData = { ...data }

    if (data.domain) {
      const exists = await getOrganizationByDomainExcludeId(data.domain, Number(organizationId))

      if (exists) {
        throw new ApolloError('Organization domain already exists, please choose another one')
      }
    }

    if ('settings' in updateData) {
      updateData.settings = objectToString(updateData.settings)
    }

    const result = await updateOrganization(Number(organizationId), updateData, trx)

    await trx.commit()

    return result
  } catch (error) {
    await trx.rollback()
    logger.error('Error updating organization:', error)

    throw error
  }
}

export async function removeOrganization(user: UserProfile, organizationId: number | string): Promise<number | ValidationError> {
  const validateResult = validateRemoveOrganization({ id: organizationId })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  await checkOrganizationAccess(user, organizationId, 'You can only remove your own organizations')

  const orgUser = await getUserOrganization(user.id, Number(organizationId))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError('Only owner or admin can remove the organization')
  }

  const trx = await database.transaction()

  try {
    const deleted = await deleteOrganization(Number(organizationId), trx)

    await trx.commit()

    return deleted
  } catch (error) {
    await trx.rollback()

    logger.error('Error deleting organization:', error)

    throw error
  }
}

export async function getOrganizations(user: UserProfile): Promise<Organization[]> {
  try {
    const orgLinks = await getOrganizationsByUserId(user.id)
    const orgIds = orgLinks.map((link) => link.organization_id)

    if (!orgIds.length) return []

    return await getOrganizationByIdsRepo(orgIds)
  } catch (error) {
    logger.error('Error fetching organizations by user:', error)

    throw error
  }
}

export async function getOrganizationById(id: number | string, user: UserProfile): Promise<Organization | undefined> {
  await checkOrganizationAccess(user, id, 'You can only access your own organizations')

  try {
    return await getOrganizationByIdRepo(Number(id))
  } catch (error) {
    logger.error('Error fetching organization by id:', error)

    throw error
  }
}

export async function getOrganizationByDomainService(domain: string): Promise<Organization | ValidationError | undefined> {
  const validateResult = validateGetOrganizationByDomain({ domain })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const normalizedDomain = normalizeDomain(domain)

  try {
    return await getOrganizationByDomain(normalizedDomain)
  } catch (error) {
    logger.error('Error fetching organization by domain:', error)
    throw error
  }
}

export async function removeUserFromOrganization(initiator: UserProfile, userId: number): Promise<number> {
  const organizationId = initiator.current_organization_id

  if (!organizationId) {
    throw new ApolloError('No current organization selected')
  }

  if (initiator.id === userId) {
    throw new ForbiddenError('You cannot remove yourself from the organization')
  }

  const orgUser = await getUserOrganization(initiator.id, organizationId)
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ForbiddenError('Only owner or admin can remove users from the organization')
  }

  const trx = await database.transaction()

  try {
    const target = await getUserOrganization(userId, organizationId)

    if (!target) {
      throw new ValidationError('User is not a member of this organization')
    }

    if (target.role === ORGANIZATION_USER_ROLE_OWNER) {
      throw new ForbiddenError('Cannot remove the owner of the organization')
    }

    const targetUser = await findUser({ id: userId })

    if (targetUser && targetUser.current_organization_id === organizationId) {
      const userOrgs = await getOrganizationsByUserId(userId)
      const otherOrgs = userOrgs.filter((o) => o.organization_id !== organizationId)

      if (otherOrgs.length === 0) {
        throw new ValidationError('User must belong to at least one organization. Remove operation cancelled.')
      }

      let newOrgId: number | null = null

      const initiatorOrgs = await getOrganizationsByUserId(initiator.id)
      const shared = otherOrgs.find((o) => initiatorOrgs.some((io) => io.organization_id === o.organization_id))

      newOrgId = shared ? shared.organization_id : otherOrgs[0].organization_id

      await updateUser(userId, { current_organization_id: newOrgId }, trx)
    }

    await deleteWorkspaceUsersByOrganization(userId, organizationId, trx)

    if (targetUser && targetUser.email) {
      await deleteWorkspaceInvitations({ email: targetUser.email, organization_id: organizationId }, trx)
      await deleteOrganizationInvitations({ email: targetUser.email, organization_id: organizationId }, trx)
    }

    // Also remove invitations created by this user in this organization
    await deleteWorkspaceInvitations({ invited_by_id: userId, organization_id: organizationId }, trx)
    await deleteOrganizationInvitations({ invited_by_id: userId, organization_id: organizationId }, trx)

    const result = await removeUserFromOrganizationService(target.id, trx)

    await trx.commit()

    return result
  } catch (error) {
    await trx.rollback()
    throw error
  }
}

async function checkOrganizationAccess(user: UserProfile, organizationId: number | string, errorMessage: string) {
  try {
    const orgUser = await getUserOrganization(user.id, Number(organizationId))

    if (!orgUser) {
      throw new ApolloError(errorMessage)
    }
  } catch (error) {
    logger.error('Error checking organization access:', error)

    throw error
  }
}
