import { ApolloError, ValidationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { updateUser } from '~/repository/user.repository';
import { generatePassword } from '~/helpers/hashing.helper';
import { findToken, removeUserToken } from '~/repository/user_tokens.repository';
import logger from '~/utils/logger';
import { changePasswordValidation } from '~/validations/authenticate.validation';
import { unlockAccount } from '~/repository/failed_login_attempts.repository';

export async function resetPasswordUser(token: string, password: string, confirmPassword: string): Promise<true | ApolloError> {
  try {
    const validateResult = changePasswordValidation({ password });
    if (Array.isArray(validateResult) && validateResult.length) {
      return new UserInputError(validateResult.map((it) => it.message).join(','), {
        invalidArgs: validateResult.map((it) => it.field).join(','),
      });
    }
    if (password !== confirmPassword) {
      return new ValidationError('Password and confirm password do not match');
    }
    const session = await findToken(token);
    if (!session || !session.id) {
      return new ApolloError('Your reset password link is expired');
    }


    const modifiedDateStr = session.updated_at.toString().replace(/(GMT|UTC|UMT)[+-]\d{4}.*$/, ''); // Remove the timezone part

    // Parse the components manually
    const dateParts = modifiedDateStr.split(' ');

    // Example: [Tue, Sep, 17, 2024, 22:20:19] => Extract date and time parts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.indexOf(dateParts[1]);
    const day = parseInt(dateParts[2]);
    const year = parseInt(dateParts[3]);
    const timeParts = dateParts[4].split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseInt(timeParts[2]);

    // Create a new Date object using UTC (to avoid timezone adjustments)
    const date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

    const now = new Date();

    // 15 minutes in milliseconds
    const fifteenMinutesInMs = 15 * 60 * 1000;

    // Calculate the difference in milliseconds
    const diffInMs = now.getTime() - date.getTime();

    if (diffInMs > fifteenMinutesInMs) {
      return new ForbiddenError('Your reset password link is expired');
    }

    const [newPassword] = await Promise.all([generatePassword(password), removeUserToken(session.id)]);
    await updateUser(session.user_id, { password: newPassword });

    await unlockAccount(session.user_id);
    
    return true;
  } catch (error) {
    console.error(error);
    throw new ApolloError('Something went wrong!');
  }
}
