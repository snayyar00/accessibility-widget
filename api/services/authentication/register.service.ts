import { ApolloError } from 'apollo-server-express';
import dayjs from 'dayjs';

import { findUser, createUser } from '~/repository/user.repository';
import { generatePassword } from '~/helpers/hashing.helper';
import { registerValidation } from '~/validations/authenticate.validation';
import { sanitizeUserInput } from '~/utils/sanitization.helper';
import { getValidationErrorCode, createValidationError, createMultipleValidationErrors } from '~/utils/validation-errors.helper';
import logger from '~/libs/logger/application-logger';
import { sign } from '~/helpers/jwt.helper';
import { findProductAndPriceByType } from '~/repository/products.repository';
import { createNewSubcription } from '~/services/stripe/subcription.service';
import formatDateDB from '~/utils/format-date-db';
import { Token } from './login.service';

async function registerUser(email: string, password: string, name: string, paymentMethodToken: string, planName: string, billingType: 'MONTHLY' | 'YEARLY'): Promise<ApolloError | Token> {
  const sanitizedInput = sanitizeUserInput({ email, name });
  email = sanitizedInput.email;
  name = sanitizedInput.name;

  const validateResult = registerValidation({ email, password, name });

  if (Array.isArray(validateResult) && validateResult.length) {
    const errorMessages = validateResult.map((it) => it.message);
    
    if (errorMessages.length > 1) {
      throw createMultipleValidationErrors(errorMessages);
    } else {
      const errorCode = getValidationErrorCode(errorMessages);
      throw createValidationError(errorCode, errorMessages[0]);
    }
  }

  try {
    const user = await findUser({ email });

    if (user) {
      return new ApolloError('Email address has been used');
    }

    if (user && !user.is_active) {
      return new ApolloError('Your account is not yet verify');
    }

    const passwordHashed = await generatePassword(password);
    const userData = {
      email,
      password: passwordHashed,
      name,
    };
    
    let newUserId = null;

    if (planName) {
      const product = await findProductAndPriceByType(planName, billingType);

      if (!product) {
        return new ApolloError('Can not find any plan');
      }

      const { subcription_id, customer_id } = await createNewSubcription(paymentMethodToken, email, name, product.price_stripe_id, true);

      if (subcription_id && customer_id) {
        const userPlanData = {
          product_id: product.id,
          price_id: product.price_id,
          customer_id,
          subcription_id,
          is_trial: true,
          expired_at: formatDateDB(dayjs().add(14, 'd')),
        };
        if (product.type === 'starter' || product.type === 'professional') {
          newUserId = await createUser(userData);
        }
      }
    } else {
      console.log('no plan');
      newUserId = await createUser(userData);
    }

    // const tokenVerifyEmail = await generateRandomKey();
    // const template = await compileEmailTemplate({
    //   fileName: 'verifyEmail.mjml',
    //   data: {
    //     name,
    //     url: `${process.env.FRONTEND_URL}/verify-email?token=${tokenVerifyEmail}`,
    //   },
    // });

    // if (typeof newUserId === 'number') {
    //   await Promise.all([sendMail(email, 'Confirm your email address', template), createToken(newUserId, tokenVerifyEmail, SEND_MAIL_TYPE.VERIFY_EMAIL)]);
    // }

    const token = sign({ email, name });

    return { token };
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

export { registerUser };
