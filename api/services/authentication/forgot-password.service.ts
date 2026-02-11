import { SEND_MAIL_TYPE } from '../../constants/send-mail-type.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import generateRandomKey from '../../helpers/genarateRandomkey'
import { Organization } from '../../repository/organization.repository'
import { findUser, getUserByIdAndJoinUserToken } from '../../repository/user.repository'
import { createToken, updateUserTokenById } from '../../repository/user_tokens.repository'
import { getMatchingFrontendUrl } from '../../utils/env.utils'
import { ApolloError, ForbiddenError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { emailValidation } from '../../validations/email.validation'
import { getOrganizationSmtpConfig } from '../../utils/organizationSmtp.utils'
import { sendMail } from '../email/email.service'

export async function forgotPasswordUser(email: string, organization: Organization): Promise<boolean> {
  const validateResult = emailValidation(email)

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  try {
    const user = await findUser({ email })

    if (!user || !user.id) {
      return true
    }

    let session = await getUserByIdAndJoinUserToken(user.id, SEND_MAIL_TYPE.FORGOT_PASSWORD)

    const tokenGenerated = await generateRandomKey()
    const token = `${tokenGenerated}-${user.id}`

    const currentUrl = getMatchingFrontendUrl(organization.domain)

    if (!currentUrl) {
      throw new ForbiddenError('Provided domain is not in the list of allowed URLs')
    }

    if (!session) {
      await createToken(user.id, token, SEND_MAIL_TYPE.FORGOT_PASSWORD)
      session = {
        name: user.name,
        email: user.email,
      }
    } else {
      await updateUserTokenById(session.id, token)
    }

    const smtpConfig = organization.id ? await getOrganizationSmtpConfig(organization.id) : null
    const organizationName = smtpConfig?.organizationName ?? organization?.name ?? 'WebAbility'

    const template = await compileEmailTemplate({
      fileName: 'forgotPassword.mjml',
      data: {
        name: session.name,
        url: `${currentUrl}/auth/reset-password?&token=${token}`,
        organizationName,
      },
    })
    await sendMail(session.email, 'Reset Password from WebAbility', template, undefined, 'WebAbility Support', smtpConfig)

    return true
  } catch (error) {
    logger.error(error)
    throw new ApolloError(error)
  }
}
