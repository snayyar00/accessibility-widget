import { ApolloError, ValidationError } from 'apollo-server-express';
import { findUser, getUserByIdAndJoinUserToken } from '~/repository/user.repository';
import generateRandomKey from '~/helpers/genarateRandomkey';
import { createToken, updateUserTokenById } from '~/repository/user_tokens.repository';
import logger from '~/utils/logger';
import {sendMail} from '~/libs/mail';
import compileEmailTemplate from '~/helpers/compile-email-template';
import { SEND_MAIL_TYPE } from '~/constants/send-mail-type.constant';
import { emailValidation } from '~/validations/email.validation';

export async function forgotPasswordUser(email: string): Promise<boolean> {
  const validateResult = emailValidation(email);
  
  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','));
  }

  try {
    const user = await findUser({ email });

    if (!user || !user.id) {
      return true;
    }

    let session = await getUserByIdAndJoinUserToken(user.id, SEND_MAIL_TYPE.FORGOT_PASSWORD);
    const tokenGenerated = await generateRandomKey();
    const token = `${tokenGenerated}-${user.id}`;

    if (!session) {
      await createToken(user.id, token, SEND_MAIL_TYPE.FORGOT_PASSWORD);
      session = {
        name: user.name,
        email: user.email,
      };
    } else {
      await updateUserTokenById(session.id, token);
    }

    const template = await compileEmailTemplate({
      fileName: 'forgotPassword.mjml',
      data: {
        name: session.name,
        url: `${process.env.FRONTEND_URL}/auth/reset-password?&token=${token}`,
      },
    });

    await sendMail(session.email, 'Reset Password from WebAbility', template);
    
    return true;
  } catch (error) {
    logger.error(error);
    throw new ApolloError(error);
  }
}
