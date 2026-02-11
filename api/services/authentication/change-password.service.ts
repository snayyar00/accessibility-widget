import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import compileEmailTemplate from '../../helpers/compile-email-template'
import { comparePassword, generatePassword } from '../../helpers/hashing.helper'
import { sign } from '../../helpers/jwt.helper'
import { findUser, updateUser } from '../../repository/user.repository'
import { ApolloError, UserInputError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { changePasswordValidation } from '../../validations/authenticate.validation'
import { getOrganizationSmtpConfig } from '../../utils/organizationSmtp.utils'
import { sendMail } from '../email/email.service'

dayjs.extend(utc)

export type ChangePasswordResponse = {
  token: string
}

export async function changePasswordUser(userId: number, currentPassword: string, newPassword: string): Promise<ChangePasswordResponse | ApolloError> {
  try {
    const user = await findUser({ id: userId })

    if (!user || !user.id) {
      return new ApolloError('Can not find any user')
    }

    const validateResult = changePasswordValidation({ password: newPassword })

    if (Array.isArray(validateResult) && validateResult.length) {
      return new UserInputError(validateResult.map((it) => it.message).join(','), {
        invalidArgs: validateResult.map((it) => it.field).join(','),
      })
    }

    const matchPassword = await comparePassword(currentPassword, user.password)

    if (!matchPassword) {
      return new ApolloError('Current password is not correct')
    }

    const passwordHashed = await generatePassword(newPassword)
    await updateUser(user.id, { password: passwordHashed, password_changed_at: dayjs().utc().format('YYYY-MM-DD HH:mm:ss') })

    const newToken = sign({ email: user.email, name: user.name })

    const smtpConfig =
      user.current_organization_id != null
        ? await getOrganizationSmtpConfig(user.current_organization_id)
        : null
    const organizationName = smtpConfig?.organizationName ?? 'WebAbility'

    const template = await compileEmailTemplate({
      fileName: 'changePassword.mjml',
      data: {
        name: user.name,
        date: dayjs().format('dddd, MMMM D, YYYY h:mm A'),
        organizationName,
      },
    })
    await sendMail(user.email, 'Change Password from WebAbility', template, undefined, 'WebAbility Support', smtpConfig)
    return { token: newToken }
  } catch (error) {
    logger.error(error)
    throw new ApolloError(error)
  }
}
