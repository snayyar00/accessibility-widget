import dayjs from 'dayjs'

import compileEmailTemplate from '../../helpers/compile-email-template'
import { comparePassword, generatePassword } from '../../helpers/hashing.helper'
import { findUser, updateUser } from '../../repository/user.repository'
import { ApolloError, UserInputError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { changePasswordValidation } from '../../validations/authenticate.validation'
import { sendMail } from '../email/email.service'

export async function changePasswordUser(userId: number, currentPassword: string, newPassword: string): Promise<true | ApolloError> {
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
    await updateUser(user.id, { password: passwordHashed })

    const template = await compileEmailTemplate({
      fileName: 'changePassword.mjml',
      data: {
        name: user.name,
        date: dayjs().format('dddd, MMMM D, YYYY h:mm A'),
      },
    })

    await sendMail(user.email, 'Change Password from WebAbility', template)
    return true
  } catch (error) {
    logger.error(error)
    throw new ApolloError(error)
  }
}
