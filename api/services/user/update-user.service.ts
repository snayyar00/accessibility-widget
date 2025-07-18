import { ApolloError } from 'apollo-server-express';
import { findUser, updateUser } from '~/repository/user.repository';
import { profileUpdateValidation } from '~/validations/authenticate.validation';
import { sanitizeUserInput } from '~/utils/sanitization.helper';
import { getValidationErrorCode, createValidationError, createMultipleValidationErrors } from '~/utils/validation-errors.helper';
import logger from '~/libs/logger/application-logger';

export async function updateProfile(id: number, name: string, company: string, position: string): Promise<true | ApolloError> {
  try {
    const sanitizedInput = sanitizeUserInput({ name, company, position });

    name = sanitizedInput.name;
    company = sanitizedInput.company;
    position = sanitizedInput.position;

    const validateResult = profileUpdateValidation({ name, company, position });

    if (Array.isArray(validateResult) && validateResult.length) {
      const errorMessages = validateResult.map((it) => it.message);

      if (errorMessages.length > 1) {
        throw createMultipleValidationErrors(errorMessages);
      } else {
        const errorCode = getValidationErrorCode(errorMessages);
        throw createValidationError(errorCode, errorMessages[0]);
      }
    }

    const user = await findUser({ id });

    if (!user) {
      return new ApolloError('Can not find any user');
    }

    await updateUser(id, { name, position, company });
    return true;
  } catch (error) {
    logger.error(error);
    throw new ApolloError('Something went wrong!');
  }
}
