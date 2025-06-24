import { ValidationError, ApolloError } from 'apollo-server-express';
import dayjs from 'dayjs';

import { findUser, createUser } from '~/repository/user.repository';
import { createToken } from '~/repository/user_tokens.repository';
import { generatePassword } from '~/helpers/hashing.helper';
import compileEmailTemplate from '~/helpers/compile-email-template';
import generateRandomKey from '~/helpers/genarateRandomkey';
import {sendMail} from '~/libs/mail';
import { registerValidation } from '~/validations/authenticate.validation';
import logger from '~/utils/logger';
import { sign } from '~/helpers/jwt.helper';
import { findProductAndPriceByType } from '~/repository/products.repository';
import { createNewSubcription } from '~/services/stripe/subcription.service';
import { SEND_MAIL_TYPE } from '~/constants/send-mail-type.constant';
import formatDateDB from '~/utils/format-date-db';
import { Token } from './login.service';
import { addOrganization, organizationExistsByName } from '~/services/organization/organization.service';
import { getOrganizationById, Organization } from '~/repository/organization.repository';

async function registerUser(email: string, password: string, name: string, paymentMethodToken: string, planName: string, billingType: 'MONTHLY' | 'YEARLY', organizationName: string): Promise<ApolloError | Token> {
  const validateResult = registerValidation({ email, password, name });

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','));
  }

  try {
    const user = await findUser({ email });

    if (user) {
      return new ApolloError('Email address has been used');
    }

    if (user && !user.is_active) {
      return new ApolloError('Your account is not yet verify');
    }

    if (organizationName) {
      const hasOranization = await organizationExistsByName(organizationName)

      if (hasOranization) {
        return new ApolloError('Organization with this name already exists');
      }
    }

    const passwordHashed = await generatePassword(password);
    const userData = {
      email,
      password: passwordHashed,
      name,
    };

    let newUserId = null;
    let newOrganization: Organization | null = null

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
          newUserId = await createUser(userData, userPlanData, product.type);
        }
      }
    } else {
      console.log('no plan');

      newUserId = await createUser(userData);
    }

    const tokenVerifyEmail = await generateRandomKey();
    const template = await compileEmailTemplate({
      fileName: 'verifyEmail.mjml',
      data: {
        name,
        url: `${process.env.FRONTEND_URL}/verify-email?token=${tokenVerifyEmail}`,
      },
    });

    if (typeof newUserId === 'number') {
      if (organizationName) {
        const id = await addOrganization({ name: organizationName }, { id: newUserId });

        if (id) {
          newOrganization = await getOrganizationById(id);
        }
      }
      
      await Promise.all([sendMail(email, 'Confirm your email address', template), createToken(newUserId, tokenVerifyEmail, SEND_MAIL_TYPE.VERIFY_EMAIL)]);
    }

    const token = sign({ email, name });

    return { token, subdomain: newOrganization?.subdomain || null };
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

export { registerUser };
