import dayjs from 'dayjs'

import logger from '../../config/logger.config'
import { SEND_MAIL_TYPE } from '../../constants/send-mail-type.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import generateRandomKey from '../../helpers/genarateRandomkey'
import { normalizeEmail } from '../../helpers/string.helper'
import type { UserProfile } from '../../repository/user.repository'
import { activeUser, getUserbyId } from '../../repository/user.repository'
import { changeTokenStatus, createToken, findToken } from '../../repository/user_tokens.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'
import { sendMail } from '../email/email.service'

function isValidDate(createdAt: string): boolean {
  // console.log(createdAt);
  // console.log(new Date().toString());
  const modifiedDateStr = createdAt.toString().replace(/(GMT|UTC|UMT)[+-]\d{4}.*$/, '') // Remove the timezone part

  // Parse the components manually
  const dateParts = modifiedDateStr.split(' ')

  // Example: [Tue, Sep, 17, 2024, 22:20:19] => Extract date and time parts
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames.indexOf(dateParts[1])
  const day = parseInt(dateParts[2])
  const year = parseInt(dateParts[3])
  const timeParts = dateParts[4].split(':')
  const hours = parseInt(timeParts[0])
  const minutes = parseInt(timeParts[1])
  const seconds = parseInt(timeParts[2])

  // Create a new Date object using UTC (to avoid timezone adjustments)
  const date = new Date(Date.UTC(year, month, day, hours, minutes, seconds))

  const now = new Date()

  // 15 minutes in milliseconds
  const fifteenMinutesInMs = 15 * 60 * 1000

  // console.log(date.toISOString());
  // console.log(now.toISOString());
  // Calculate the difference in milliseconds
  const diffInMs = now.getTime() - date.getTime()

  // console.log(diffInMs);
  // console.log(fifteenMinutesInMs);

  if (diffInMs > fifteenMinutesInMs) {
    return false
  }
  return true
}

export async function verifyEmail(authToken: string): Promise<true | ApolloError> {
  try {
    const token = await findToken(authToken)

    if (!token || !token.is_active || token.type !== SEND_MAIL_TYPE.VERIFY_EMAIL) {
      return new ApolloError('Invalid token')
    }

    if (!isValidDate(token.created_at.toString())) {
      return new ApolloError('Token has expired')
    }

    await Promise.all([changeTokenStatus(token.id, token.type, false), activeUser(token.user_id)])

    const user = await getUserbyId(token.user_id)

    const template = await compileEmailTemplate({
      fileName: 'WelcomeEmail.mjml',
      data: {
        name: user?.name,
        date: dayjs().format('dddd, MMMM D, YYYY h:mm A'),
      },
    })

    await sendMail(user?.email, "Welcome to WebAbility ! Let's Make the Web Accessible Together", template)

    return true
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export async function resendEmailAction(user: UserProfile, type: 'verify_email' | 'forgot_password'): Promise<boolean> {
  try {
    let template
    let subject

    const token = await generateRandomKey()

    switch (type) {
      case SEND_MAIL_TYPE.VERIFY_EMAIL:
        if (user.is_active) {
          throw new ApolloError('Account verified')
        }
        subject = 'Resend confirm your email address'
        template = await compileEmailTemplate({
          fileName: 'verifyEmail.mjml',
          data: {
            name: user.name,
            url: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
          },
        })
        break

      case SEND_MAIL_TYPE.FORGOT_PASSWORD:
        subject = 'Resend reset password'
        template = await compileEmailTemplate({
          fileName: 'forgotPassword.mjml',
          data: {
            name: user.name,
            url: `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`,
          },
        })
        break

      default:
        subject = 'Resend confirm your email address'
        template = await compileEmailTemplate({
          fileName: 'verifyEmail.mjml',
          data: {
            name: user.name,
            url: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
          },
        })
        break
    }

    await changeTokenStatus(null, type, false)
    await Promise.all([createToken(user.id, token, type), sendMail(normalizeEmail(user.email), subject, template)])

    return true
  } catch (error) {
    logger.error(error)
    throw error
  }
}
