import { ValidationError } from 'apollo-server-express';
import { findUser } from '~/repository/user.repository';
import logger from '~/utils/logger';
import { emailValidation } from '~/validations/email.validation';

/**
 * Check if an email is already registered
 * 
 * @param {string} email - The email to check
 * @returns {Promise<boolean>} - True if email is already registered, false otherwise
 */
export async function isEmailAlreadyRegistered(email: string): Promise<boolean> {
  const validateResult = emailValidation(email);
  
  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','));
  }

  try {
    const user = await findUser({ email });
    // If user is found, the email is already registered
    return !!user;
  } catch (error) {
    logger.error(error);
    throw error;
  }
} 